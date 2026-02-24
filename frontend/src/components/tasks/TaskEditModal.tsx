import { useEffect, useState } from 'react';
import { Modal, TextInput, Textarea, Select, Group, Button, Stack, Text, Box } from '@mantine/core';
import { IconCalendar, IconRepeat } from '@tabler/icons-react';
import { Task, useTaskStore } from '@/stores/taskStore';
import { DatePickerMenu } from './DatePickerMenu';
import { toNoonUTC } from '@/lib/dates';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';

dayjs.locale('ru');

const RECURRENCE_OPTIONS = [
  { value: '', label: 'Без повторения' },
  { value: 'daily', label: 'Ежедневно' },
  { value: 'weekly', label: 'Еженедельно' },
  { value: 'biweekly', label: 'Раз в 2 недели' },
  { value: 'monthly', label: 'Ежемесячно' },
  { value: 'yearly', label: 'Ежегодно' },
];

const RECURRENCE_LABELS: Record<string, string> = {
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  biweekly: 'Раз в 2 недели',
  monthly: 'Ежемесячно',
  yearly: 'Ежегодно',
};

interface Props {
  task: Task | null;
  onClose: () => void;
  filterParams?: Record<string, unknown>;
}

export function TaskEditModal({ task, onClose, filterParams }: Props) {
  const { editTask, fetchTasks, refreshAllCounts, projects, goals } = useTaskStore();
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
    <Modal opened={!!task} onClose={onClose} title="Редактирование задачи" size={800}>
      <Stack>
        <TextInput label="Название" value={title} onChange={(e) => setTitle(e.currentTarget.value)} />
        <Textarea label="Описание" value={description} onChange={(e) => setDescription(e.currentTarget.value)} autosize minRows={2} />
        <Group grow>
          <Select
            label="Приоритет"
            value={priority}
            onChange={(v) => setPriority(v || '0')}
            data={[
              { value: '0', label: 'Без приоритета' },
              { value: '1', label: '⚪ Не важно, не срочно' },
              { value: '2', label: '🔵 Важно, не срочно' },
              { value: '3', label: '🟠 Не важно и срочно' },
              { value: '4', label: '🔴 Важно и срочно' },
            ]}
          />
          <Box>
            <Text size="sm" fw={500} mb={4}>Срок</Text>
            <DatePickerMenu value={dueDate} onChange={setDueDate}>
              <Button
                variant="default"
                leftSection={<IconCalendar size={16} />}
                fullWidth
                styles={{ inner: { justifyContent: 'flex-start' } }}
              >
                {dueDate ? dayjs(dueDate).format('D MMM') : 'Выбрать дату'}
              </Button>
            </DatePickerMenu>
          </Box>
        </Group>
        <Group grow>
          <Select
            label="Повторение"
            value={recurrence || ''}
            onChange={(v) => setRecurrence(v || null)}
            data={RECURRENCE_OPTIONS}
            leftSection={<IconRepeat size={16} />}
          />
          {recurrence && dueDate && (
            <Box>
              <Text size="sm" fw={500} mb={4}>&nbsp;</Text>
              <Group gap={4}>
                <IconRepeat size={14} color="var(--mantine-color-blue-5)" />
                <Text size="sm" c="blue">
                  {RECURRENCE_LABELS[recurrence]}
                </Text>
              </Group>
            </Box>
          )}
        </Group>
        <Group grow>
          {projects.length > 0 && (
            <Select
              label="Проект"
              value={projectId}
              onChange={setProjectId}
              data={projects.map((p) => ({ value: p.id, label: p.title }))}
              clearable
            />
          )}
          {goals.length > 0 && (
            <Select
              label="Цель"
              value={goalId}
              onChange={setGoalId}
              data={goals.map((g) => ({ value: g.id, label: g.title }))}
              clearable
            />
          )}
        </Group>
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>Отмена</Button>
          <Button onClick={handleSave}>Сохранить</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
