
from .mock_data import POLICIES


def get_policy(policy_type: str) -> dict:
    policy = POLICIES.get(policy_type)

    if not policy:
        return {
            "success": False,
            "error": "Policy not found.",
        }

    return {
        "success": True,
        "data": policy,
    }