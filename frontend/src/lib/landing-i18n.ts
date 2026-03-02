export type LandingLang = 'ru' | 'en';

const translations = {
  ru: {
    nav: {
      features: 'Возможности',
      howItWorks: 'Как это работает',
      ai: 'AI-помощник',
      login: 'Войти',
      start: 'Начать бесплатно',
    },
    hero: {
      badge: 'Умный планировщик с AI',
      title: 'Управляйте задачами',
      titleAccent: 'с помощью AI',
      subtitle:
        'TodoPilot помогает организовать задачи, проекты и цели. Встроенный AI-ассистент анализирует вашу продуктивность и помогает планировать день.',
      cta: 'Начать бесплатно',
      demo: 'Посмотреть демо',
    },
    features: {
      title: 'Всё для продуктивности',
      subtitle: 'Простые, но мощные инструменты для управления задачами и проектами',
      items: [
        {
          title: 'Задачи и подзадачи',
          description:
            'Создавайте задачи с приоритетами, дедлайнами, повторениями и разбивайте их на подзадачи.',
        },
        {
          title: 'Проекты',
          description:
            'Группируйте задачи по проектам с цветовой маркировкой для быстрой навигации.',
        },
        {
          title: 'Цели',
          description:
            'Ставьте годовые и квартальные цели, привязывайте к ним проекты и отслеживайте прогресс.',
        },
        {
          title: 'Умные представления',
          description:
            'Сегодня, Входящие, Предстоящие, Завершённые - разные способы увидеть ваши задачи.',
        },
        {
          title: 'Аналитика',
          description:
            'Графики продуктивности и статистика выполнения для понимания ваших привычек.',
        },
        {
          title: 'Еженедельные ретроспективы',
          description:
            'AI помогает проводить еженедельный обзор: достижения, трудности и план улучшений.',
        },
      ],
    },
    howItWorks: {
      title: 'Начать просто',
      subtitle: 'Три шага - и вы организованы',
      steps: [
        {
          step: '1',
          title: 'Зарегистрируйтесь',
          description: 'Введите email - и вы в системе. Никаких паролей, только код подтверждения.',
        },
        {
          step: '2',
          title: 'Добавьте задачи',
          description: 'Создайте задачи, проекты и цели. Или расскажите AI о своих планах - он структурирует их за вас.',
        },
        {
          step: '3',
          title: 'Достигайте целей',
          description: 'Следите за прогрессом, получайте AI-рекомендации и проводите еженедельные ретроспективы.',
        },
      ],
    },
    ai: {
      title: 'AI-помощник внутри',
      subtitle:
        'Встроенный AI анализирует ваши задачи и помогает работать эффективнее',
      items: [
        {
          title: 'Утренний план',
          description: 'AI составляет оптимальный план на день на основе ваших задач и приоритетов.',
        },
        {
          title: 'Brain Dump',
          description: 'Выгрузите все мысли текстом - AI разберёт их на задачи и проекты.',
        },
        {
          title: 'Анализ продуктивности',
          description: 'Получайте персонализированные советы на основе вашей статистики.',
        },
        {
          title: 'Умный чат',
          description: 'Обсуждайте планы, просите советы и управляйте задачами через диалог с AI.',
        },
      ],
    },
    cta: {
      title: 'Готовы стать продуктивнее?',
      subtitle: 'Присоединяйтесь к TodoPilot и начните управлять задачами по-умному.',
      button: 'Начать бесплатно',
    },
    footer: {
      description: 'Умный планировщик задач с AI-ассистентом для достижения целей.',
      product: 'Продукт',
      features: 'Возможности',
      pricing: 'Цены',
      changelog: 'Обновления',
      support: 'Поддержка',
      docs: 'Документация',
      contact: 'Связаться с нами',
      privacy: 'Конфиденциальность',
      legal: 'Юридическое',
      terms: 'Условия использования',
      privacyPolicy: 'Политика конфиденциальности',
      rights: 'Все права защищены.',
    },
  },
  en: {
    nav: {
      features: 'Features',
      howItWorks: 'How it works',
      ai: 'AI Assistant',
      login: 'Log in',
      start: 'Get started free',
    },
    hero: {
      badge: 'Smart planner with AI',
      title: 'Manage your tasks',
      titleAccent: 'with AI',
      subtitle:
        'TodoPilot helps you organize tasks, projects, and goals. A built-in AI assistant analyzes your productivity and helps plan your day.',
      cta: 'Get started free',
      demo: 'Watch demo',
    },
    features: {
      title: 'Everything for productivity',
      subtitle: 'Simple yet powerful tools for task and project management',
      items: [
        {
          title: 'Tasks & subtasks',
          description:
            'Create tasks with priorities, deadlines, recurrence, and break them into subtasks.',
        },
        {
          title: 'Projects',
          description:
            'Group tasks by projects with color coding for quick navigation.',
        },
        {
          title: 'Goals',
          description:
            'Set yearly and quarterly goals, link projects to them, and track progress.',
        },
        {
          title: 'Smart views',
          description:
            'Today, Inbox, Upcoming, Completed - different ways to see your tasks.',
        },
        {
          title: 'Analytics',
          description:
            'Productivity charts and completion stats to understand your habits.',
        },
        {
          title: 'Weekly retrospectives',
          description:
            'AI helps run weekly reviews: achievements, challenges, and improvement plans.',
        },
      ],
    },
    howItWorks: {
      title: 'Easy to start',
      subtitle: 'Three steps to get organized',
      steps: [
        {
          step: '1',
          title: 'Sign up',
          description: 'Enter your email and you\'re in. No passwords - just a confirmation code.',
        },
        {
          step: '2',
          title: 'Add tasks',
          description: 'Create tasks, projects, and goals. Or tell the AI about your plans - it\'ll structure them for you.',
        },
        {
          step: '3',
          title: 'Achieve goals',
          description: 'Track progress, get AI recommendations, and run weekly retrospectives.',
        },
      ],
    },
    ai: {
      title: 'AI assistant built in',
      subtitle:
        'Built-in AI analyzes your tasks and helps you work more efficiently',
      items: [
        {
          title: 'Morning plan',
          description: 'AI creates an optimal day plan based on your tasks and priorities.',
        },
        {
          title: 'Brain Dump',
          description: 'Dump all your thoughts as text - AI will sort them into tasks and projects.',
        },
        {
          title: 'Productivity analysis',
          description: 'Get personalized advice based on your statistics.',
        },
        {
          title: 'Smart chat',
          description: 'Discuss plans, ask for advice, and manage tasks through conversation with AI.',
        },
      ],
    },
    cta: {
      title: 'Ready to be more productive?',
      subtitle: 'Join TodoPilot and start managing tasks the smart way.',
      button: 'Get started free',
    },
    footer: {
      description: 'Smart task planner with AI assistant for achieving goals.',
      product: 'Product',
      features: 'Features',
      pricing: 'Pricing',
      changelog: 'Changelog',
      support: 'Support',
      docs: 'Documentation',
      contact: 'Contact us',
      privacy: 'Privacy',
      legal: 'Legal',
      terms: 'Terms of service',
      privacyPolicy: 'Privacy policy',
      rights: 'All rights reserved.',
    },
  },
};

type Translations = typeof translations;
export type LandingTranslations = Translations['ru'];

export function getLandingT(lang: LandingLang): LandingTranslations {
  return translations[lang] as LandingTranslations;
}

export function detectLang(): LandingLang {
  const stored = localStorage.getItem('landing-lang');
  if (stored === 'en' || stored === 'ru') return stored;
  const browserLang = navigator.language.slice(0, 2);
  return browserLang === 'ru' ? 'ru' : 'en';
}
