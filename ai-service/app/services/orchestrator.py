import logging
from typing import Any
from uuid import uuid4

from app.config import get_settings
from app.models.schemas import ActionType, IntentResult, SupportResponse, ToolResult
from app.services.escalation import create_escalation
from app.services.intent_classifier import classify_intent
from app.services.llm_service import LLMService, LLMServiceError
from app.services.safety import validate_action
from app.tools.order_tools import get_order
from app.tools.payment_tools import get_payment_status
from app.tools.policy_tools import get_policy

logger = logging.getLogger(__name__)


def as_tool_result(
    tool: str,
    result: dict[str, Any],
) -> ToolResult:
    return ToolResult(
        tool=tool,
        success=result.get("success", False),
        data=result.get("data", {}),
        error=result.get("error"),
    )


def _deterministic_investigate(
    customer_id: str,
    message: str,
    session_id: str,
    execution_mode: str = "deterministic",
) -> SupportResponse:
    """
    Deterministic Phase 1 investigation pipeline.
    Preserved exactly for fast, reliable, rule-based execution and robust fallback.
    """
    intent: IntentResult = classify_intent(message)
    results: list[ToolResult] = []

    order: dict[str, Any] | None = None
    payment: dict[str, Any] | None = None
    policy: dict[str, Any] | None = None

    # Step 1: Controlled order inspection
    if intent.order_id:
        result = get_order(intent.order_id, customer_id)
        tool_result = as_tool_result("get_order", result)
        results.append(tool_result)

        if tool_result.success:
            order = tool_result.data

    # Step 2: Controlled payment inspection
    payment_id = intent.payment_id
    if not payment_id and order:
        payment_id = order.get("payment_id")

    if payment_id:
        result = get_payment_status(payment_id, customer_id)
        tool_result = as_tool_result("get_payment_status", result)
        results.append(tool_result)

        if tool_result.success:
            payment = tool_result.data

    # Step 3: Controlled policy retrieval
    if intent.intent in {"refund_request", "payment_failed_order_missing"}:
        result = get_policy("refund")
        tool_result = as_tool_result("get_refund_policy", result)
        results.append(tool_result)
        if tool_result.success:
            policy = tool_result.data
    elif intent.intent == "delivery_issue":
        result = get_policy("delivery")
        tool_result = as_tool_result("get_delivery_policy", result)
        results.append(tool_result)
        if tool_result.success:
            policy = tool_result.data
    elif intent.intent == "account_issue":
        result = get_policy("account")
        tool_result = as_tool_result("get_account_policy", result)
        results.append(tool_result)
        if tool_result.success:
            policy = tool_result.data

    # Step 4: Proposed action and response formulation
    action: ActionType = "none"
    final_message = ""
    escalation_reason = ""
    escalation = None

    if intent.intent == "unknown":
        action = "escalate"
        escalation_reason = "Customer intent could not be identified with sufficient confidence."
        final_message = (
            "I could not confidently identify your issue. "
            "I have transferred your case to a support agent who will review it shortly."
        )

    elif intent.intent == "order_status":
        if not order:
            action = "escalate"
            escalation_reason = "Order status requested but order could not be verified for customer."
            final_message = (
                "I could not verify the order details linked to your request. "
                "A support agent will investigate this."
            )
        else:
            action = "none"
            expected_info = (
                f" Expected delivery is {order['expected_delivery']}."
                if "expected_delivery" in order
                else ""
            )
            final_message = (
                f"Your order {order['order_id']} is currently "
                f"'{order['status']}'.{expected_info}"
            )

    elif intent.intent == "delivery_issue":
        if not order:
            action = "escalate"
            escalation_reason = "Delivery complaint received but order could not be verified."
            final_message = (
                "I could not verify the order linked to your delivery inquiry. "
                "I have escalated this case to our fulfillment support team."
            )
        else:
            action = "escalate"
            escalation_reason = (
                f"Delivery investigation requested for order {order['order_id']} "
                f"(status: {order['status']})."
            )
            final_message = (
                f"Your order {order['order_id']} is currently marked '{order['status']}'. "
                "I have verified our delivery policy and opened an investigation ticket with "
                "our fulfillment team to expedite and resolve your shipment."
            )

    elif intent.intent == "refund_request":
        action = "refund_review"
        escalation_reason = "Refund review requested by customer; requires human approval."
        final_message = (
            "I have reviewed the available order, payment, and refund policy information. "
            "I can create a refund-review request, but a human agent must approve the actual refund."
        )

    elif intent.intent == "payment_failed_order_missing":
        action = "escalate"
        if payment:
            escalation_reason = (
                f"Payment {payment.get('payment_id')} (Status: {payment.get('status')}) "
                "recorded, but order creation failed or is missing."
            )
            final_message = (
                f"I verified payment {payment.get('payment_id')} with status '{payment.get('status')}'. "
                "Because your order was not successfully created, I have escalated this directly to our "
                "billing team for verification and refund/order reconciliation."
            )
        else:
            escalation_reason = "Customer reported payment deduction with missing order, but payment record was not found."
            final_message = (
                "I was unable to locate a verified payment record for your transaction. "
                "I have created an escalation ticket so a billing specialist can manually investigate."
            )

    elif intent.intent == "account_issue":
        text_lower = message.lower()
        is_locked_or_security = any(
            kw in text_lower for kw in ["locked", "compromised", "hacked", "stolen", "unauthorized"]
        )
        if is_locked_or_security:
            action = "escalate"
            escalation_reason = "Account locked or potential security incident requiring human identity verification."
            final_message = (
                "For your security, credentials cannot be modified directly via chat. "
                "Because this involves account security recovery, I have opened a high-priority "
                "support ticket for our security team to verify your identity."
            )
        else:
            action = "none"
            final_message = (
                "For your account security, passwords cannot be sent or reset through chat. "
                "Please use our secure self-service password reset portal. "
                "If you need further help or are locked out, let us know and an agent will assist you."
            )

    # Step 5: Server-side Safety Validation Gate
    validation = validate_action(
        action=action,
        customer_id=customer_id,
        order=order,
        payment=payment,
    )

    if not validation["allowed"]:
        action = "escalate"
        rejection_reason = validation.get("reason", "Safety validation rejected action.")
        escalation_reason = f"Action blocked by safety policy: {rejection_reason}"
        final_message = (
            f"The requested action could not be safely validated: {rejection_reason} "
            "I have escalated this case to a human support agent for manual review."
        )

    # Step 6: Execute validated action
    if action in {"refund_review", "escalate"}:
        escalation = create_escalation(
            customer_id=customer_id,
            message=message,
            intent=intent.intent,
            priority=intent.priority,
            reason=escalation_reason or "Customer support escalation.",
            order=order,
            payment=payment,
            tool_results=[result.model_dump() for result in results],
        )

        final_message += f" Your ticket ID is {escalation['ticket_id']}."

    return SupportResponse(
        conversation_id=session_id,
        intent=intent,
        tool_results=results,
        final_message=final_message,
        action=action,
        escalation=escalation,
        execution_mode=execution_mode,
    )


def investigate(
    customer_id: str,
    message: str,
    conversation_id: str | None = None,
    llm_service: LLMService | None = None,
) -> SupportResponse:
    """
    Main orchestration entry point.
    Coordinates between the LLM-driven bounded tool execution loop and the deterministic pipeline.
    Enforces backend safety gates and automatic fallback.
    """
    session_id = conversation_id or f"CONV-{uuid4().hex[:8].upper()}"
    settings = get_settings()

    # Fast path: deterministic mode requested explicitly
    if settings.execution_mode == "deterministic_only":
        return _deterministic_investigate(
            customer_id=customer_id,
            message=message,
            session_id=session_id,
            execution_mode="deterministic",
        )

    service = llm_service or LLMService(settings=settings)

    # If LLM service is not ready, handle according to configured execution mode
    if not service.is_available():
        if settings.execution_mode == "llm_only":
            raise RuntimeError("Execution mode is 'llm_only', but LLM service is not configured or ready.")
        return _deterministic_investigate(
            customer_id=customer_id,
            message=message,
            session_id=session_id,
            execution_mode="deterministic",
        )

    # Attempt LLM-driven investigation
    try:
        decision, recorded_tools, order, payment = service.run_investigation(
            customer_id=customer_id,
            message=message,
        )

        # Server-side Safety Validation Gate
        validation = validate_action(
            action=decision.action,
            customer_id=customer_id,
            order=order,
            payment=payment,
        )

        if not validation["allowed"]:
            logger.warning(
                "LLM proposed action '%s' rejected by safety layer: %s. Falling back to deterministic pipeline.",
                decision.action,
                validation.get("reason"),
            )
            return _deterministic_investigate(
                customer_id=customer_id,
                message=message,
                session_id=session_id,
                execution_mode="fallback",
            )

        # Proposed action passed safety validation
        action = decision.action
        final_msg = decision.final_message
        escalation = None

        if action in {"refund_review", "escalate"}:
            escalation = create_escalation(
                customer_id=customer_id,
                message=message,
                intent=str(decision.intent),
                priority=str(decision.priority),
                reason=decision.decision_reason or "Customer support escalation.",
                order=order,
                payment=payment,
                tool_results=[t.model_dump() for t in recorded_tools],
            )
            if escalation["ticket_id"] not in final_msg:
                final_msg += f" Your ticket ID is {escalation['ticket_id']}."

        return SupportResponse(
            conversation_id=session_id,
            intent=IntentResult(
                intent=decision.intent,
                priority=decision.priority,
                confidence=0.95,
                order_id=decision.order_id,
                payment_id=decision.payment_id,
            ),
            tool_results=recorded_tools,
            final_message=final_msg,
            action=action,
            escalation=escalation,
            execution_mode="llm",
        )

    except (LLMServiceError, Exception) as err:
        logger.warning(
            "LLM investigation error encountered (%s: %s). Falling back to deterministic pipeline.",
            type(err).__name__,
            str(err),
        )
        if settings.execution_mode == "llm_only":
            raise RuntimeError(f"LLM investigation failed in llm_only mode: {err}") from err
        return _deterministic_investigate(
            customer_id=customer_id,
            message=message,
            session_id=session_id,
            execution_mode="fallback",
        )