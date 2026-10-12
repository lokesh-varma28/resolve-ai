import re

from app.models.schemas import IntentResult


def extract_order_id(message: str) -> str | None:
    match = re.search(r"\b(ord)-?(\d+)\b", message, re.IGNORECASE)
    if match:
        return f"{match.group(1).upper()}-{match.group(2)}"
    match_hash = re.search(r"\border\s*#?(\d{4})\b", message, re.IGNORECASE)
    if match_hash:
        return f"ORD-{match_hash.group(1)}"
    return None


def extract_payment_id(message: str) -> str | None:
    match = re.search(r"\b(pay)-?(\d+)\b", message, re.IGNORECASE)
    if match:
        return f"{match.group(1).upper()}-{match.group(2)}"
    match_pay = re.search(r"\bpayment\s*#?(\d{4})\b", message, re.IGNORECASE)
    if match_pay:
        return f"PAY-{match_pay.group(1)}"
    return None


def classify_intent(message: str) -> IntentResult:
    text = message.lower()

    order_id = extract_order_id(message)
    payment_id = extract_payment_id(message)

    # 1. Payment problems / Order missing after deduction
    has_payment_mention = any(
        kw in text for kw in ["payment", "paid", "deducted", "charged", "debited", "money deducted"]
    )
    has_order_failure = any(
        kw in text for kw in [
            "failed", "failure", "not created", "missing", "no order",
            "not placed", "didn't receive order confirmation", "order not received"
        ]
    )
    if has_payment_mention and has_order_failure:
        return IntentResult(
            intent="payment_failed_order_missing",
            priority="high",
            confidence=0.92,
            order_id=order_id,
            payment_id=payment_id,
        )

    # 2. Refund requests
    if any(kw in text for kw in ["refund", "money back", "return money", "cancel and refund", "reimburse"]):
        return IntentResult(
            intent="refund_request",
            priority="high",
            confidence=0.90,
            order_id=order_id,
            payment_id=payment_id,
        )

    # 3. Delivery problems (delays, lost shipments, delivery complaints)
    delivery_complaint_cues = [
        "late", "delayed", "delay", "not arrived", "delivery issue", "where is my package",
        "where is package", "package missing", "hasn't arrived", "lost package", "package delayed",
        "shipment", "delivery", "not received package"
    ]
    if any(kw in text for kw in delivery_complaint_cues):
        return IntentResult(
            intent="delivery_issue",
            priority="medium",
            confidence=0.88,
            order_id=order_id,
            payment_id=payment_id,
        )

    # 4. Order status & tracking (routine inquiries)
    status_cues = [
        "order status", "status of my order", "track", "tracking",
        "where is my order", "check my order", "check status"
    ]
    if any(kw in text for kw in status_cues):
        return IntentResult(
            intent="order_status",
            priority="low",
            confidence=0.86,
            order_id=order_id,
            payment_id=payment_id,
        )

    # 5. Account and authentication issues
    account_cues = [
        "login", "sign in", "signin", "password", "account",
        "logged out", "reset password", "locked out", "cant access"
    ]
    if any(kw in text for kw in account_cues):
        return IntentResult(
            intent="account_issue",
            priority="medium",
            confidence=0.80,
            order_id=order_id,
            payment_id=payment_id,
        )

    return IntentResult(
        intent="unknown",
        priority="medium",
        confidence=0.40,
        order_id=order_id,
        payment_id=payment_id,
    )