import { useEffect, useState, useRef, useCallback } from 'react';
import { Modal, TextInput, Textarea, Select, Group, Button, Stack, Text, Box, Grid, Divider } from '@mantine/core';
import { IconCalendar, IconRepeat, IconHash, IconFlag, IconTarget, IconFolder } from '@tabler/icons-react';
import { Task, useTaskStore } from '@/stores/taskStore';
import { DatePickerMenu } from './DatePickerMenu';
import { toNoonUTC } from '@/lib/dates';
import { getRecurrenceLabel } from '@/lib/recurrence';
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
  task: Task | null;
  onClose: () => void;
  filterParams?: Record<string, unknown>;
  sectionTitle?: string;
  sectionIcon?: React.ReactNode;
}

export function TaskEditModal({ task, onClose, filterParams, sectionTitle, sectionIcon }: Props) {
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

  // Dynamic title: project name with icon, or section name with icon
  const taskProject = task?.project_id ? projects.find((p) => p.id === task.project_id) : null;
  const modalTitle = taskProject ? (
    <Group gap={6}>
      <IconHash size={18} color={taskProject.color} />
      <Text size="sm" fw={500}>{taskProject.title}</Text>
    </Group>
  ) : sectionTitle ? (
    <Group gap={6}>
      {sectionIcon}
      <Text size="sm" fw={500}>{sectionTitle}</Text>
    </Group>
  ) : null;

  const selectedProject = projectId ? projects.find((p) => p.id === projectId) : null;

  const projectData = projects.map((p) => ({
    value: p.id,
    label: p.title,
  }));

  return (
    <Modal
      opened={!!task}
      onClose={onClose}
      title={modalTitle}
      size={800}
      styles={{
        body: { minHeight: 400 },
        header: { borderBottom: '1px solid var(--mantine-color-default-border)', paddingBottom: 12 },
      }}
    >
      <Grid gutter="lg" pt="md">
        {/* Left: title + description */}
        <Grid.Col span={7}>
          <Stack gap="md">
            <TextInput
              placeholder="Название задачи"
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              variant="unstyled"
              styles={{
                input: {
                  fontWeight: 600,
                  fontSize: '18px',
                  borderBottom: '1px solid var(--mantine-color-default-border)',
                  borderRadius: 0,
                  paddingBottom: 8,
                },
              }}
            />
            <Textarea
              placeholder="Добавить описание..."
              value={description}
              onChange={handleDescriptionChange}
              autosize
              minRows={6}
              maxRows={14}
              variant="filled"
              size="sm"
              styles={{
                input: {
                  backgroundColor: 'var(--mantine-color-default-hover)',
                },
              }}
            />
            {descriptionDirty && (
              <Group gap="xs" justify="flex-end">
                <Button size="xs" variant="default" onClick={handleDescriptionCancel}>Отмена</Button>
                <Button size="xs" onClick={handleDescriptionSave}>Сохранить</Button>
              </Group>
            )}
          </Stack>
        </Grid.Col>

        {/* Right sidebar: settings */}
        <Grid.Col span={5}>
          <Stack
            gap={0}
            style={{
              border: '1px solid var(--mantine-color-default-border)',
              borderRadius: 'var(--mantine-radius-md)',
              overflow: 'hidden',
            }}
          >
            {/* Priority */}
            <Group
              gap="sm"
              px="sm"
              py="xs"
              style={{ cursor: 'pointer' }}
            >
              <IconFlag size={16} color="var(--mantine-color-dimmed)" />
              <Box style={{ flex: 1 }}>
                <Select
                  value={priority}
                  onChange={handlePriorityChange}
                  data={PRIORITY_OPTIONS}
                  variant="unstyled"
                  size="sm"
                  styles={{ input: { fontWeight: 500 } }}
                />
              </Box>
            </Group>

            <Divider />

            {/* Due date */}
            <Box px="sm" py="xs">
              <DatePickerMenu
                value={dueDate}
                onChange={handleDateChange}
                recurrence={recurrence}
                onRecurrenceChange={handleRecurrenceChange}
              >
                <Group gap="sm" style={{ cursor: 'pointer' }} wrap="nowrap">
                  <IconCalendar size={16} color="var(--mantine-color-dimmed)" />
                  <Text size="sm" fw={500} c={dueDate ? undefined : 'dimmed'}>
                    {dueDate ? dayjs(dueDate).format('D MMMM') : 'Срок'}
                  </Text>
                  {recurrence && (
                    <>
                      <IconRepeat size={14} color="var(--mantine-color-blue-5)" />
                      <Text size="xs" c="blue">
                        {getRecurrenceLabel(recurrence)}
                      </Text>
                    </>
                  )}
                </Group>
              </DatePickerMenu>
            </Box>

            <Divider />

            {/* Project */}
            <Group gap="sm" px="sm" py="xs">
              <IconHash
                size={16}
                color={selectedProject?.color || 'var(--mantine-color-dimmed)'}
              />
              <Box style={{ flex: 1 }}>
                <Select
                  value={projectId}
                  onChange={handleProjectChange}
                  data={projectData}
                  clearable
                  placeholder="Проект"
                  variant="unstyled"
                  size="sm"
                  styles={{ input: { fontWeight: 500 } }}
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
              </Box>
            </Group>

            <Divider />

            {/* Goal */}
            <Group gap="sm" px="sm" py="xs">
              <IconTarget size={16} color="var(--mantine-color-dimmed)" />
              <Box style={{ flex: 1 }}>
                <Select
                  value={goalId}
                  onChange={handleGoalChange}
                  data={goals.map((g) => ({ value: g.id, label: g.title }))}
                  clearable
                  placeholder="Цель"
                  variant="unstyled"
                  size="sm"
                  styles={{ input: { fontWeight: 500 } }}
                />
              </Box>
            </Group>
          </Stack>
        </Grid.Col>
      </Grid>
    </Modal>
  );
}
