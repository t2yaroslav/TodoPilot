import { useState } from 'react';
import { ActionIcon, Checkbox, Group, Text, Badge, Box } from '@mantine/core';
import { IconTrash, IconEdit, IconCalendar, IconHash } from '@tabler/icons-react';
import { Task, useTaskStore } from '@/stores/taskStore';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';

dayjs.locale('ru');

const PRIORITY_COLORS: Record<number, string> = {
  4: 'red',    // P1 urgent+important
  3: 'orange', // P2 urgent
  2: 'blue',   // P3 important
  1: 'gray',   // P4
  0: 'gray',   // none
};

function formatRelativeDate(dateStr: string): string {
  const date = dayjs(dateStr);
  const today = dayjs().startOf('day');
  const diff = date.startOf('day').diff(today, 'day');

  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Завтра';
  if (diff === -1) return 'Вчера';
  if (diff > 1 && diff <= 6) return date.format('dddd');
  return date.format('D MMM');
}

interface Props {
  task: Task;
  onEdit?: (task: Task) => void;
}

export function TaskItem({ task, onEdit }: Props) {
  const { toggleTask, removeTask, refreshAllCounts } = useTaskStore();
  const { projects } = useTaskStore();
  const project = task.project_id ? projects.find((p) => p.id === task.project_id) : null;
  const [hovered, setHovered] = useState(false);

  const isOverdue = task.due_date && dayjs(task.due_date).isBefore(dayjs(), 'day');

  return (
    <Box
      py={8}
      px="sm"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onEdit?.(task)}
      style={{
        borderBottom: '1px solid var(--mantine-color-default-border)',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <Checkbox
          checked={task.completed}
          onChange={(e) => {
            e.stopPropagation();
            toggleTask(task.id, e.currentTarget.checked).then(refreshAllCounts);
          }}
          onClick={(e) => e.stopPropagation()}
          color={PRIORITY_COLORS[task.priority] || 'gray'}
          radius="xl"
          size="sm"
          mt={2}
        />
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text
            size="sm"
            td={task.completed ? 'line-through' : undefined}
            c={task.completed ? 'dimmed' : undefined}
            lineClamp={1}
          >
            {task.title}
          </Text>
          {task.description && (
            <Text size="xs" c="dimmed" lineClamp={1} mt={2}>
              {task.description}
            </Text>
          )}
          {(task.due_date || project) && (
            <Group gap="xs" mt={4}>
              {task.due_date && (
                <Group gap={4} wrap="nowrap">
                  <IconCalendar size={12} color={isOverdue ? 'var(--mantine-color-red-6)' : 'var(--mantine-color-dimmed)'} />
                  <Text size="xs" c={isOverdue ? 'red' : 'dimmed'}>
                    {formatRelativeDate(task.due_date)}
                  </Text>
                </Group>
              )}
              <Box style={{ flex: 1 }} />
              {project && (
                <Badge
                  size="xs"
                  variant="light"
                  color="gray"
                  leftSection={<IconHash size={10} color={project.color} />}
                >
                  {project.title}
                </Badge>
              )}
            </Group>
          )}
        </Box>
      </Group>
      {hovered && (
        <Group
          gap={2}
          wrap="nowrap"
          style={{
            position: 'absolute',
            top: 8,
            right: 12,
            background: 'var(--mantine-color-body)',
            borderRadius: 4,
            padding: '2px 4px',
          }}
        >
          <ActionIcon
            variant="subtle"
            size="xs"
            onClick={(e) => { e.stopPropagation(); onEdit?.(task); }}
          >
            <IconEdit size={14} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            size="xs"
            color="red"
            onClick={(e) => { e.stopPropagation(); removeTask(task.id).then(refreshAllCounts); }}
          >
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
      )}
    </Box>
  );
}
