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

if settings.llm_debug:
    from .llm_logger import LLMDebugLogger

    litellm.callbacks = [LLMDebugLogger()]

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


async def coaching_analysis(stats: dict, user_profile: str | None = None) -> str:
    """Analyze user statistics and provide coaching suggestions."""
    stats_text = (
        f"Статистика пользователя:\n"
        f"- Всего задач: {stats['total_tasks']}\n"
        f"- Выполнено задач: {stats['completed_tasks']}\n"
        f"- Незавершённых задач: {stats['pending_tasks']}\n"
        f"- Просроченных задач: {stats['overdue_tasks']}\n"
        f"- Задач на сегодня: {stats['today_tasks']}\n"
        f"- Выполнено за 7 дней: {stats['completed_7d']}\n"
        f"- Выполнено за 30 дней: {stats['completed_30d']}\n"
        f"- Среднее задач в день (7д): {stats['avg_daily_7d']:.1f}\n"
        f"- Проектов: {stats['total_projects']}\n"
        f"- Целей: {stats['total_goals']}\n"
        f"\nРаспределение по приоритетам (незавершённые):\n"
        f"  P1 (критичный): {stats['priority_p1']}\n"
        f"  P2 (высокий): {stats['priority_p2']}\n"
        f"  P3 (средний): {stats['priority_p3']}\n"
        f"  P4 (низкий): {stats['priority_p4']}\n"
        f"  Без приоритета: {stats['priority_none']}\n"
    )
    if stats.get('goals_progress'):
        stats_text += "\nПрогресс по целям:\n"
        for g in stats['goals_progress']:
            stats_text += f"  - {g['title']}: {g['completed']}/{g['total']} задач\n"
    if stats.get('overdue_list'):
        stats_text += "\nПросроченные задачи:\n"
        for t in stats['overdue_list'][:10]:
            stats_text += f"  - {t}\n"

    messages = [
        {
            "role": "user",
            "content": (
                f"{stats_text}\n\n"
                "На основе этой статистики проведи коучинг-анализ продуктивности пользователя. "
                "Укажи:\n"
                "1. Сильные стороны (что получается хорошо)\n"
                "2. Зоны роста (что можно улучшить)\n"
                "3. Конкретные рекомендации (3-5 действий)\n"
                "4. На что обратить внимание прямо сейчас\n"
                "Будь конкретным, используй цифры из статистики. Формат — читаемый текст с разделами."
            ),
        }
    ]
    return await chat(messages, user_profile=user_profile)


async def brain_dump_extract(text: str, user_profile: str | None = None) -> str:
    """Extract tasks, projects, goals from brain dump text."""
    messages = [
        {
            "role": "user",
            "content": (
                f"Пользователь выгрузил из головы следующий текст:\n\n\"{text}\"\n\n"
                "Извлеки из этого текста задачи, проекты и цели. "
                "Верни JSON (только JSON, без markdown) с полем items — массив объектов.\n"
                "Каждый объект:\n"
                "- type: \"task\", \"project\" или \"goal\"\n"
                "- title: название (краткое, конкретное)\n"
                "- priority: 0-4 (0=нет, 1=P4 низкий, 2=P3 средний, 3=P2 высокий, 4=P1 критичный)\n"
                "- due_date: дата в формате YYYY-MM-DD если можно определить, иначе null\n"
                "- project: название проекта если задача связана с проектом, иначе null\n"
                "- goal: название цели если связано с целью, иначе null\n\n"
                "Также добавь поле reply — краткий комментарий о том, что ты извлёк.\n"
                "Пример: {\"reply\": \"Нашёл 5 задач и 1 проект\", \"items\": [...]}"
            ),
        }
    ]
    return await chat(messages, user_profile=user_profile)


async def morning_plan(
    today_tasks: list[dict],
    all_tasks: list[dict],
    goals: list[dict],
    stats: dict,
    user_profile: str | None = None,
) -> str:
    """Generate a morning plan suggestion."""
    today_text = "\n".join(
        f"- {t['title']} (приоритет: {t['priority']}, проект: {t.get('project', 'нет')}, цель: {t.get('goal', 'нет')})"
        for t in today_tasks
    ) if today_tasks else "Нет задач на сегодня"

    pending_text = "\n".join(
        f"- {t['title']} (приоритет: {t['priority']}, дедлайн: {t.get('due_date', 'нет')})"
        for t in all_tasks[:20]
    ) if all_tasks else "Нет незавершённых задач"

    goals_text = "\n".join(f"- {g['title']}" for g in goals) if goals else "Нет целей"

    messages = [
        {
            "role": "user",
            "content": (
                f"Задачи на сегодня:\n{today_text}\n\n"
                f"Все незавершённые задачи (до 20):\n{pending_text}\n\n"
                f"Цели пользователя:\n{goals_text}\n\n"
                f"Среднее завершений в день (7д): {stats.get('avg_daily_7d', 0):.1f}\n"
                f"Просроченных задач: {stats.get('overdue_tasks', 0)}\n\n"
                "Предложи план на утро:\n"
                "1. С какой задачи начать день и ПОЧЕМУ (учитывай приоритеты, дедлайны, связь с целями)\n"
                "2. Рекомендуемый порядок задач на сегодня\n"
                "3. Если задач на сегодня нет — предложи что стоит взять из незавершённых\n"
                "4. Мотивирующий совет на день\n"
                "Будь конкретным и кратким."
            ),
        }
    ]
    return await chat(messages, user_profile=user_profile)


async def chat_with_actions(
    messages: list[dict],
    tasks_context: str | None = None,
    projects_context: str | None = None,
    user_profile: str | None = None,
) -> str:
    """Chat that can suggest task actions (create/complete/move)."""
    action_system = SYSTEM_PROMPT + """

Ты также можешь предлагать действия с задачами. Если пользователь просит создать, закрыть или переместить задачу,
верни ответ в формате JSON (только JSON, без markdown):
{
  "reply": "текст ответа пользователю",
  "actions": [
    {"action": "create", "title": "Название задачи", "priority": 0, "due_date": "YYYY-MM-DD или null", "project_id": "id или null"},
    {"action": "complete", "task_id": "id задачи"},
    {"action": "move", "task_id": "id задачи", "project_id": "новый id проекта или null"}
  ]
}

Если действий нет — просто отвечай обычным текстом БЕЗ JSON.
Если пользователь просит создать задачу но не указал точное название — уточни.
Если пользователь хочет закрыть задачу — найди подходящую по названию из контекста задач.
"""
    system = action_system
    if user_profile:
        system += f"\n\nПсихопортрет пользователя:\n{user_profile}"
    if tasks_context:
        system += f"\n\nТекущие задачи пользователя:\n{tasks_context}"
    if projects_context:
        system += f"\n\nПроекты пользователя:\n{projects_context}"

    full_messages = [{"role": "system", "content": system}] + messages

    kwargs: dict = {
        "model": settings.llm_model,
        "messages": full_messages,
        "max_tokens": 1500,
    }
    if settings.llm_api_key:
        kwargs["api_key"] = settings.llm_api_key
    if settings.llm_api_base:
        kwargs["api_base"] = settings.llm_api_base

    response = await litellm.acompletion(**kwargs)
    return response.choices[0].message.content


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
