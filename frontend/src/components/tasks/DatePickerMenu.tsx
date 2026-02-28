import { useState, useRef, useEffect } from 'react';
import { Menu, Text, Group, Divider, Box, TextInput, UnstyledButton } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import {
  IconSun,
  IconDots as IconLater,
  IconCalendarEvent,
  IconArrowForwardUp,
  IconCalendarOff,
  IconCalendar,
  IconCalendarDue,
  IconRepeat,
  IconCommand,
  IconChevronRight,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { parseDateInput } from '@/lib/dateParser';
import { getRecurrenceLabel } from '@/lib/recurrence';

dayjs.locale('ru');

interface Props {
  value: Date | null;
  onChange: (date: Date | null) => void;
  recurrence?: string | null;
  onRecurrenceChange?: (recurrence: string | null) => void;
  children: React.ReactNode;
  withinPortal?: boolean;
}

function getNextDayOfWeek(targetDay: number): Date {
  const today = dayjs();
  let diff = targetDay - today.day();
  if (diff <= 0) diff += 7;
  return today.add(diff, 'day').toDate();
}

interface QuickOption {
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  getDate: () => Date | null;
  color: string;
}

function getQuickOptions(): QuickOption[] {
  const today = dayjs();
  const tomorrow = dayjs().add(1, 'day');
  const dayOfWeek = today.day(); // 0=Sun, 1=Mon, ...

  const options: QuickOption[] = [
    {
      label: 'Сегодня',
      sublabel: today.format('dd'),
      icon: <IconCalendarDue size={18} />,
      getDate: () => today.toDate(),
      color: 'var(--mantine-color-green-6)',
    },
    {
      label: 'Завтра',
      sublabel: tomorrow.format('dd'),
      icon: <IconSun size={18} />,
      getDate: () => tomorrow.toDate(),
      color: 'var(--mantine-color-orange-5)',
    },
  ];

  // "Позже на этой неделе" — show only Mon-Wed (so there's still "later" this week)
  if (dayOfWeek >= 1 && dayOfWeek <= 3) {
    const laterDay = dayOfWeek + 2; // 2 days later
    const laterDate = dayjs().day(Math.min(laterDay, 5)); // cap at Friday
    options.push({
      label: 'Позже на этой неделе',
      sublabel: laterDate.format('dd'),
      icon: <IconLater size={18} />,
      getDate: () => laterDate.toDate(),
      color: 'var(--mantine-color-blue-5)',
    });
  }

  // "На выходных" — Saturday, only show if it's a weekday
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    const saturday = getNextDayOfWeek(6);
    options.push({
      label: 'На выходных',
      sublabel: dayjs(saturday).format('dd'),
      icon: <IconCalendarEvent size={18} />,
      getDate: () => saturday,
      color: 'var(--mantine-color-teal-5)',
    });
  }

  // "На следующей неделе" — next Monday
  const nextMonday = dayjs().add(1, 'week').startOf('week').add(1, 'day');
  options.push({
    label: 'На следующей неделе',
    sublabel: nextMonday.format('dd'),
    icon: <IconArrowForwardUp size={18} />,
    getDate: () => nextMonday.toDate(),
    color: 'var(--mantine-color-violet-5)',
  });

  return options;
}

interface RecurrenceOption {
  value: string | null;
  label: string;
}

function getRecurrenceOptions(date: Date | null): RecurrenceOption[] {
  const options: RecurrenceOption[] = [
    { value: 'daily', label: 'Каждый день' },
  ];

  if (date) {
    const d = dayjs(date);
    const isoDay = d.day() === 0 ? 7 : d.day();
    const dayNames: Record<number, string> = {
      1: 'понедельник', 2: 'вторник', 3: 'среду', 4: 'четверг',
      5: 'пятницу', 6: 'субботу', 7: 'воскресенье',
    };
    options.push({
      value: `weekly:${isoDay}`,
      label: `Каждую неделю по ${dayNames[isoDay] || ''}`,
    });
  } else {
    options.push({ value: 'weekly', label: 'Каждую неделю' });
  }

  options.push({ value: 'weekly:1,2,3,4,5', label: 'По будням (пн–пт)' });

  if (date) {
    const dayOfMonth = dayjs(date).date();
    options.push({
      value: `monthly:${dayOfMonth}`,
      label: `Каждый месяц ${dayOfMonth}-го числа`,
    });
  } else {
    options.push({ value: 'monthly', label: 'Каждый месяц' });
  }

  options.push({ value: 'yearly', label: 'Каждый год' });

  return options;
}

export function DatePickerMenu({ value, onChange, recurrence, onRecurrenceChange, children, withinPortal = true }: Props) {
  const [opened, setOpened] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [parsePreview, setParsePreview] = useState<ReturnType<typeof parseDateInput>>(null);
  const [showRecurrence, setShowRecurrence] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const quickOptions = getQuickOptions();

  useEffect(() => {
    if (opened) {
      // Focus the input after menu opens
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setInputValue('');
      setParsePreview(null);
      setShowRecurrence(false);
    }
  }, [opened]);

  const handleSelect = (date: Date | null, rec?: string | null) => {
    onChange(date);
    if (rec !== undefined && onRecurrenceChange) {
      onRecurrenceChange(rec);
    }
    setOpened(false);
  };

  const handleRecurrenceSelect = (rec: string | null) => {
    if (onRecurrenceChange) {
      onRecurrenceChange(rec);
    }
    setShowRecurrence(false);
  };

  const handleInputChange = (val: string) => {
    setInputValue(val);
    const result = parseDateInput(val);
    setParsePreview(result);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && parsePreview) {
      e.preventDefault();
      handleSelect(parsePreview.date, parsePreview.recurrence);
    }
    if (e.key === 'Escape') {
      setOpened(false);
    }
  };

  const handleApplyParsed = () => {
    if (parsePreview) {
      handleSelect(parsePreview.date, parsePreview.recurrence);
    }
  };

  const recurrenceOptions = getRecurrenceOptions(value);

  return (
    <Menu
      opened={opened}
      onChange={setOpened}
      shadow="md"
      width={280}
      position="bottom-start"
      withinPortal={withinPortal}
      closeOnItemClick={false}
    >
      <Menu.Target>
        <Box style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setOpened(!opened); }}>
          {children}
        </Box>
      </Menu.Target>
      <Menu.Dropdown>
        {/* ── Quick date input ── */}
        <Box px="xs" pt="xs" pb={4}>
          <TextInput
            ref={inputRef}
            placeholder="Напр: завтра, каждый будень"
            size="xs"
            value={inputValue}
            onChange={(e) => handleInputChange(e.currentTarget.value)}
            onKeyDown={handleInputKeyDown}
            leftSection={<IconCommand size={14} />}
            onClick={(e) => e.stopPropagation()}
          />
        </Box>

        {/* ── Parse preview ── */}
        {parsePreview && (
          <Box
            px="xs"
            pb={4}
            onClick={(e) => { e.stopPropagation(); handleApplyParsed(); }}
            style={{ cursor: 'pointer' }}
          >
            <Group
              gap={6}
              px="xs"
              py={6}
              style={{
                borderRadius: 6,
                background: 'var(--mantine-color-blue-light)',
              }}
            >
              {parsePreview.recurrence ? (
                <IconRepeat size={14} color="var(--mantine-color-blue-6)" />
              ) : (
                <IconCalendar size={14} color="var(--mantine-color-blue-6)" />
              )}
              <Box style={{ flex: 1 }}>
                <Text size="xs" fw={500} c="blue">
                  {parsePreview.label}
                </Text>
                {parsePreview.date && (
                  <Text size="xs" c="dimmed">
                    {dayjs(parsePreview.date).format('D MMM, dd')}
                  </Text>
                )}
                {parsePreview.recurrence && (
                  <Text size="xs" c="dimmed">
                    {getRecurrenceLabel(parsePreview.recurrence)}
                  </Text>
                )}
              </Box>
              <Text size="xs" c="dimmed">Enter</Text>
            </Group>
          </Box>
        )}

        <Divider />

        {/* ── Quick options ── */}
        {quickOptions.map((opt) => (
          <Menu.Item
            key={opt.label}
            leftSection={<span style={{ color: opt.color }}>{opt.icon}</span>}
            rightSection={<Text size="xs" c="dimmed">{opt.sublabel}</Text>}
            onClick={() => handleSelect(opt.getDate())}
          >
            {opt.label}
          </Menu.Item>
        ))}
        <Menu.Item
          leftSection={<span style={{ color: 'var(--mantine-color-gray-5)' }}><IconCalendarOff size={18} /></span>}
          onClick={() => handleSelect(null, null)}
        >
          Без срока
        </Menu.Item>
        <Divider />
        <Box px="xs" py="xs">
          <DatePicker
            value={value}
            onChange={(d) => handleSelect(d)}
            locale="ru"
            size="xs"
          />
        </Box>

        {/* ── Recurrence section ── */}
        {onRecurrenceChange && (
          <>
            <Divider />
            {showRecurrence ? (
              <Box py={4}>
                <Group gap={6} px="sm" py={4} mb={2}>
                  <IconRepeat size={14} color="var(--mantine-color-blue-6)" />
                  <Text size="xs" fw={600} c="blue">Повторение</Text>
                </Group>
                {recurrenceOptions.map((opt) => (
                  <UnstyledButton
                    key={opt.value ?? '__none'}
                    w="100%"
                    px="sm"
                    py={6}
                    onClick={(e) => { e.stopPropagation(); handleRecurrenceSelect(opt.value); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      borderRadius: 4,
                      background: recurrence === opt.value ? 'var(--mantine-color-blue-light)' : undefined,
                    }}
                    __vars={{
                      '--ub-hover': 'var(--mantine-color-gray-light-hover)',
                    }}
                  >
                    {recurrence === opt.value && (
                      <IconCheck size={14} color="var(--mantine-color-blue-6)" />
                    )}
                    <Text size="xs" style={{ flex: 1 }}>{opt.label}</Text>
                  </UnstyledButton>
                ))}
                {recurrence && (
                  <UnstyledButton
                    w="100%"
                    px="sm"
                    py={6}
                    onClick={(e) => { e.stopPropagation(); handleRecurrenceSelect(null); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 4 }}
                  >
                    <IconX size={14} color="var(--mantine-color-red-5)" />
                    <Text size="xs" c="red">Без повторения</Text>
                  </UnstyledButton>
                )}
              </Box>
            ) : (
              <UnstyledButton
                w="100%"
                px="sm"
                py={8}
                onClick={(e) => { e.stopPropagation(); setShowRecurrence(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <IconRepeat
                  size={18}
                  color={recurrence ? 'var(--mantine-color-blue-5)' : 'var(--mantine-color-gray-5)'}
                />
                <Text size="sm" style={{ flex: 1 }} c={recurrence ? 'blue' : undefined}>
                  {recurrence ? getRecurrenceLabel(recurrence) : 'Повторение'}
                </Text>
                <IconChevronRight size={14} color="var(--mantine-color-dimmed)" />
              </UnstyledButton>
            )}
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
