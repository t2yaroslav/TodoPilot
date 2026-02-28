import { useEffect, useState } from 'react';
import { Stack, Text, Group, Button, Box } from '@mantine/core';
import { IconPlus, IconCircleFilled } from '@tabler/icons-react';
import { Task, useTaskStore } from '@/stores/taskStore';
import { TaskItem } from './TaskItem';
import { TaskEditModal } from './TaskEditModal';
import { InlineAddTask } from './InlineAddTask';

const PRIORITY_GROUPS = [
  { priority: 4, label: 'Важно и срочно', emoji: '🔴', color: 'var(--mantine-color-red-6)' },
  { priority: 3, label: 'Срочно', emoji: '🟠', color: 'var(--mantine-color-orange-6)' },
  { priority: 2, label: 'Важно', emoji: '🔵', color: 'var(--mantine-color-blue-6)' },
  { priority: 1, label: 'Не важно, не срочно', emoji: '⚪', color: 'var(--mantine-color-gray-6)' },
  { priority: 0, label: 'Без приоритета', emoji: '', color: 'var(--mantine-color-gray-5)' },
];

interface Props {
  filterParams?: Record<string, unknown>;
  defaultDueDate?: Date;
}

export function PriorityTaskList({ filterParams, defaultDueDate }: Props) {
  const { tasks, loading, fetchTasks } = useTaskStore();
  const [addingForPriority, setAddingForPriority] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchTasks(filterParams);
  }, [JSON.stringify(filterParams)]);

  const handleAdded = () => {
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
                <InlineAddTask
                  onClose={() => setAddingForPriority(null)}
                  onAdded={handleAdded}
                  defaultDueDate={defaultDueDate}
                  defaultPriority={group.priority}
                />
              </Box>
            ) : (
              <Group
                gap="xs"
                py={4}
                px="sm"
                style={{ cursor: 'pointer', opacity: 0.5 }}
                onClick={() => setAddingForPriority(group.priority)}
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
            onClick={() => setAddingForPriority(0)}
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
