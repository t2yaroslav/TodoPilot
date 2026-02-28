import { useState, useEffect } from 'react';
import { TextInput, Select, Group, Button, Box } from '@mantine/core';
import { IconCalendar, IconTarget } from '@tabler/icons-react';
import { useTaskStore } from '@/stores/taskStore';
import { DatePickerMenu } from './DatePickerMenu';
import { toNoonUTC } from '@/lib/dates';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';

dayjs.locale('ru');

const PRIORITY_OPTIONS = [
  { value: '4', label: '🔴 Важно и срочно' },
  { value: '3', label: '🟠 Не важно и срочно' },
  { value: '2', label: '🔵 Важно, не срочно' },
  { value: '1', label: '⚪ Не важно, не срочно' },
  { value: '0', label: 'Без приоритета' },
];

interface Props {
  onClose: () => void;
  onAdded?: () => void;
  defaultDueDate?: Date;
  defaultProjectId?: string;
  defaultPriority?: number;
  defaultGoalId?: string;
  size?: 'xs' | 'sm';
  showGoal?: boolean;
}

export function InlineAddTask({
  onClose,
  onAdded,
  defaultDueDate,
  defaultProjectId,
  defaultPriority = 0,
  defaultGoalId,
  size = 'xs',
  showGoal = false,
}: Props) {
  const { addTask, projects, goals, fetchGoals, refreshAllCounts } = useTaskStore();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState(String(defaultPriority));
  const [dueDate, setDueDate] = useState<Date | null>(defaultDueDate || null);
  const [projectId, setProjectId] = useState<string | null>(defaultProjectId || null);
  const [goalId, setGoalId] = useState<string | null>(defaultGoalId || null);
  const [recurrence, setRecurrence] = useState<string | null>(null);

  useEffect(() => {
    if (showGoal && goals.length === 0) fetchGoals();
  }, [showGoal]);

  useEffect(() => {
    setDueDate(defaultDueDate || null);
    setProjectId(defaultProjectId || null);
    setPriority(String(defaultPriority));
    setGoalId(defaultGoalId || null);
  }, [defaultDueDate, defaultProjectId, defaultPriority, defaultGoalId]);

  const handleAdd = async () => {
    if (!title.trim()) return;
    await addTask({
      title: title.trim(),
      priority: parseInt(priority),
      due_date: dueDate ? toNoonUTC(dueDate) : null,
      project_id: projectId || null,
      goal_id: goalId || null,
      recurrence: recurrence || null,
    });
    refreshAllCounts();
    setTitle('');
    setPriority(String(defaultPriority));
    setDueDate(defaultDueDate || null);
    setProjectId(defaultProjectId || null);
    setGoalId(defaultGoalId || null);
    setRecurrence(null);
    onAdded?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') onClose();
  };

  return (
    <Box>
      <TextInput
        placeholder="Название задачи"
        value={title}
        onChange={(e) => setTitle(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        mb="xs"
        size={size}
      />
      <Group gap="xs">
        <Select
          size={size}
          value={priority}
          onChange={(v) => setPriority(v || '0')}
          data={PRIORITY_OPTIONS}
          w={size === 'xs' ? 160 : 180}
        />
        <DatePickerMenu
          value={dueDate}
          onChange={setDueDate}
          recurrence={recurrence}
          onRecurrenceChange={setRecurrence}
        >
          <Button
            size={size}
            variant="default"
            leftSection={<IconCalendar size={size === 'xs' ? 14 : 16} />}
          >
            {dueDate ? dayjs(dueDate).format('D MMM') : 'Дата'}
          </Button>
        </DatePickerMenu>
        {projects.length > 0 && (
          <Select
            size={size}
            placeholder="Проект"
            value={projectId}
            onChange={setProjectId}
            data={projects.map((p) => ({ value: p.id, label: p.title }))}
            clearable
            w={size === 'xs' ? 140 : 160}
          />
        )}
        {showGoal && goals.length > 0 && (
          <Select
            size={size}
            placeholder="Цель"
            value={goalId}
            onChange={setGoalId}
            data={goals.map((g) => ({ value: g.id, label: g.title }))}
            leftSection={<IconTarget size={14} />}
            clearable
            w={size === 'xs' ? 140 : 160}
          />
        )}
      </Group>
      <Group gap="xs" mt="xs">
        <Button size={size} variant="default" onClick={onClose}>Отмена</Button>
        <Button size={size} onClick={handleAdd}>Добавить задачу</Button>
      </Group>
    </Box>
  );
}
