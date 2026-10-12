import os
from functools import lru_cache
from typing import Literal
from dotenv import load_dotenv

load_dotenv()


class Settings:
    def __init__(self) -> None:
        self.gemini_api_key: str | None = os.getenv("GEMINI_API_KEY")
        self.openai_api_key: str | None = os.getenv("OPENAI_API_KEY")
        self._llm_provider: str | None = os.getenv("LLM_PROVIDER")

        default_model = "gemini-flash-latest" if self.llm_provider == "gemini" else "gpt-4o-mini"
        self.llm_model: str = os.getenv("LLM_MODEL", default_model)
        self.llm_timeout_seconds: float = float(os.getenv("LLM_TIMEOUT_SECONDS", "10.0"))
        self.llm_max_tool_calls: int = int(os.getenv("LLM_MAX_TOOL_CALLS", "4"))
        self.llm_enabled: bool = os.getenv("LLM_ENABLED", "true").lower() in ("true", "1", "yes")

        mode = os.getenv("EXECUTION_MODE", "hybrid").lower()
        if mode not in {"hybrid", "deterministic_only", "llm_only"}:
            mode = "hybrid"
        self.execution_mode: Literal["hybrid", "deterministic_only", "llm_only"] = mode  # type: ignore

    @property
    def llm_provider(self) -> str:
        if self._llm_provider:
            return self._llm_provider.lower()
        return "gemini"

    @llm_provider.setter
    def llm_provider(self, val: str) -> None:
        self._llm_provider = val.lower()

    @property
    def is_llm_ready(self) -> bool:
        if not self.llm_enabled or self.execution_mode == "deterministic_only":
            return False
        if self.llm_provider == "gemini":
            return bool(self.gemini_api_key)
        if self.llm_provider == "openai":
            return bool(self.openai_api_key)
        return False

    def __repr__(self) -> str:
        has_gemini = bool(self.gemini_api_key)
        has_openai = bool(self.openai_api_key)
        return (
            f"Settings(llm_provider='{self.llm_provider}', "
            f"llm_model='{self.llm_model}', "
            f"execution_mode='{self.execution_mode}', "
            f"llm_enabled={self.llm_enabled}, "
            f"has_gemini_key={has_gemini}, "
            f"has_openai_key={has_openai}, "
            f"has_api_key={bool(has_gemini or has_openai)}, "
            f"llm_timeout_seconds={self.llm_timeout_seconds}, "
            f"llm_max_tool_calls={self.llm_max_tool_calls})"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()

