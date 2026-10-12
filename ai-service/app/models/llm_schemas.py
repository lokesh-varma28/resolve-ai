from pydantic import BaseModel, Field

from app.models.schemas import ActionType, IntentType, PriorityLevel


class LLMDecision(BaseModel):
    """
    Structured output decision returned by the LLM.
    Strictly forbids storing or returning internal chain-of-thought.
    """
    intent: IntentType | str = Field(
        description="Identified customer inquiry intent category."
    )
    priority: PriorityLevel = Field(
        default="medium",
        description="Assigned priority level: low, medium, high, or critical."
    )
    action: ActionType = Field(
        default="none",
        description="Proposed business action: 'none', 'escalate', or 'refund_review'."
    )
    decision_reason: str = Field(
        default="",
        description="Concise, user-safe rationale for this decision. NO internal chain-of-thought."
    )
    final_message: str = Field(
        description="Helpful, professional customer-facing response text."
    )
    order_id: str | None = Field(
        default=None,
        description="Relevant verified order ID if applicable (e.g., ORD-1001)."
    )
    payment_id: str | None = Field(
        default=None,
        description="Relevant verified payment ID if applicable (e.g., PAY-1001)."
    )

