import { useEffect, useState } from 'react';
import { Stack, Text, Box } from '@mantine/core';
import { Task, useTaskStore } from '@/stores/taskStore';
import { TaskItem } from './TaskItem';
import { TaskEditModal } from './TaskEditModal';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';

dayjs.locale('ru');

function getDateGroupLabel(dateStr: string): string {
  const date = dayjs(dateStr).startOf('day');
  const today = dayjs().startOf('day');
  const diff = date.diff(today, 'day');

  if (diff === 0) return 'Сегодня';
  if (diff === -1) return 'Вчера';
  if (diff >= -6) return date.format('dddd');
  return date.format('D MMMM');
}

function getDateGroupKey(dateStr: string): string {
  return dayjs(dateStr).startOf('day').format('YYYY-MM-DD');
}

interface DateGroup {
  key: string;
  label: string;
  tasks: Task[];
}

function groupTasksByDate(tasks: Task[]): DateGroup[] {
  const groups = new Map<string, { label: string; tasks: Task[] }>();

  for (const task of tasks) {
    const dateStr = task.completed_at || task.updated_at;
    const key = getDateGroupKey(dateStr);
    if (!groups.has(key)) {
      groups.set(key, { label: getDateGroupLabel(dateStr), tasks: [] });
    }
    groups.get(key)!.tasks.push(task);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, { label, tasks }]) => ({ key, label, tasks }));
}

interface Props {
  filterParams?: Record<string, unknown>;
}

export function CompletedTaskList({ filterParams }: Props) {
  const { tasks, loading, fetchTasks } = useTaskStore();
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchTasks(filterParams);
  }, [JSON.stringify(filterParams)]);

  const dateGroups = groupTasksByDate(tasks);

  return (
    <Stack gap={0}>
      {dateGroups.map((group) => (
        <Box key={group.key} mb="xs">
          <Text size="xs" fw={700} px="sm" py={6} c="dimmed" style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {group.label}
          </Text>
          {group.tasks.map((task) => (
            <TaskItem key={task.id} task={task} onEdit={setEditingTask} filterParams={filterParams} />
          ))}
        </Box>
      ))}

      {!loading && tasks.length === 0 && (
        <Text size="sm" c="dimmed" ta="center" py="xl">
          Нет выполненных задач
        </Text>
      )}

      <TaskEditModal task={editingTask} onClose={() => setEditingTask(null)} filterParams={filterParams} />
    </Stack>
  );
}
