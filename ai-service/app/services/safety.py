from typing import Any


def validate_action(
    action: str,
    customer_id: str,
    order: dict[str, Any] | None,
    payment: dict[str, Any] | None,
) -> dict[str, Any]:
    """
    Business-critical safety layer.
    Validates that proposed actions adhere to security policies and authorization checks.
    Autonomous modification of financial or sensitive state is prohibited without human review.
    """
    if action == "none":
        return {
            "allowed": True,
            "action": "none",
            "reason": "No business action is required.",
        }

    if action in {"refund", "direct_refund", "execute_refund"}:
        return {
            "allowed": False,
            "action": action,
            "reason": "Autonomous direct refunds are strictly prohibited. All refunds require human approval.",
        }

    if action == "refund_review":
        if not order:
            return {
                "allowed": False,
                "action": action,
                "reason": "A verified order is required.",
            }

        if not payment:
            return {
                "allowed": False,
                "action": action,
                "reason": "A verified payment record is required.",
            }

        if order.get("customer_id") != customer_id:
            return {
                "allowed": False,
                "action": action,
                "reason": "Customer does not own this order.",
            }

        if payment.get("order_id") != order.get("order_id"):
            return {
                "allowed": False,
                "action": action,
                "reason": "Payment and order do not match.",
            }

        if payment.get("status") != "success":
            return {
                "allowed": False,
                "action": action,
                "reason": "Payment is not marked successful.",
            }

        return {
            "allowed": True,
            "action": "refund_review",
            "requires_human_approval": True,
            "reason": "Refund review can be created for human approval.",
        }

    if action == "escalate":
        return {
            "allowed": True,
            "action": "escalate",
            "reason": "Human escalation is permitted.",
        }

    return {
        "allowed": False,
        "action": action,
        "reason": f"Unknown action '{action}' rejected by the safety layer.",
    }