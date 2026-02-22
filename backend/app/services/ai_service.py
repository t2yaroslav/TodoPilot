"""AI service using LiteLLM for multi-provider support.

Switch provider by changing LLM_MODEL env var:
  - OpenAI:   gpt-4o-mini, gpt-4o
  - Claude:   claude-sonnet-4-20250514
  - Deepseek: deepseek/deepseek-chat
  - Local:    ollama/llama3 (+ set LLM_API_BASE)
"""

import litellm

from ..config import settings

litellm.drop_params = True

SYSTEM_PROMPT = """Ты — AI-помощник в приложении TodoPilot для управления задачами.
Твоя роль: помогать пользователю с продуктивностью, мотивацией и целеполаганием.

Принципы:
- Будь кратким и конкретным
- Не навязывай, а предлагай
- Используй данные о пользователе (психопортрет) для персонализации
- Связывай текущие задачи с долгосрочными целями
- При падении мотивации: не спрашивай причину напрямую, а помоги найти блокер
- Отвечай на том же языке, на котором пишет пользователь
"""


async def chat(
    messages: list[dict],
    user_profile: str | None = None,
    tasks_context: str | None = None,
) -> str:
    system = SYSTEM_PROMPT
    if user_profile:
        system += f"\n\nПсихопортрет пользователя:\n{user_profile}"
    if tasks_context:
        system += f"\n\nКонтекст задач:\n{tasks_context}"

    full_messages = [{"role": "system", "content": system}] + messages

    kwargs: dict = {
        "model": settings.llm_model,
        "messages": full_messages,
        "max_tokens": 1024,
    }
    if settings.llm_api_key:
        kwargs["api_key"] = settings.llm_api_key
    if settings.llm_api_base:
        kwargs["api_base"] = settings.llm_api_base

    response = await litellm.acompletion(**kwargs)
    return response.choices[0].message.content


async def analyze_productivity(
    completed_tasks: list[dict],
    user_profile: str | None = None,
) -> str:
    tasks_text = "\n".join(
        f"- {t['title']} (завершена: {t.get('completed_at', 'N/A')})" for t in completed_tasks
    )
    messages = [
        {
            "role": "user",
            "content": (
                f"Проанализируй продуктивность за вчера. Вот завершённые задачи:\n{tasks_text}\n\n"
                "Дай краткий анализ и мотивирующий совет. Если задач мало — предложи разобраться с блокером."
            ),
        }
    ]
    return await chat(messages, user_profile=user_profile)


async def weekly_retrospective(
    week_tasks: list[dict],
    goals: list[dict],
    user_profile: str | None = None,
) -> dict:
    tasks_text = "\n".join(
        f"- {'[x]' if t.get('completed') else '[ ]'} {t['title']}" for t in week_tasks
    )
    goals_text = "\n".join(f"- {g['title']}" for g in goals) if goals else "Цели не заданы"

    messages = [
        {
            "role": "user",
            "content": (
                f"Сделай еженедельную ретроспективу.\n\nЗадачи за неделю:\n{tasks_text}\n\n"
                f"Цели:\n{goals_text}\n\n"
                "Верни JSON с полями: achievements (список достижений), difficulties (список трудностей), "
                "improvements (список предложений), weekly_goals (предложения целей на неделю). "
                "Каждое поле — массив строк. Только JSON, без markdown."
            ),
        }
    ]
    result = await chat(messages, user_profile=user_profile)
    import json

    try:
        return json.loads(result)
    except json.JSONDecodeError:
        return {"achievements": [], "difficulties": [], "improvements": [], "weekly_goals": [], "raw": result}


async def onboarding_chat(message: str, history: list[dict]) -> str:
    messages = history + [{"role": "user", "content": message}]
    system_override = (
        "Ты помогаешь новому пользователю настроить приложение TodoPilot. "
        "Задавай вопросы о его сфере деятельности, текущих задачах и целях. "
        "Когда соберёшь достаточно информации, предложи список задач и целей. "
        "Будь дружелюбным и кратким. Отвечай на языке пользователя."
    )
    full_messages = [{"role": "system", "content": system_override}] + messages

    kwargs: dict = {"model": settings.llm_model, "messages": full_messages, "max_tokens": 1024}
    if settings.llm_api_key:
        kwargs["api_key"] = settings.llm_api_key
    if settings.llm_api_base:
        kwargs["api_base"] = settings.llm_api_base

    response = await litellm.acompletion(**kwargs)
    return response.choices[0].message.content
