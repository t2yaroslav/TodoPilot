/**
 * Shared recurrence utilities: labels, options, and formatting.
 *
 * Recurrence format:
 *   - "daily"            — every day
 *   - "weekly"           — every week (same weekday)
 *   - "weekly:1,3"       — every Monday and Wednesday  (ISO weekday: 1=Mon … 7=Sun)
 *   - "biweekly"         — every 2 weeks
 *   - "monthly"          — every month (same day-of-month)
 *   - "monthly:1,15"     — 1st and 15th of every month
 *   - "yearly"           — every year
 */

const DAY_NAMES_SHORT: Record<number, string> = {
  1: 'пн',
  2: 'вт',
  3: 'ср',
  4: 'чт',
  5: 'пт',
  6: 'сб',
  7: 'вс',
};

const DAY_NAMES_FULL: Record<number, string> = {
  1: 'понедельник',
  2: 'вторник',
  3: 'среду',
  4: 'четверг',
  5: 'пятницу',
  6: 'субботу',
  7: 'воскресенье',
};

/** Human-readable label for any recurrence string. */
export function getRecurrenceLabel(recurrence: string | null | undefined): string {
  if (!recurrence) return '';

  switch (recurrence) {
    case 'daily':
      return 'Ежедневно';
    case 'weekly':
      return 'Еженедельно';
    case 'biweekly':
      return 'Раз в 2 недели';
    case 'monthly':
      return 'Ежемесячно';
    case 'yearly':
      return 'Ежегодно';
  }

  if (recurrence.startsWith('weekly:')) {
    const days = recurrence
      .split(':')[1]
      .split(',')
      .map(Number)
      .sort((a, b) => a - b);
    if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) {
      return 'По будням';
    }
    if (days.length === 2 && days.includes(6) && days.includes(7)) {
      return 'По выходным';
    }
    if (days.length === 7) {
      return 'Ежедневно';
    }
    const names = days.map((d) => DAY_NAMES_SHORT[d] || String(d));
    return 'Каждый ' + names.join(', ');
  }

  if (recurrence.startsWith('monthly:')) {
    const days = recurrence
      .split(':')[1]
      .split(',')
      .map(Number)
      .sort((a, b) => a - b);
    if (days.length === 1) {
      return `${days[0]}-го числа каждого месяца`;
    }
    return days.join(', ') + '-го числа каждого месяца';
  }

  return recurrence;
}

/** Short label suitable for tooltips / compact display. */
export function getRecurrenceLabelShort(recurrence: string | null | undefined): string {
  if (!recurrence) return '';

  switch (recurrence) {
    case 'daily':
      return 'Ежедневно';
    case 'weekly':
      return 'Еженедельно';
    case 'biweekly':
      return 'Раз в 2 нед.';
    case 'monthly':
      return 'Ежемесячно';
    case 'yearly':
      return 'Ежегодно';
  }

  if (recurrence.startsWith('weekly:')) {
    const days = recurrence
      .split(':')[1]
      .split(',')
      .map(Number)
      .sort((a, b) => a - b);
    const names = days.map((d) => DAY_NAMES_SHORT[d] || String(d));
    return names.join(', ');
  }

  if (recurrence.startsWith('monthly:')) {
    const days = recurrence
      .split(':')[1]
      .split(',')
      .map(Number)
      .sort((a, b) => a - b);
    return days.join(', ') + '-го ежемес.';
  }

  return recurrence;
}

/** Base recurrence select options (simple patterns only). */
export const RECURRENCE_OPTIONS = [
  { value: '', label: 'Без повторения' },
  { value: 'daily', label: 'Ежедневно' },
  { value: 'weekly', label: 'Еженедельно' },
  { value: 'biweekly', label: 'Раз в 2 недели' },
  { value: 'monthly', label: 'Ежемесячно' },
  { value: 'yearly', label: 'Ежегодно' },
];

/** Compact version. */
export const RECURRENCE_OPTIONS_SHORT = [
  { value: '', label: 'Без повторения' },
  { value: 'daily', label: 'Ежедневно' },
  { value: 'weekly', label: 'Еженедельно' },
  { value: 'biweekly', label: 'Раз в 2 нед.' },
  { value: 'monthly', label: 'Ежемесячно' },
  { value: 'yearly', label: 'Ежегодно' },
];

/**
 * Build Select data array that includes the current value
 * even if it's a custom recurrence (e.g. "weekly:1,3").
 */
export function getRecurrenceSelectData(
  currentValue: string | null | undefined,
  short = false,
): { value: string; label: string }[] {
  const base = short ? [...RECURRENCE_OPTIONS_SHORT] : [...RECURRENCE_OPTIONS];
  if (currentValue && !base.some((o) => o.value === currentValue)) {
    base.push({
      value: currentValue,
      label: short ? getRecurrenceLabelShort(currentValue) : getRecurrenceLabel(currentValue),
    });
  }
  return base;
}

/** Map from full day name (in various Russian cases) to ISO weekday number. */
export function dayNameToISO(name: string): number | null {
  const map: Record<string, number> = {
    'понедельник': 1, 'понедельника': 1, 'пн': 1,
    'вторник': 2, 'вторника': 2, 'вт': 2,
    'среда': 3, 'среду': 3, 'среды': 3, 'ср': 3,
    'четверг': 4, 'четверга': 4, 'чт': 4,
    'пятница': 5, 'пятницу': 5, 'пятницы': 5, 'пт': 5,
    'суббота': 6, 'субботу': 6, 'субботы': 6, 'сб': 6,
    'воскресенье': 7, 'воскресенья': 7, 'вс': 7,
  };
  return map[name.toLowerCase()] ?? null;
}

export { DAY_NAMES_SHORT, DAY_NAMES_FULL };
