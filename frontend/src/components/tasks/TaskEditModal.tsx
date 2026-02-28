import { useEffect, useState } from 'react';
import {
  Modal, TextInput, Textarea, Select, Group, Button, Stack, Text, Box, Divider,
} from '@mantine/core';
import {
  IconCalendar, IconRepeat, IconFlagFilled, IconFolder, IconTarget,
} from '@tabler/icons-react';
import { Task, useTaskStore } from '@/stores/taskStore';
import { DatePickerMenu } from './DatePickerMenu';
import { toNoonUTC } from '@/lib/dates';
import { getRecurrenceLabel } from '@/lib/recurrence';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';

dayjs.locale('ru');

const PRIORITY_OPTIONS = [
  { value: '4', label: '🔴 Важно и срочно' },
  { value: '3', label: '🟠 Срочно' },
  { value: '2', label: '🔵 Важно' },
  { value: '1', label: '⚪ Обычная' },
  { value: '0', label: '— Без приоритета' },
];

const PRIORITY_COLORS: Record<string, string> = {
  '4': 'var(--mantine-color-red-5)',
  '3': 'var(--mantine-color-orange-5)',
  '2': 'var(--mantine-color-blue-5)',
  '1': 'var(--mantine-color-gray-5)',
  '0': 'var(--mantine-color-gray-4)',
};

function SidebarLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text size="xs" c="dimmed" fw={500} tt="uppercase" mb={4} style={{ letterSpacing: '0.03em' }}>
      {children}
    </Text>
  );
}

interface Props {
  task: Task | null;
  onClose: () => void;
  filterParams?: Record<string, unknown>;
}

export function TaskEditModal({ task, onClose, filterParams }: Props) {
  const { editTask, fetchTasks, refreshAllCounts, projects, goals, fetchGoals } = useTaskStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('0');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(String(task.priority));
      setDueDate(task.due_date ? new Date(task.due_date) : null);
      setProjectId(task.project_id);
      setGoalId(task.goal_id);
      setRecurrence(task.recurrence);
      if (goals.length === 0) fetchGoals();
    }
  }, [task]);

  const handleSave = async () => {
    if (!task) return;
    await editTask(task.id, {
      title,
      description: description || null,
      priority: parseInt(priority),
      due_date: dueDate ? toNoonUTC(dueDate) : null,
      project_id: projectId,
      goal_id: goalId,
      recurrence: recurrence || null,
    });
    fetchTasks(filterParams);
    refreshAllCounts();
    onClose();
  };

  return (
    <Modal
      opened={!!task}
      onClose={onClose}
      title="Редактирование задачи"
      size={820}
      styles={{ body: { padding: '0 16px 16px' } }}
    >
      <Group align="flex-start" gap={0} wrap="nowrap">
        {/* ── Left: title + description ── */}
        <Stack gap="sm" style={{ flex: 1, minWidth: 0 }} pr="md">
          <TextInput
            placeholder="Название задачи"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            size="md"
            styles={{ input: { fontWeight: 500, border: 'none', borderBottom: '1px solid var(--mantine-color-default-border)', borderRadius: 0, paddingLeft: 0 } }}
          />
          <Textarea
            placeholder="Заметка..."
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            minRows={2}
            maxRows={2}
            size="sm"
            styles={{ input: { border: 'none', resize: 'none', paddingLeft: 0 } }}
          />
        </Stack>

        <Divider orientation="vertical" mx="sm" />

        {/* ── Right: settings sidebar ── */}
        <Stack gap="xs" w={210} style={{ flexShrink: 0 }}>
          {/* Срок */}
          <Box>
            <SidebarLabel>Срок</SidebarLabel>
            <DatePickerMenu
              value={dueDate}
              onChange={setDueDate}
              recurrence={recurrence}
              onRecurrenceChange={setRecurrence}
              withinPortal={false}
            >
              <Button
                variant="subtle"
                color={dueDate ? undefined : 'gray'}
                size="xs"
                leftSection={
                  recurrence
                    ? <IconRepeat size={14} color="var(--mantine-color-blue-5)" />
                    : <IconCalendar size={14} />
                }
                styles={{ inner: { justifyContent: 'flex-start' }, root: { paddingLeft: 6 } }}
                fullWidth
              >
                {dueDate ? dayjs(dueDate).format('D MMM') : 'Не указан'}
                {recurrence && (
                  <Text size="xs" c="blue" component="span" ml={4}>
                    · {getRecurrenceLabel(recurrence)}
                  </Text>
                )}
              </Button>
            </DatePickerMenu>
          </Box>

          {/* Приоритет */}
          <Box>
            <SidebarLabel>Приоритет</SidebarLabel>
            <Select
              size="xs"
              value={priority}
              onChange={(v) => setPriority(v || '0')}
              data={PRIORITY_OPTIONS}
              leftSection={
                <IconFlagFilled size={13} color={PRIORITY_COLORS[priority]} />
              }
              styles={{ input: { paddingLeft: 28 } }}
            />
          </Box>

          {/* Проект */}
          <Box>
            <SidebarLabel>Проект</SidebarLabel>
            <Select
              size="xs"
              value={projectId}
              onChange={setProjectId}
              data={projects.map((p) => ({ value: p.id, label: p.title }))}
              clearable
              placeholder="Без проекта"
              leftSection={<IconFolder size={13} />}
              styles={{ input: { paddingLeft: 28 } }}
            />
          </Box>

          {/* Цель */}
          <Box>
            <SidebarLabel>Цель</SidebarLabel>
            <Select
              size="xs"
              value={goalId}
              onChange={setGoalId}
              data={goals.map((g) => ({ value: g.id, label: g.title }))}
              clearable
              placeholder="Без цели"
              leftSection={<IconTarget size={13} />}
              styles={{ input: { paddingLeft: 28 } }}
            />
          </Box>
        </Stack>
      </Group>

      <Group justify="flex-end" mt="md" pt="sm" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
        <Button variant="subtle" onClick={onClose} size="sm">Отмена</Button>
        <Button onClick={handleSave} size="sm">Сохранить</Button>
      </Group>
    </Modal>
  );
}
