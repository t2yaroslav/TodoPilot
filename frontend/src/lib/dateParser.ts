/**
 * Universal Russian natural-language date & recurrence parser.
 *
 * Recognises patterns such as:
 *   "Сегодня", "Завтра", "Послезавтра"
 *   "Понедельник", "В среду"
 *   "1 марта", "15 янв"
 *   "Каждый день"
 *   "Каждый понедельник"
 *   "Каждый понедельник и среду"
 *   "Каждую субботу"
 *   "Каждый месяц 1 числа"
 *   "Каждый месяц 1 и 15 числа"
 *   "Каждые 2 недели"
 *   "Каждый год"
 *   "По будням"
 *   "По выходным"
 */

import dayjs from 'dayjs';
import { dayNameToISO } from './recurrence';

/* ───────────── helpers ───────────── */

const MONTH_MAP: Record<string, number> = {
  // Full names (genitive / nominative)
  'январь': 0, 'января': 0, 'янв': 0,
  'февраль': 1, 'февраля': 1, 'фев': 1,
  'март': 2, 'марта': 2, 'мар': 2,
  'апрель': 3, 'апреля': 3, 'апр': 3,
  'май': 4, 'мая': 4,
  'июнь': 5, 'июня': 5, 'июн': 5,
  'июль': 6, 'июля': 6, 'июл': 6,
  'август': 7, 'августа': 7, 'авг': 7,
  'сентябрь': 8, 'сентября': 8, 'сен': 8, 'сент': 8,
  'октябрь': 9, 'октября': 9, 'окт': 9,
  'ноябрь': 10, 'ноября': 10, 'ноя': 10, 'нояб': 10,
  'декабрь': 11, 'декабря': 11, 'дек': 11,
};

/** All known day-name tokens (lowercase). */
const DAY_TOKENS = [
  'понедельник', 'понедельника', 'пн',
  'вторник', 'вторника', 'вт',
  'среда', 'среду', 'среды', 'ср',
  'четверг', 'четверга', 'чт',
  'пятница', 'пятницу', 'пятницы', 'пт',
  'суббота', 'субботу', 'субботы', 'сб',
  'воскресенье', 'воскресенья', 'вс',
];

function nextWeekday(isoDay: number): Date {
  const today = dayjs();
  const current = today.day() === 0 ? 7 : today.day(); // convert to ISO
  let diff = isoDay - current;
  if (diff <= 0) diff += 7;
  return today.add(diff, 'day').toDate();
}

function extractDayNames(text: string): number[] {
  const days: number[] = [];
  // Sort tokens longest-first to avoid partial matches ("ср" matching inside "среду")
  const sorted = [...DAY_TOKENS].sort((a, b) => b.length - a.length);
  let remaining = text;
  for (const token of sorted) {
    if (remaining.includes(token)) {
      const iso = dayNameToISO(token);
      if (iso !== null && !days.includes(iso)) {
        days.push(iso);
      }
      // Remove the matched token to avoid double-matching
      remaining = remaining.replace(token, ' ');
    }
  }
  return days.sort((a, b) => a - b);
}

function extractMonthDays(text: string): number[] {
  // Look for numbers in the text
  const nums = text.match(/\d+/g);
  if (!nums) return [];
  return nums.map(Number).filter((n) => n >= 1 && n <= 31).sort((a, b) => a - b);
}

/* ───────────── main types ───────────── */

export interface ParseResult {
  /** Resolved date (may be null if only recurrence matched). */
  date: Date | null;
  /** Recurrence string or null. */
  recurrence: string | null;
  /** Human-readable description of what was parsed. */
  label: string;
}

/* ───────────── parser ───────────── */

export function parseDateInput(raw: string): ParseResult | null {
  const text = raw.trim().toLowerCase();
  if (!text) return null;

  /* ── 1. "Сегодня" ─────────────────── */
  if (text === 'сегодня') {
    return { date: dayjs().toDate(), recurrence: null, label: 'Сегодня' };
  }

  /* ── 2. "Завтра" ──────────────────── */
  if (text === 'завтра') {
    return { date: dayjs().add(1, 'day').toDate(), recurrence: null, label: 'Завтра' };
  }

  /* ── 3. "Послезавтра" ─────────────── */
  if (text === 'послезавтра') {
    return { date: dayjs().add(2, 'day').toDate(), recurrence: null, label: 'Послезавтра' };
  }

  /* ── 4. "По будням" / "каждый будень" ───────────────── */
  if (/^по\s+будн/i.test(text) || /^кажд\S*\s+будн/i.test(text)) {
    return {
      date: nextWeekday(1),
      recurrence: 'weekly:1,2,3,4,5',
      label: 'По будням',
    };
  }

  /* ── 5. "По выходным" ─────────────── */
  if (/^по\s+выходн/i.test(text)) {
    return {
      date: nextWeekday(6),
      recurrence: 'weekly:6,7',
      label: 'По выходным',
    };
  }

  /* ── 6. Recurrence patterns starting with "кажд" ── */
  if (/^кажд/.test(text)) {
    return parseRecurrence(text);
  }

  /* ── 7. "Ежедневно" / "Еженедельно" / etc. ── */
  if (/^ежедневно/.test(text)) {
    return { date: dayjs().toDate(), recurrence: 'daily', label: 'Ежедневно' };
  }
  if (/^еженедельно/.test(text)) {
    return { date: null, recurrence: 'weekly', label: 'Еженедельно' };
  }
  if (/^ежемесячно/.test(text)) {
    return { date: null, recurrence: 'monthly', label: 'Ежемесячно' };
  }
  if (/^ежегодно/.test(text)) {
    return { date: null, recurrence: 'yearly', label: 'Ежегодно' };
  }

  /* ── 8. Single weekday: "понедельник" / "в среду" ── */
  {
    const cleaned = text.replace(/^в\s+/, '');
    const iso = dayNameToISO(cleaned);
    if (iso !== null) {
      const d = nextWeekday(iso);
      return { date: d, recurrence: null, label: dayjs(d).format('dd, D MMM') };
    }
  }

  /* ── 9. Date: "1 марта" / "15 янв" / "25 декабря" ── */
  {
    const m = text.match(/^(\d{1,2})\s+([а-яё]+)/);
    if (m) {
      const day = parseInt(m[1], 10);
      const monthIdx = MONTH_MAP[m[2]];
      if (monthIdx !== undefined && day >= 1 && day <= 31) {
        let target = dayjs().month(monthIdx).date(day).startOf('day');
        if (target.isBefore(dayjs().startOf('day'))) {
          target = target.add(1, 'year');
        }
        return {
          date: target.toDate(),
          recurrence: null,
          label: target.format('D MMMM'),
        };
      }
    }
  }

  return null;
}

/* ── Recurrence sub-parser for "кажд…" patterns ── */
function parseRecurrence(text: string): ParseResult | null {
  /* "каждый день" */
  if (/кажд\S*\s+день/.test(text)) {
    return { date: dayjs().toDate(), recurrence: 'daily', label: 'Каждый день' };
  }

  /* "каждую неделю" */
  if (/кажд\S*\s+недел/.test(text)) {
    return { date: null, recurrence: 'weekly', label: 'Каждую неделю' };
  }

  /* "каждые 2 недели" / "каждые две недели" */
  if (/кажд\S*\s+(2|две|два)\s+недел/.test(text)) {
    return { date: null, recurrence: 'biweekly', label: 'Каждые 2 недели' };
  }

  /* "каждый год" */
  if (/кажд\S*\s+год/.test(text)) {
    return { date: null, recurrence: 'yearly', label: 'Каждый год' };
  }

  /* "каждый месяц 1 и 15 числа" / "каждый месяц 1 числа" */
  {
    const monthMatch = text.match(/кажд\S*\s+месяц\S*\s+(.*)/);
    if (monthMatch) {
      const rest = monthMatch[1];
      const days = extractMonthDays(rest);
      if (days.length > 0) {
        const recurrence = `monthly:${days.join(',')}`;
        // Set date to next occurrence
        const date = nextMonthlyOccurrence(days);
        const daysLabel = days.join(' и ');
        return {
          date,
          recurrence,
          label: `Каждый месяц ${daysLabel}-го числа`,
        };
      }
      // "каждый месяц" without specific days
      return { date: null, recurrence: 'monthly', label: 'Каждый месяц' };
    }
  }

  /* "каждый понедельник и среду" / "каждую субботу" / etc. */
  {
    const days = extractDayNames(text);
    if (days.length > 0) {
      const recurrence = days.length === 1 && days[0] === dayjs().day()
        ? 'weekly'
        : `weekly:${days.join(',')}`;
      const date = nextWeekday(days[0]);
      const dayLabels = days.map((d) => {
        const names: Record<number, string> = {
          1: 'пн', 2: 'вт', 3: 'ср', 4: 'чт', 5: 'пт', 6: 'сб', 7: 'вс',
        };
        return names[d];
      });
      return {
        date,
        recurrence,
        label: `Каждый ${dayLabels.join(', ')}`,
      };
    }
  }

  return null;
}

function nextMonthlyOccurrence(days: number[]): Date {
  const today = dayjs();
  const currentDay = today.date();
  // Find the next day in this month
  const futureDays = days.filter((d) => d > currentDay);
  if (futureDays.length > 0) {
    return today.date(futureDays[0]).toDate();
  }
  // Next month
  const nextMonth = today.add(1, 'month');
  return nextMonth.date(Math.min(days[0], nextMonth.daysInMonth())).toDate();
}
