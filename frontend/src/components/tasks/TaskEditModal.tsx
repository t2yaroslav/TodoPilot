import { useEffect, useState, useRef, useCallback } from 'react';
import { Modal, TextInput, Textarea, Select, Group, Button, Stack, Text, Box, Grid } from '@mantine/core';
import { IconCalendar, IconRepeat } from '@tabler/icons-react';
import { Task, useTaskStore } from '@/stores/taskStore';
import { DatePickerMenu } from './DatePickerMenu';
import { toNoonUTC } from '@/lib/dates';
import { getRecurrenceLabel } from '@/lib/recurrence';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';

dayjs.locale('ru');

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
  const [descriptionDirty, setDescriptionDirty] = useState(false);
  const originalDescription = useRef('');
  const titleBlurTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      originalDescription.current = task.description || '';
      setPriority(String(task.priority));
      setDueDate(task.due_date ? new Date(task.due_date) : null);
      setProjectId(task.project_id);
      setGoalId(task.goal_id);
      setRecurrence(task.recurrence);
      setDescriptionDirty(false);
      if (goals.length === 0) fetchGoals();
    }
  }, [task]);

  const autoSave = useCallback(async (field: string, value: unknown) => {
    if (!task) return;
    await editTask(task.id, { [field]: value });
    fetchTasks(filterParams);
    refreshAllCounts();
  }, [task, editTask, fetchTasks, refreshAllCounts, filterParams]);

  const handleTitleBlur = () => {
    if (!task || title.trim() === task.title) return;
    if (titleBlurTimeout.current) clearTimeout(titleBlurTimeout.current);
    titleBlurTimeout.current = setTimeout(() => {
      if (title.trim()) {
        autoSave('title', title.trim());
      }
    }, 150);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  };

  const handlePriorityChange = (v: string | null) => {
    const newVal = v || '0';
    setPriority(newVal);
    autoSave('priority', parseInt(newVal));
  };

  const handleDateChange = (date: Date | null) => {
    setDueDate(date);
    autoSave('due_date', date ? toNoonUTC(date) : null);
  };

  const handleRecurrenceChange = (rec: string | null) => {
    setRecurrence(rec);
    autoSave('recurrence', rec || null);
  };

  const handleProjectChange = (v: string | null) => {
    setProjectId(v);
    autoSave('project_id', v);
  };

  const handleGoalChange = (v: string | null) => {
    setGoalId(v);
    autoSave('goal_id', v);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.currentTarget.value;
    setDescription(newVal);
    setDescriptionDirty(newVal !== originalDescription.current);
  };

  const handleDescriptionSave = async () => {
    if (!task) return;
    await editTask(task.id, { description: description || null });
    originalDescription.current = description;
    setDescriptionDirty(false);
    fetchTasks(filterParams);
    refreshAllCounts();
  };

  const handleDescriptionCancel = () => {
    setDescription(originalDescription.current);
    setDescriptionDirty(false);
  };

  return (
    <Modal opened={!!task} onClose={onClose} title="Редактирование задачи" size={800}>
      <Grid gutter="lg">
        <Grid.Col span={7}>
          <Stack gap="sm">
            <TextInput
              placeholder="Название задачи"
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              styles={{ input: { fontWeight: 500, fontSize: '16px' } }}
            />
            <Textarea
              placeholder="Описание"
              value={description}
              onChange={handleDescriptionChange}
              autosize
              minRows={3}
              maxRows={10}
              size="sm"
            />
            {descriptionDirty && (
              <Group gap="xs">
                <Button size="xs" variant="default" onClick={handleDescriptionCancel}>Отмена</Button>
                <Button size="xs" onClick={handleDescriptionSave}>Сохранить</Button>
              </Group>
            )}
          </Stack>
        </Grid.Col>

        <Grid.Col span={5}>
          <Stack gap="sm">
            <Select
              label="Приоритет"
              value={priority}
              onChange={handlePriorityChange}
              data={[
                { value: '4', label: '🔴 Важно и срочно' },
                { value: '3', label: '🟠 Не важно и срочно' },
                { value: '2', label: '🔵 Важно, не срочно' },
                { value: '1', label: '⚪ Не важно, не срочно' },
                { value: '0', label: 'Без приоритета' },
              ]}
            />
            <Box>
              <Text size="sm" fw={500} mb={4}>Срок</Text>
              <DatePickerMenu
                value={dueDate}
                onChange={handleDateChange}
                recurrence={recurrence}
                onRecurrenceChange={handleRecurrenceChange}
              >
                <Button
                  variant="default"
                  leftSection={<IconCalendar size={16} />}
                  fullWidth
                  styles={{ inner: { justifyContent: 'flex-start' } }}
                >
                  {dueDate ? dayjs(dueDate).format('D MMM') : 'Выбрать дату'}
                  {recurrence && (
                    <Group gap={4} ml={8}>
                      <IconRepeat size={14} color="var(--mantine-color-blue-5)" />
                      <Text size="xs" c="blue" component="span">
                        {getRecurrenceLabel(recurrence)}
                      </Text>
                    </Group>
                  )}
                </Button>
              </DatePickerMenu>
            </Box>
            <Select
              label="Проект"
              value={projectId}
              onChange={handleProjectChange}
              data={projects.map((p) => ({ value: p.id, label: p.title }))}
              clearable
              placeholder="Без проекта"
            />
            <Select
              label="Цель"
              value={goalId}
              onChange={handleGoalChange}
              data={goals.map((g) => ({ value: g.id, label: g.title }))}
              clearable
              placeholder="Без цели"
            />
          </Stack>
        </Grid.Col>
      </Grid>
    </Modal>
  );
}
