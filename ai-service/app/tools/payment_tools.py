from .mock_data import ORDERS, PAYMENTS


def get_payment_status(
    payment_id: str,
    customer_id: str,
) -> dict:
    payment = PAYMENTS.get(payment_id)

    if not payment:
        return {
            "success": False,
            "error": "Payment not found.",
        }

    # Verify ownership either directly via payment record or through linked order
    owner_id = payment.get("customer_id")
    if not owner_id and payment.get("order_id"):
        linked_order = ORDERS.get(payment["order_id"])
        if linked_order:
            owner_id = linked_order.get("customer_id")

    if owner_id != customer_id:
        return {
            "success": False,
            "error": "Payment is not associated with this customer.",
        }

    return {
        "success": True,
        "data": payment,
    }