import { ActionIcon, Checkbox, Group, Text, Badge, Box } from '@mantine/core';
import { IconTrash, IconEdit } from '@tabler/icons-react';
import { Task, useTaskStore } from '@/stores/taskStore';
import dayjs from 'dayjs';

const PRIORITY_COLORS: Record<number, string> = {
  4: 'red',    // P1 urgent+important
  3: 'orange', // P2 urgent
  2: 'blue',   // P3 important
  1: 'gray',   // P4
  0: 'gray',   // none
};

interface Props {
  task: Task;
  onEdit?: (task: Task) => void;
}

export function TaskItem({ task, onEdit }: Props) {
  const { toggleTask, removeTask } = useTaskStore();
  const { projects } = useTaskStore();
  const project = task.project_id ? projects.find((p) => p.id === task.project_id) : null;

  return (
    <Group
      gap="sm"
      py={6}
      px="sm"
      wrap="nowrap"
      style={{
        borderBottom: '1px solid var(--mantine-color-default-border)',
        cursor: 'pointer',
        '&:hover': { backgroundColor: 'var(--mantine-color-gray-0)' },
      }}
    >
      <Checkbox
        checked={task.completed}
        onChange={(e) => toggleTask(task.id, e.currentTarget.checked)}
        color={PRIORITY_COLORS[task.priority] || 'gray'}
        radius="xl"
        size="sm"
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
      </Box>
      <Group gap={4} wrap="nowrap">
        {task.due_date && (
          <Badge size="xs" variant="light" color={dayjs(task.due_date).isBefore(dayjs(), 'day') ? 'red' : 'blue'}>
            {dayjs(task.due_date).format('DD MMM')}
          </Badge>
        )}
        {project && (
          <Badge size="xs" variant="dot" color={project.color}>
            {project.title}
          </Badge>
        )}
        <ActionIcon variant="subtle" size="xs" onClick={() => onEdit?.(task)}>
          <IconEdit size={14} />
        </ActionIcon>
        <ActionIcon variant="subtle" size="xs" color="red" onClick={() => removeTask(task.id)}>
          <IconTrash size={14} />
        </ActionIcon>
      </Group>
    </Group>
  );
}
