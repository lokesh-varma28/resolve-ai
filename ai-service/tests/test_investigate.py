import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.escalation import clear_escalations, get_escalations
from app.services.safety import validate_action


@pytest.fixture(autouse=True)
def clean_state():
    clear_escalations()
    yield
    clear_escalations()


client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_delivery_issue_creates_real_escalation_ticket():
    """
    Addresses known bug: delivery issue previously returned action='none'
    despite promising human investigation. It should now create a real escalation ticket.
    """
    payload = {
        "customer_id": "CUS-001",
        "message": "My order ORD-1002 is delayed. Where is my package?",
    }
    response = client.post("/support/investigate", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["intent"]["intent"] == "delivery_issue"
    assert data["intent"]["order_id"] == "ORD-1002"
    assert data["action"] == "escalate"
    assert data["escalation"] is not None
    assert data["escalation"]["ticket_id"].startswith("TKT-")
    assert data["escalation"]["status"] == "open"
    assert data["escalation"]["order"]["order_id"] == "ORD-1002"
    assert data["escalation"]["ticket_id"] in data["final_message"]

    # Verify ticket is persisted in escalations store
    tickets = get_escalations()
    assert len(tickets) == 1
    assert tickets[0]["ticket_id"] == data["escalation"]["ticket_id"]


def test_order_status_benign_inquiry():
    payload = {
        "customer_id": "CUS-001",
        "message": "Can you check order status of ORD-1001?",
    }
    response = client.post("/support/investigate", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["intent"]["intent"] == "order_status"
    assert data["intent"]["order_id"] == "ORD-1001"
    assert data["action"] == "none"
    assert data["escalation"] is None
    assert "delivered" in data["final_message"]
    assert len(get_escalations()) == 0


def test_refund_request_human_approval_workflow():
    payload = {
        "customer_id": "CUS-001",
        "message": "I want a refund for my cancelled order ORD-1004",
    }
    response = client.post("/support/investigate", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["intent"]["intent"] == "refund_request"
    assert data["intent"]["order_id"] == "ORD-1004"
    assert data["action"] == "refund_review"
    assert data["escalation"] is not None
    assert data["escalation"]["ticket_id"].startswith("TKT-")
    assert "human" in data["escalation"]["reason"].lower()


def test_security_cross_customer_access_blocked():
    """
    Customer CUS-002 attempts to query or refund order ORD-1004 belonging to CUS-001.
    System must block access, not leak order details, and escalate safely.
    """
    payload = {
        "customer_id": "CUS-002",
        "message": "Please refund order ORD-1004 immediately",
    }
    response = client.post("/support/investigate", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Tool execution must have failed customer ownership check
    order_tool = next((t for t in data["tool_results"] if t["tool"] == "get_order"), None)
    assert order_tool is not None
    assert order_tool["success"] is False
    assert "does not belong" in order_tool["error"]

    # Action must be escalated with safety violation reason, never refund_review
    assert data["action"] == "escalate"
    assert data["escalation"] is not None
    assert data["escalation"]["order"] is None


def test_account_issue_self_service_guidance():
    """
    Ensures account_issue does not fail silently with an empty message.
    """
    payload = {
        "customer_id": "CUS-001",
        "message": "I forgot my password and cannot sign in to my account",
    }
    response = client.post("/support/investigate", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["intent"]["intent"] == "account_issue"
    assert data["action"] == "none"
    assert data["escalation"] is None
    assert len(data["final_message"]) > 10
    assert "password" in data["final_message"].lower()


def test_account_issue_locked_escalation():
    """
    Account locked / security issue must create an escalation ticket.
    """
    payload = {
        "customer_id": "CUS-001",
        "message": "My account is locked out and compromised, please help",
    }
    response = client.post("/support/investigate", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["intent"]["intent"] == "account_issue"
    assert data["action"] == "escalate"
    assert data["escalation"] is not None
    assert "security" in data["escalation"]["reason"].lower()


def test_payment_failed_order_missing():
    """
    Payment deducted but order was missing.
    """
    payload = {
        "customer_id": "CUS-001",
        "message": "My payment was deducted PAY-1005 but no order was created",
    }
    response = client.post("/support/investigate", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["intent"]["intent"] == "payment_failed_order_missing"
    assert data["intent"]["payment_id"] == "PAY-1005"
    assert data["action"] == "escalate"
    assert data["escalation"] is not None
    assert data["escalation"]["payment"]["payment_id"] == "PAY-1005"


def test_unknown_intent_fallback():
    payload = {
        "customer_id": "CUS-001",
        "message": "xyzzy foobar blip random text",
    }
    response = client.post("/support/investigate", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["intent"]["intent"] == "unknown"
    assert data["action"] == "escalate"
    assert data["escalation"] is not None


def test_conversation_id_handling():
    # Explicit conversation_id is preserved
    custom_conv_id = "CONV-SESSION-42"
    payload = {
        "customer_id": "CUS-001",
        "message": "Where is my order ORD-1001?",
        "conversation_id": custom_conv_id,
    }
    res = client.post("/support/investigate", json=payload)
    assert res.status_code == 200
    assert res.json()["conversation_id"] == custom_conv_id

    # Omitted conversation_id generates unique session ID
    res_default = client.post(
        "/support/investigate",
        json={"customer_id": "CUS-001", "message": "Where is my order ORD-1001?"},
    )
    assert res_default.status_code == 200
    generated_id = res_default.json()["conversation_id"]
    assert generated_id.startswith("CONV-")
    assert generated_id != f"CONV-CUS-001"


def test_escalation_rest_endpoints():
    # Trigger an escalation
    client.post(
        "/support/investigate",
        json={
            "customer_id": "CUS-001",
            "message": "My order ORD-1002 is delayed. Where is my package?",
        },
    )

    # Test list escalations
    list_res = client.get("/support/escalations")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["count"] >= 1
    ticket_id = list_data["tickets"][0]["ticket_id"]

    # Test get escalation detail
    detail_res = client.get(f"/support/escalations/{ticket_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["ticket_id"] == ticket_id

    # Test not found
    nf_res = client.get("/support/escalations/TKT-NONEXISTENT")
    assert nf_res.status_code == 404


def test_safety_layer_unit():
    # Autonomous direct refund must be blocked
    direct_refund = validate_action(
        action="refund",
        customer_id="CUS-001",
        order=None,
        payment=None,
    )
    assert direct_refund["allowed"] is False
    assert "strictly prohibited" in direct_refund["reason"]

    # Refund review requires matching customer
    mismatched = validate_action(
        action="refund_review",
        customer_id="CUS-002",
        order={"customer_id": "CUS-001", "order_id": "ORD-1"},
        payment={"order_id": "ORD-1", "status": "success"},
    )
    assert mismatched["allowed"] is False
    assert "does not own" in mismatched["reason"]

    # Refund review requires successful payment
    unpaid = validate_action(
        action="refund_review",
        customer_id="CUS-001",
        order={"customer_id": "CUS-001", "order_id": "ORD-1"},
        payment={"order_id": "ORD-1", "status": "failed"},
    )
    assert unpaid["allowed"] is False
    assert "successful" in unpaid["reason"]

    # Valid refund review allowed with human approval flag
    valid = validate_action(
        action="refund_review",
        customer_id="CUS-001",
        order={"customer_id": "CUS-001", "order_id": "ORD-1"},
        payment={"order_id": "ORD-1", "status": "success"},
    )
    assert valid["allowed"] is True
    assert valid["requires_human_approval"] is True

