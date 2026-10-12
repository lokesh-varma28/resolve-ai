from typing import Any

from google.genai import types

from app.models.schemas import ToolResult
from app.tools.order_tools import get_order
from app.tools.payment_tools import get_payment_status
from app.tools.policy_tools import get_policy

OPENAI_READ_ONLY_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_order",
            "description": "Retrieve order status and details for an order belonging to the currently authenticated customer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_id": {
                        "type": "string",
                        "description": "The order identifier (e.g., ORD-1001).",
                    }
                },
                "required": ["order_id"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_payment_status",
            "description": "Retrieve transaction and payment status for a payment belonging to the currently authenticated customer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "payment_id": {
                        "type": "string",
                        "description": "The payment identifier (e.g., PAY-1001).",
                    }
                },
                "required": ["payment_id"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_policy",
            "description": "Retrieve company policy text regarding refunds, deliveries, or account security.",
            "parameters": {
                "type": "object",
                "properties": {
                    "policy_type": {
                        "type": "string",
                        "enum": ["refund", "delivery", "account"],
                        "description": "The policy category to inspect.",
                    }
                },
                "required": ["policy_type"],
                "additionalProperties": False,
            },
        },
    },
]

GEMINI_READ_ONLY_TOOLS = [
    types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name="get_order",
                description="Retrieve order status and details for an order belonging to the currently authenticated customer.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "order_id": types.Schema(
                            type=types.Type.STRING,
                            description="The order identifier (e.g., ORD-1001).",
                        )
                    },
                    required=["order_id"],
                ),
            ),
            types.FunctionDeclaration(
                name="get_payment_status",
                description="Retrieve transaction and payment status for a payment belonging to the currently authenticated customer.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "payment_id": types.Schema(
                            type=types.Type.STRING,
                            description="The payment identifier (e.g., PAY-1001).",
                        )
                    },
                    required=["payment_id"],
                ),
            ),
            types.FunctionDeclaration(
                name="get_policy",
                description="Retrieve company policy text regarding refunds, deliveries, or account security.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "policy_type": types.Schema(
                            type=types.Type.STRING,
                            enum=["refund", "delivery", "account"],
                            description="The policy category to inspect.",
                        )
                    },
                    required=["policy_type"],
                ),
            ),
        ]
    )
]


class ScopedToolRegistry:
    """
    Controlled read-only tool execution sandbox.
    Binds the authoritative customer_id server-side so that LLM cannot forge
    or access other customers' orders or payments.
    Mutating tools or direct refund executors do NOT exist here.
    """

    def __init__(self, customer_id: str) -> None:
        self.customer_id = customer_id
        self.recorded_results: list[ToolResult] = []
        self.fetched_order: dict[str, Any] | None = None
        self.fetched_payment: dict[str, Any] | None = None
        self.fetched_policies: dict[str, Any] = {}

    def execute_tool(self, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        if tool_name == "get_order":
            order_id = arguments.get("order_id", "").strip()
            result = get_order(order_id=order_id, customer_id=self.customer_id)
            tool_res = ToolResult(
                tool="get_order",
                success=result.get("success", False),
                data=result.get("data", {}),
                error=result.get("error"),
            )
            self.recorded_results.append(tool_res)
            if tool_res.success:
                self.fetched_order = tool_res.data
            return result

        if tool_name == "get_payment_status":
            payment_id = arguments.get("payment_id", "").strip()
            result = get_payment_status(payment_id=payment_id, customer_id=self.customer_id)
            tool_res = ToolResult(
                tool="get_payment_status",
                success=result.get("success", False),
                data=result.get("data", {}),
                error=result.get("error"),
            )
            self.recorded_results.append(tool_res)
            if tool_res.success:
                self.fetched_payment = tool_res.data
            return result

        if tool_name == "get_policy":
            policy_type = arguments.get("policy_type", "").strip().lower()
            result = get_policy(policy_type=policy_type)
            tool_res = ToolResult(
                tool=f"get_{policy_type}_policy",
                success=result.get("success", False),
                data=result.get("data", {}),
                error=result.get("error"),
            )
            self.recorded_results.append(tool_res)
            if tool_res.success:
                self.fetched_policies[policy_type] = tool_res.data
            return result

        # Any attempt to execute unauthorized tools or mutations is rejected
        rejected_result = {
            "success": False,
            "error": f"Tool '{tool_name}' is unauthorized, dangerous, or does not exist. Only read-only inquiry tools are available.",
        }
        self.recorded_results.append(
            ToolResult(
                tool=tool_name,
                success=False,
                data={},
                error=rejected_result["error"],
            )
        )
        return rejected_result

