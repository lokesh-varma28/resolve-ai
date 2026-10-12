
from .mock_data import ORDERS


def get_order(order_id: str, customer_id: str) -> dict:
    order = ORDERS.get(order_id)

    if not order:
        return {
            "success": False,
            "error": "Order not found.",
        }

    # Important: do not expose another customer's order.
    if order["customer_id"] != customer_id:
        return {
            "success": False,
            "error": "Order does not belong to this customer.",
        }

    return {
        "success": True,
        "data": order,
    }