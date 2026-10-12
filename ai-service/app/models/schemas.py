from typing import Any, Literal

from pydantic import BaseModel, Field

PriorityLevel = Literal["low", "medium", "high", "critical"]
ActionType = Literal["none", "escalate", "refund_review"]
IntentType = Literal[
    "payment_failed_order_missing",
    "refund_request",
    "delivery_issue",
    "order_status",
    "account_issue",
    "unknown",
]


class SupportRequest(BaseModel):
    customer_id: str = Field(min_length=1, description="Authenticated customer identifier or simulated session")
    message: str = Field(min_length=1, max_length=2000, description="Customer incoming inquiry")
    conversation_id: str | None = Field(default=None, description="Optional ongoing conversation/session identifier")


class IntentResult(BaseModel):
    intent: IntentType | str
    priority: PriorityLevel
    confidence: float = Field(ge=0.0, le=1.0)
    order_id: str | None = None
    payment_id: str | None = None


class ToolResult(BaseModel):
    tool: str
    success: bool
    data: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None


class EscalationTicket(BaseModel):
    ticket_id: str
    customer_id: str
    original_message: str
    intent: str
    priority: str
    reason: str
    order: dict[str, Any] | None = None
    payment: dict[str, Any] | None = None
    tool_results: list[dict[str, Any]] = Field(default_factory=list)
    status: str = "open"
    created_at: str


class SupportResponse(BaseModel):
    conversation_id: str
    intent: IntentResult
    tool_results: list[ToolResult]
    final_message: str
    action: ActionType
    escalation: EscalationTicket | None = None
    execution_mode: str | None = Field(default=None, description="Pipeline execution mode: deterministic, llm, or fallback")