import { useEffect, useState } from 'react';
import { Stack, Text, TextInput, Group, Button, Box, Select } from '@mantine/core';
import { IconPlus, IconCalendar, IconCircleFilled } from '@tabler/icons-react';
import { Task, useTaskStore } from '@/stores/taskStore';
import { TaskItem } from './TaskItem';
import { TaskEditModal } from './TaskEditModal';
import { DatePickerMenu } from './DatePickerMenu';
import { toNoonUTC } from '@/lib/dates';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';

dayjs.locale('ru');

const PRIORITY_GROUPS = [
  { priority: 4, label: 'Важно и срочно', emoji: '🔴', color: 'var(--mantine-color-red-6)' },
  { priority: 3, label: 'Срочно', emoji: '🟠', color: 'var(--mantine-color-orange-6)' },
  { priority: 2, label: 'Важно', emoji: '🔵', color: 'var(--mantine-color-blue-6)' },
  { priority: 1, label: 'Не важно, не срочно', emoji: '⚪', color: 'var(--mantine-color-gray-6)' },
  { priority: 0, label: 'Без приоритета', emoji: '', color: 'var(--mantine-color-gray-5)' },
];

const PRIORITY_OPTIONS = [
  { value: '4', label: '🔴 Важно и срочно' },
  { value: '3', label: '🟠 Не важно и срочно' },
  { value: '2', label: '🔵 Важно, не срочно' },
  { value: '1', label: '⚪ Не важно, не срочно' },
  { value: '0', label: 'Без приоритета' },
];

interface Props {
  filterParams?: Record<string, unknown>;
  defaultDueDate?: Date;
}

export function PriorityTaskList({ filterParams, defaultDueDate }: Props) {
  const { tasks, loading, fetchTasks, addTask, projects, refreshAllCounts } = useTaskStore();
  const [addingForPriority, setAddingForPriority] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('0');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchTasks(filterParams);
  }, [JSON.stringify(filterParams)]);

  const handleStartAdding = (groupPriority: number) => {
    setAddingForPriority(groupPriority);
    setPriority(String(groupPriority));
    setDueDate(defaultDueDate || null);
    setTitle('');
    setProjectId(null);
    setRecurrence(null);
  };

  const handleAdd = async () => {
    if (!title.trim() || addingForPriority === null) return;
    await addTask({
      title: title.trim(),
      priority: parseInt(priority),
      due_date: dueDate ? toNoonUTC(dueDate) : null,
      project_id: projectId || null,
      recurrence: recurrence || null,
    });
    refreshAllCounts();
    setTitle('');
    setPriority('0');
    setDueDate(null);
    setProjectId(null);
    setRecurrence(null);
    setAddingForPriority(null);
    fetchTasks(filterParams);
  };

  const activeTasks = tasks.filter((t) => !t.completed);

  const hidePriorityHeaders =
    activeTasks.length > 0 &&
    activeTasks.every((t) => t.priority === 0);

  const visibleGroups = PRIORITY_GROUPS.filter(
    (g) =>
      activeTasks.some((t) => t.priority === g.priority) ||
      addingForPriority === g.priority,
  );

  const isTodayPage = Boolean(defaultDueDate);

  return (
    <Stack gap={0}>
      {visibleGroups.map((group) => {
        const groupTasks = activeTasks.filter(
          (t) => t.priority === group.priority,
        );

        return (
          <Box key={group.priority} mb="xs">
            {!(hidePriorityHeaders && group.priority === 0) && (
              <Group gap={6} px="sm" py={6}>
                {group.emoji ? (
                  <Text size="xs" lh={1}>{group.emoji}</Text>
                ) : (
                  <IconCircleFilled
                    size={10}
                    color={group.color}
                    style={{ opacity: 0.5 }}
                  />
                )}
                <Text size="sm" fw={600}>
                  {group.label}
                </Text>
              </Group>
            )}

            {groupTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onEdit={setEditingTask}
                filterParams={filterParams}
                isTodayPage={isTodayPage}
              />
            ))}

            {addingForPriority === group.priority ? (
              <Box
                px="sm"
                py="xs"
                style={{
                  borderBottom: '1px solid var(--mantine-color-default-border)',
                }}
              >
                <TextInput
                  placeholder="Название задачи"
                  value={title}
                  onChange={(e) => setTitle(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAdd();
                    if (e.key === 'Escape') setAddingForPriority(null);
                  }}
                  autoFocus
                  mb="xs"
                />
                <Group gap="xs">
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
                      leftSection={<IconCalendar size={14}/>}
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
                      data={projects.map((p) => ({
                        value: p.id,
                        label: p.title,
                      }))}
                      clearable
                      w={140}
                    />
                  )}

                  <Button size="xs" onClick={handleAdd}>
                    Добавить
                  </Button>

                  <Button
                    size="xs"
                    variant="subtle"
                    onClick={() => setAddingForPriority(null)}
                  >
                    Отмена
                  </Button>
                </Group>
              </Box>
            ) : (
              <Group
                gap="xs"
                py={4}
                px="sm"
                style={{ cursor: 'pointer', opacity: 0.5 }}
                onClick={() => handleStartAdding(group.priority)}
              >
                <IconPlus size={14}/>
                <Text size="xs">Добавить задачу</Text>
              </Group>
            )}
          </Box>
        );
      })}

      {!loading && activeTasks.length === 0 && addingForPriority === null && (
        <Box ta="center" py="xl">
          <Text size="sm" c="dimmed" mb="sm">
            Нет задач на сегодня
          </Text>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconPlus size={14}/>}
            onClick={() => handleStartAdding(0)}
          >
            Добавить задачу
          </Button>
        </Box>
      )}

      <TaskEditModal
        task={editingTask}
        onClose={() => setEditingTask(null)}
        filterParams={filterParams}
      />
    </Stack>
  );
}
