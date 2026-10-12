from fastapi import FastAPI, HTTPException

from app.models.schemas import SupportRequest, SupportResponse
from app.services.escalation import get_escalation_by_id, get_escalations
from app.services.orchestrator import investigate

from app.config import get_settings

app = FastAPI(
    title="ResolveAI AI Orchestrator",
    version="2.0.0",
    description="Autonomous AI Customer Support Orchestrator with Controlled Tools & Safety Layer",
)


@app.get("/")
def root():
    settings = get_settings()
    return {
        "service": "ResolveAI AI Orchestrator",
        "status": "running",
        "version": "2.0.0",
        "llm_provider": settings.llm_provider,
        "llm_model": settings.llm_model,
        "execution_mode": settings.execution_mode,
        "llm_ready": settings.is_llm_ready,
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }


@app.post("/support/investigate", response_model=SupportResponse)
def investigate_support(request: SupportRequest):
    try:
        return investigate(
            customer_id=request.customer_id,
            message=request.message,
            conversation_id=request.conversation_id,
        )
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="Internal support investigation error.",
        ) from error


@app.get("/support/escalations")
def list_escalations():
    tickets = get_escalations()
    return {
        "count": len(tickets),
        "tickets": tickets,
    }


@app.get("/support/escalations/{ticket_id}")
def get_escalation_detail(ticket_id: str):
    ticket = get_escalation_by_id(ticket_id)
    if not ticket:
        raise HTTPException(
            status_code=404,
            detail=f"Escalation ticket '{ticket_id}' not found.",
        )
    return ticket