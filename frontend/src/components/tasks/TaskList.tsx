import { useEffect, useState } from 'react';
import { Stack, Text, Group, Box } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { Task, useTaskStore } from '@/stores/taskStore';
import { TaskItem } from './TaskItem';
import { TaskEditModal } from './TaskEditModal';
import { InlineAddTask } from './InlineAddTask';

interface Props {
  filterParams?: Record<string, unknown>;
  showAddButton?: boolean;
  defaultDueDate?: Date;
}

export function TaskList({ filterParams, showAddButton = true, defaultDueDate }: Props) {
  const { tasks, loading, fetchTasks } = useTaskStore();
  const [adding, setAdding] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchTasks(filterParams);
  }, [JSON.stringify(filterParams)]);

  const handleAdded = () => {
    setAdding(false);
    fetchTasks(filterParams);
  };

  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <Stack gap={0}>
      {activeTasks.map((task) => (
        <TaskItem key={task.id} task={task} onEdit={setEditingTask} filterParams={filterParams} />
      ))}

      {showAddButton && !adding && (
        <Group
          gap="xs"
          py={6}
          px="sm"
          style={{ cursor: 'pointer', opacity: 0.6 }}
          onClick={() => setAdding(true)}
        >
          <IconPlus size={16} />
          <Text size="sm">Добавить задачу</Text>
        </Group>
      )}

      {adding && (
        <Box px="sm" py="xs" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
          <InlineAddTask
            onClose={() => setAdding(false)}
            onAdded={handleAdded}
            defaultDueDate={defaultDueDate}
            defaultProjectId={filterParams?.project_id as string | undefined}
            defaultGoalId={filterParams?.goal_id as string | undefined}
          />
        </Box>
      )}

      {completedTasks.length > 0 && (
        <>
          <Text size="xs" c="dimmed" px="sm" py={8} fw={600}>
            Завершено ({completedTasks.length})
          </Text>
          {completedTasks.map((task) => (
            <TaskItem key={task.id} task={task} onEdit={setEditingTask} filterParams={filterParams} />
          ))}
        </>
      )}

      {!loading && tasks.length === 0 && (
        <Text size="sm" c="dimmed" ta="center" py="xl">
          Нет задач
        </Text>
      )}

      <TaskEditModal task={editingTask} onClose={() => setEditingTask(null)} filterParams={filterParams} />
    </Stack>
  );
}
