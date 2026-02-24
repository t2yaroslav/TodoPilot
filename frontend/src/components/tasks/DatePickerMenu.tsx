import { useState } from 'react';
import { Menu, Text, Group, Divider, Box } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import {
  IconSun,
  IconDots as IconLater,
  IconCalendarEvent,
  IconArrowForwardUp,
  IconCalendarOff,
  IconCalendar,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';

dayjs.locale('ru');

interface Props {
  value: Date | null;
  onChange: (date: Date | null) => void;
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
  const tomorrow = dayjs().add(1, 'day');
  const today = dayjs();
  const dayOfWeek = today.day(); // 0=Sun, 1=Mon, ...

  const options: QuickOption[] = [
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

export function DatePickerMenu({ value, onChange, children, withinPortal = true }: Props) {
  const [opened, setOpened] = useState(false);
  const quickOptions = getQuickOptions();

  const handleSelect = (date: Date | null) => {
    onChange(date);
    setOpened(false);
  };

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
          onClick={() => handleSelect(null)}
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
      </Menu.Dropdown>
    </Menu>
  );
}
