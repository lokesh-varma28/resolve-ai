from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

ESCALATIONS: list[dict[str, Any]] = []


def create_escalation(
    customer_id: str,
    message: str,
    intent: str,
    priority: str,
    reason: str,
    order: dict[str, Any] | None = None,
    payment: dict[str, Any] | None = None,
    tool_results: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    case: dict[str, Any] = {
        "ticket_id": f"TKT-{uuid4().hex[:8].upper()}",
        "customer_id": customer_id,
        "original_message": message,
        "intent": intent,
        "priority": priority,
        "reason": reason,
        "order": order,
        "payment": payment,
        "tool_results": tool_results or [],
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    ESCALATIONS.append(case)
    return case


def get_escalations() -> list[dict[str, Any]]:
    return ESCALATIONS


def get_escalation_by_id(ticket_id: str) -> dict[str, Any] | None:
    for ticket in ESCALATIONS:
        if ticket.get("ticket_id") == ticket_id:
            return ticket
    return None


def clear_escalations() -> None:
    ESCALATIONS.clear()