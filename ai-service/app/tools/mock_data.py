ORDERS = {
    "ORD-1001": {
        "order_id": "ORD-1001",
        "customer_id": "CUS-001",
        "status": "delivered",
        "amount": 899.0,
        "payment_id": "PAY-1001",
        "delivery_date": "2026-09-10",
    },
    "ORD-1002": {
        "order_id": "ORD-1002",
        "customer_id": "CUS-001",
        "status": "shipped",
        "amount": 1499.0,
        "payment_id": "PAY-1002",
        "expected_delivery": "2026-09-15",
    },
    "ORD-1003": {
        "order_id": "ORD-1003",
        "customer_id": "CUS-002",
        "status": "payment_failed",
        "amount": 599.0,
        "payment_id": "PAY-1003",
    },
    "ORD-1004": {
        "order_id": "ORD-1004",
        "customer_id": "CUS-001",
        "status": "cancelled",
        "amount": 1200.0,
        "payment_id": "PAY-1004",
    },
}

PAYMENTS = {
    "PAY-1001": {
        "payment_id": "PAY-1001",
        "order_id": "ORD-1001",
        "customer_id": "CUS-001",
        "status": "success",
        "amount": 899.0,
    },
    "PAY-1002": {
        "payment_id": "PAY-1002",
        "order_id": "ORD-1002",
        "customer_id": "CUS-001",
        "status": "success",
        "amount": 1499.0,
    },
    "PAY-1003": {
        "payment_id": "PAY-1003",
        "order_id": "ORD-1003",
        "customer_id": "CUS-002",
        "status": "failed",
        "amount": 599.0,
    },
    "PAY-1004": {
        "payment_id": "PAY-1004",
        "order_id": "ORD-1004",
        "customer_id": "CUS-001",
        "status": "success",
        "amount": 1200.0,
    },
    "PAY-1005": {
        "payment_id": "PAY-1005",
        "order_id": None,
        "customer_id": "CUS-001",
        "status": "success",
        "amount": 750.0,
    },
}

POLICIES = {
    "refund": {
        "title": "Refund Policy",
        "text": (
            "Refund requests must be reviewed before approval. "
            "Payments for cancelled orders may qualify for review. "
            "A successful payment does not automatically guarantee a refund."
        ),
        "source": "refund-policy-v1",
    },
    "delivery": {
        "title": "Delivery Policy",
        "text": (
            "Customers can request an investigation for delayed deliveries. "
            "The support team should verify the shipment status and expected "
            "delivery date before promising compensation."
        ),
        "source": "delivery-policy-v1",
    },
    "account": {
        "title": "Account Security Policy",
        "text": (
            "For account security, credentials and passwords cannot be reset directly via chat. "
            "Customers should use the secure password reset link. "
            "If an account is locked or compromised, a human support agent must verify customer identity."
        ),
        "source": "account-security-v1",
    },
}