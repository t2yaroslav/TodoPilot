import { useState, useEffect } from 'react';
import { TextInput, Select, Group, Button, Box, Stack } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconCalendar, IconHash } from '@tabler/icons-react';
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
}

export function InlineAddTask({
  onClose,
  onAdded,
  defaultDueDate,
  defaultProjectId,
  defaultPriority = 0,
  defaultGoalId,
}: Props) {
  const { addTask, projects, goals, fetchGoals, refreshAllCounts } = useTaskStore();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState(String(defaultPriority));
  const [dueDate, setDueDate] = useState<Date | null>(defaultDueDate || null);
  const [projectId, setProjectId] = useState<string | null>(defaultProjectId || null);
  const [goalId, setGoalId] = useState<string | null>(defaultGoalId || null);
  const [recurrence, setRecurrence] = useState<string | null>(null);

  useEffect(() => {
    if (goals.length === 0) fetchGoals();
  }, []);

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

  const isMobile = useMediaQuery('(max-width: 768px)');
  const selectedProject = projectId ? projects.find((p) => p.id === projectId) : null;

  const projectData = projects.map((p) => ({
    value: p.id,
    label: p.title,
  }));

  const inputSize = isMobile ? 'sm' : 'xs';

  return (
    <Box>
      <TextInput
        placeholder="Название задачи"
        value={title}
        onChange={(e) => setTitle(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        mb="xs"
        size={inputSize}
      />
      {isMobile ? (
        <Stack gap="xs">
          <Select
            size={inputSize}
            value={priority}
            onChange={(v) => setPriority(v || '0')}
            data={PRIORITY_OPTIONS}
          />
          <DatePickerMenu
            value={dueDate}
            onChange={setDueDate}
            recurrence={recurrence}
            onRecurrenceChange={setRecurrence}
          >
            <Button
              size={inputSize}
              variant="default"
              leftSection={<IconCalendar size={16} />}
              fullWidth
            >
              {dueDate ? dayjs(dueDate).format('D MMM') : 'Дата'}
            </Button>
          </DatePickerMenu>
          {projects.length > 0 && (
            <Select
              size={inputSize}
              placeholder="Проект"
              value={projectId}
              onChange={setProjectId}
              data={projectData}
              clearable
              leftSection={
                selectedProject
                  ? <IconHash size={16} color={selectedProject.color} />
                  : <IconHash size={16} color="var(--mantine-color-dimmed)" />
              }
              renderOption={({ option }) => {
                const p = projects.find((pr) => pr.id === option.value);
                return (
                  <Group gap={6} wrap="nowrap">
                    <IconHash size={14} color={p?.color} style={{ flexShrink: 0 }} />
                    <span>{option.label}</span>
                  </Group>
                );
              }}
            />
          )}
          <Group gap="xs" justify="flex-end">
            <Button size={inputSize} variant="default" onClick={onClose}>Отмена</Button>
            <Button size={inputSize} onClick={handleAdd}>Добавить задачу</Button>
          </Group>
        </Stack>
      ) : (
        <Group gap="xs" wrap="nowrap">
          <Select
            size="xs"
            value={priority}
            onChange={(v) => setPriority(v || '0')}
            data={PRIORITY_OPTIONS}
            w={160}
          />
          <DatePickerMenu
            value={dueDate}
            onChange={setDueDate}
            recurrence={recurrence}
            onRecurrenceChange={setRecurrence}
          >
            <Button
              size="xs"
              variant="default"
              leftSection={<IconCalendar size={14} />}
            >
              {dueDate ? dayjs(dueDate).format('D MMM') : 'Дата'}
            </Button>
          </DatePickerMenu>
          {projects.length > 0 && (
            <Select
              size="xs"
              placeholder="Проект"
              value={projectId}
              onChange={setProjectId}
              data={projectData}
              clearable
              w={160}
              leftSection={
                selectedProject
                  ? <IconHash size={14} color={selectedProject.color} />
                  : <IconHash size={14} color="var(--mantine-color-dimmed)" />
              }
              renderOption={({ option }) => {
                const p = projects.find((pr) => pr.id === option.value);
                return (
                  <Group gap={6} wrap="nowrap">
                    <IconHash size={14} color={p?.color} style={{ flexShrink: 0 }} />
                    <span>{option.label}</span>
                  </Group>
                );
              }}
            />
          )}
          <Box style={{ flex: 1 }} />
          <Button size="xs" variant="default" onClick={onClose}>Отмена</Button>
          <Button size="xs" onClick={handleAdd}>Добавить задачу</Button>
        </Group>
      )}
    </Box>
  );
}
