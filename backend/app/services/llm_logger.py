"""LiteLLM custom callback logger for structured LLM debug logging.

Activated by setting LLM_DEBUG=true in .env. Logs every LLM call with:
model, tokens (prompt+completion=total), cost, latency, truncated prompt/reply.

Log format:
  [LLM] OK   | model=gpt-4o-mini | tokens=320+180=500 | cost=$0.0003 | latency=1243ms | prompt="..." | reply="..."
  [LLM] FAIL | model=gpt-4o-mini | error=AuthenticationError | latency=89ms
"""

import logging

from litellm.integrations.custom_logger import CustomLogger

logger = logging.getLogger("todopilot.llm")


def _truncate(text: str, limit: int = 200) -> str:
    """Truncate and flatten text for single-line log output."""
    flat = (text or "").replace("\n", " ").replace("\r", "")
    return flat[:limit] + "…" if len(flat) > limit else flat


class LLMDebugLogger(CustomLogger):
    """Structured logger for all LiteLLM completion calls."""

    def _log_success(self, kwargs, response_obj, start_time, end_time):
        try:
            latency_ms = int((end_time - start_time).total_seconds() * 1000)
            model = kwargs.get("model", "?")

            # Token usage
            usage = getattr(response_obj, "usage", None)
            prompt_tokens = getattr(usage, "prompt_tokens", 0) if usage else 0
            completion_tokens = getattr(usage, "completion_tokens", 0) if usage else 0
            total_tokens = prompt_tokens + completion_tokens

            # Cost (LiteLLM attaches this in post-processing)
            cost = kwargs.get("response_cost") or 0

            # Last user message as prompt preview
            messages = kwargs.get("messages") or kwargs.get("input", [])
            last_user = ""
            if isinstance(messages, list):
                for m in reversed(messages):
                    if isinstance(m, dict) and m.get("role") == "user":
                        last_user = m.get("content", "")
                        break

            # Response preview
            reply = ""
            if hasattr(response_obj, "choices") and response_obj.choices:
                content = getattr(response_obj.choices[0].message, "content", None)
                reply = content or ""

            logger.info(
                '[LLM] OK | model=%s | tokens=%d+%d=%d | cost=$%.4f | latency=%dms | prompt="%s" | reply="%s"',
                model,
                prompt_tokens,
                completion_tokens,
                total_tokens,
                cost,
                latency_ms,
                _truncate(last_user),
                _truncate(reply),
            )
        except Exception as exc:
            logger.warning("[LLM] Logger error in _log_success: %s", exc)

    def _log_failure(self, kwargs, response_obj, start_time, end_time):
        try:
            latency_ms = int((end_time - start_time).total_seconds() * 1000)
            model = kwargs.get("model", "?")
            exception = kwargs.get("exception", "Unknown")
            exc_type = type(exception).__name__ if not isinstance(exception, str) else "Error"
            exc_msg = str(exception)[:300]

            logger.error(
                "[LLM] FAIL | model=%s | error=%s | msg=%s | latency=%dms",
                model,
                exc_type,
                exc_msg,
                latency_ms,
            )
        except Exception as exc:
            logger.warning("[LLM] Logger error in _log_failure: %s", exc)

    # LiteLLM calls async variants for acompletion()
    async def async_log_success_event(self, kwargs, response_obj, start_time, end_time):
        self._log_success(kwargs, response_obj, start_time, end_time)

    async def async_log_failure_event(self, kwargs, response_obj, start_time, end_time):
        self._log_failure(kwargs, response_obj, start_time, end_time)

    # Sync variants as fallback for completion()
    def log_success_event(self, kwargs, response_obj, start_time, end_time):
        self._log_success(kwargs, response_obj, start_time, end_time)

    def log_failure_event(self, kwargs, response_obj, start_time, end_time):
        self._log_failure(kwargs, response_obj, start_time, end_time)
