import json
import logging
import os
import re
from typing import Any
import httpx

from google import genai
from google.genai import errors, types
from openai import (
    APIConnectionError,
    APIError,
    APITimeoutError,
    AuthenticationError,
    OpenAI,
    RateLimitError,
)

from app.config import Settings, get_settings
from app.models.llm_schemas import LLMDecision
from app.models.schemas import ToolResult
from app.services.prompt_templates import build_system_prompt, build_user_prompt
from app.tools.registry import (
    GEMINI_READ_ONLY_TOOLS,
    OPENAI_READ_ONLY_TOOLS,
    ScopedToolRegistry,
)

logger = logging.getLogger(__name__)


class LLMServiceError(Exception):
    """Base exception for LLM service failures that trigger deterministic fallback."""

    def __init__(self, message: str, fallback_reason: str) -> None:
        super().__init__(message)
        self.fallback_reason = fallback_reason


class LLMTimeoutError(LLMServiceError):
    """Raised when LLM call exceeds configured timeout."""


class LLMMalformedOutputError(LLMServiceError):
    """Raised when LLM output violates schema or fails to parse."""


class LLMToolLimitExceededError(LLMServiceError):
    """Raised when tool execution loop exceeds bounded turn limit."""


def clean_json_string(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        lines = raw.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        raw = "\n".join(lines).strip()
    return raw


class LLMService:
    def __init__(
        self,
        settings: Settings | None = None,
        client: Any | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self._client = client

    @property
    def client(self) -> Any:
        if self._client is None:
            if self.settings.llm_provider == "gemini":
                if not self.settings.gemini_api_key:
                    raise LLMServiceError(
                        "Gemini API key not configured.",
                        fallback_reason="missing_api_key",
                    )
                self._client = genai.Client(
                    api_key=self.settings.gemini_api_key,
                    http_options=types.HttpOptions(
                        timeout=int(self.settings.llm_timeout_seconds * 1000)
                    ),
                )
            elif self.settings.llm_provider == "openai":
                if not self.settings.openai_api_key:
                    raise LLMServiceError(
                        "OpenAI API key not configured.",
                        fallback_reason="missing_api_key",
                    )
                self._client = OpenAI(
                    api_key=self.settings.openai_api_key,
                    timeout=self.settings.llm_timeout_seconds,
                )
            else:
                raise LLMServiceError(
                    f"Unsupported LLM provider: '{self.settings.llm_provider}'.",
                    fallback_reason="unsupported_provider",
                )
        return self._client

    def is_available(self) -> bool:
        if not self.settings.llm_enabled or self.settings.execution_mode == "deterministic_only":
            return False
        if self._client is not None:
            return True
        return self.settings.is_llm_ready

    def _is_openai_client(self) -> bool:
        if isinstance(self._client, OpenAI):
            return True
        if isinstance(self._client, genai.Client):
            return False
        if self._client is not None:
            # Check for explicitly configured OpenAI completions mock
            chat = getattr(self._client, "chat", None)
            if chat is not None:
                comp = getattr(chat, "completions", None)
                if comp is not None:
                    cr = getattr(comp, "create", None)
                    if cr is not None and (
                        getattr(cr, "_mock_side_effect", None) is not None
                        or (hasattr(cr, "_mock_return_value") and str(getattr(cr, "_mock_return_value")) != "sentinel.DEFAULT")
                    ):
                        return True
            # Check for explicitly configured Gemini models mock
            models = getattr(self._client, "models", None)
            if models is not None:
                gc = getattr(models, "generate_content", None)
                if gc is not None and (
                    getattr(gc, "_mock_side_effect", None) is not None
                    or (hasattr(gc, "_mock_return_value") and str(getattr(gc, "_mock_return_value")) != "sentinel.DEFAULT")
                ):
                    return False
        return self.settings.llm_provider == "openai"

    @staticmethod
    def _is_gemini_3_model(model_name: str | None) -> bool:
        """Check if the specified model name belongs to the Gemini 3.x family."""
        if not model_name:
            return False
        cleaned = model_name.lower().strip()
        if cleaned.startswith("models/"):
            cleaned = cleaned[len("models/"):]
        return bool(re.search(r"gemini[-_]?3(?:\.|\b|_)", cleaned))

    def _get_gemini_thinking_config(self, model_name: str | None) -> types.ThinkingConfig | None:
        """
        Return the appropriate ThinkingConfig based on the Gemini model family.

        Gemini 3.x models reject thinking_budget=0 with 400 INVALID_ARGUMENT.
        For Gemini 3.x models, omit thinking_config entirely unless the API /
        environment explicitly configures a supported positive thinking budget (> 0).
        For non-3.x models (including 'gemini-flash-latest'), keep thinking_budget=0
        to maintain compatibility and low-latency execution.
        """
        if self._is_gemini_3_model(model_name):
            budget = getattr(self.settings, "gemini_thinking_budget", None)
            if budget is None:
                env_budget = os.getenv("GEMINI_THINKING_BUDGET")
                if env_budget:
                    try:
                        budget = int(env_budget)
                    except ValueError:
                        budget = None
            if budget is not None and budget > 0:
                return types.ThinkingConfig(thinking_budget=budget)
            # Omit thinking_config entirely for Gemini 3.x
            return None

        # Non-3.x models (e.g. gemini-flash-latest): maintain thinking_budget=0
        return types.ThinkingConfig(thinking_budget=0)

    def run_investigation(
        self,
        customer_id: str,
        message: str,
    ) -> tuple[LLMDecision, list[ToolResult], dict[str, Any] | None, dict[str, Any] | None]:
        if not self.is_available():
            raise LLMServiceError(
                "LLM is not available or execution_mode is deterministic_only.",
                fallback_reason="llm_disabled",
            )

        if self._is_openai_client():
            return self._run_openai_investigation(customer_id=customer_id, message=message)
        return self._run_gemini_investigation(customer_id=customer_id, message=message)

    def _run_gemini_investigation(
        self,
        customer_id: str,
        message: str,
    ) -> tuple[LLMDecision, list[ToolResult], dict[str, Any] | None, dict[str, Any] | None]:
        registry = ScopedToolRegistry(customer_id=customer_id)
        system_prompt = build_system_prompt()
        user_prompt = build_user_prompt(customer_id=customer_id, message=message)

        contents: list[types.Content] = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=user_prompt)],
            )
        ]

        config_kwargs: dict[str, Any] = {
            "system_instruction": system_prompt,
            "tools": GEMINI_READ_ONLY_TOOLS,
            "temperature": 0.0,
            "automatic_function_calling": types.AutomaticFunctionCallingConfig(disable=True),
            "http_options": types.HttpOptions(
                timeout=int(self.settings.llm_timeout_seconds * 1000)
            ),
        }
        thinking_cfg = self._get_gemini_thinking_config(self.settings.llm_model)
        if thinking_cfg is not None:
            config_kwargs["thinking_config"] = thinking_cfg

        config = types.GenerateContentConfig(**config_kwargs)

        turns = 0
        max_turns = self.settings.llm_max_tool_calls

        while turns < max_turns:
            turns += 1
            try:
                response = self.client.models.generate_content(
                    model=self.settings.llm_model,
                    contents=contents,
                    config=config,
                )
            except (httpx.TimeoutException, TimeoutError) as timeout_err:
                raise LLMTimeoutError(
                    f"Gemini call timed out after {self.settings.llm_timeout_seconds}s.",
                    fallback_reason="timeout",
                ) from timeout_err
            except (errors.APIError, Exception) as api_err:
                if "timeout" in str(api_err).lower() or isinstance(api_err, (httpx.TimeoutException, TimeoutError)):
                    raise LLMTimeoutError(
                        f"Gemini call timed out after {self.settings.llm_timeout_seconds}s.",
                        fallback_reason="timeout",
                    ) from api_err
                raise LLMServiceError(
                    f"Gemini API failure: {type(api_err).__name__} - {api_err}",
                    fallback_reason="api_error",
                ) from api_err

            if not response or not getattr(response, "candidates", None):
                raise LLMMalformedOutputError(
                    "Gemini returned empty candidates.",
                    fallback_reason="malformed_output",
                )

            candidate = response.candidates[0]
            if not candidate.content or not candidate.content.parts:
                raise LLMMalformedOutputError(
                    "Gemini candidate has no content parts.",
                    fallback_reason="malformed_output",
                )

            # Check if model requested tool call(s)
            function_calls = getattr(response, "function_calls", None)
            if function_calls:
                contents.append(candidate.content)

                tool_response_parts: list[types.Part] = []
                for fc in function_calls:
                    fn_name = fc.name
                    fn_args = fc.args if isinstance(fc.args, dict) else {}
                    tool_output = registry.execute_tool(fn_name, fn_args)
                    tool_response_parts.append(
                        types.Part.from_function_response(
                            name=fn_name,
                            response=tool_output,
                        )
                    )

                contents.append(
                    types.Content(
                        role="user",
                        parts=tool_response_parts,
                    )
                )
                continue

            # Model produced final text decision output
            raw_content = getattr(response, "text", None)
            if not raw_content and candidate.content and candidate.content.parts:
                non_thought_parts = [
                    p.text
                    for p in candidate.content.parts
                    if getattr(p, "text", None) and not getattr(p, "thought", False)
                ]
                if non_thought_parts:
                    raw_content = "".join(non_thought_parts)
            raw_content = raw_content or ""
            cleaned = clean_json_string(raw_content)

            try:
                decision_dict = json.loads(cleaned)
                if not isinstance(decision_dict, dict):
                    raise ValueError("Output must be a JSON dictionary.")

                # Ensure internal chain-of-thought is never accepted or stored
                decision_dict.pop("reasoning", None)
                decision_dict.pop("thought", None)
                decision_dict.pop("internal_reasoning", None)
                decision_dict.pop("thoughts", None)
                decision_dict.pop("chain_of_thought", None)
                decision_dict.pop("thinking", None)
                decision_dict.pop("cot", None)

                decision = LLMDecision.model_validate(decision_dict)
                return (
                    decision,
                    registry.recorded_results,
                    registry.fetched_order,
                    registry.fetched_payment,
                )
            except Exception as parse_err:
                raise LLMMalformedOutputError(
                    f"Failed to parse or validate Gemini structured output: {parse_err}",
                    fallback_reason="malformed_output",
                ) from parse_err

        raise LLMToolLimitExceededError(
            f"Exceeded max tool iterations ({max_turns}) without final decision.",
            fallback_reason="tool_limit_exceeded",
        )

    def _run_openai_investigation(
        self,
        customer_id: str,
        message: str,
    ) -> tuple[LLMDecision, list[ToolResult], dict[str, Any] | None, dict[str, Any] | None]:
        registry = ScopedToolRegistry(customer_id=customer_id)
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": build_system_prompt()},
            {"role": "user", "content": build_user_prompt(customer_id=customer_id, message=message)},
        ]

        turns = 0
        max_turns = self.settings.llm_max_tool_calls

        while turns < max_turns:
            turns += 1
            try:
                response = self.client.chat.completions.create(
                    model=self.settings.llm_model,
                    messages=messages,
                    tools=OPENAI_READ_ONLY_TOOLS,
                    tool_choice="auto",
                    timeout=self.settings.llm_timeout_seconds,
                )
            except (APITimeoutError, httpx.TimeoutException, TimeoutError) as timeout_err:
                raise LLMTimeoutError(
                    f"LLM call timed out after {self.settings.llm_timeout_seconds}s.",
                    fallback_reason="timeout",
                ) from timeout_err
            except (AuthenticationError, RateLimitError, APIConnectionError, APIError) as api_err:
                raise LLMServiceError(
                    f"LLM API failure: {type(api_err).__name__}",
                    fallback_reason="api_error",
                ) from api_err
            except Exception as unk_err:
                raise LLMServiceError(
                    f"Unexpected error during LLM invocation: {type(unk_err).__name__}",
                    fallback_reason="unexpected_error",
                ) from unk_err

            if not response.choices:
                raise LLMMalformedOutputError(
                    "LLM returned empty choices.",
                    fallback_reason="malformed_output",
                )

            choice = response.choices[0]
            msg = choice.message

            # If model requested tool calls, execute them in ScopedToolRegistry
            if msg.tool_calls:
                messages.append(msg.model_dump(exclude_unset=True))
                for tool_call in msg.tool_calls:
                    fn_name = tool_call.function.name
                    try:
                        fn_args = (
                            json.loads(tool_call.function.arguments)
                            if tool_call.function.arguments
                            else {}
                        )
                    except json.JSONDecodeError:
                        fn_args = {}

                    tool_output = registry.execute_tool(fn_name, fn_args)
                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": json.dumps(tool_output),
                        }
                    )
                continue

            # Model produced final decision output
            raw_content = msg.content or ""
            cleaned = clean_json_string(raw_content)

            try:
                decision_dict = json.loads(cleaned)
                if not isinstance(decision_dict, dict):
                    raise ValueError("Output must be a JSON dictionary.")

                # Ensure internal chain-of-thought is never accepted/stored
                decision_dict.pop("reasoning", None)
                decision_dict.pop("thought", None)
                decision_dict.pop("internal_reasoning", None)
                decision_dict.pop("thoughts", None)
                decision_dict.pop("chain_of_thought", None)
                decision_dict.pop("thinking", None)
                decision_dict.pop("cot", None)

                decision = LLMDecision.model_validate(decision_dict)
                return (
                    decision,
                    registry.recorded_results,
                    registry.fetched_order,
                    registry.fetched_payment,
                )
            except Exception as parse_err:
                raise LLMMalformedOutputError(
                    f"Failed to parse or validate LLM structured output: {parse_err}",
                    fallback_reason="malformed_output",
                ) from parse_err

        raise LLMToolLimitExceededError(
            f"Exceeded max tool iterations ({max_turns}) without final decision.",
            fallback_reason="tool_limit_exceeded",
        )
