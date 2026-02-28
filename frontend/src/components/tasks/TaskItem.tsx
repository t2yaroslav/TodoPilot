import { useState } from 'react';
import { ActionIcon, Checkbox, Group, Text, Box, Tooltip } from '@mantine/core';
import { IconTrash, IconEdit, IconCalendar, IconHash, IconRepeat } from '@tabler/icons-react';
import { Task, useTaskStore } from '@/stores/taskStore';
import { DatePickerMenu } from './DatePickerMenu';
import { toNoonUTC } from '@/lib/dates';
import { getRecurrenceLabel } from '@/lib/recurrence';
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

const PRIORITY_HEX: Record<number, string> = {
  4: 'var(--mantine-color-red-5)',
  3: 'var(--mantine-color-orange-5)',
  2: 'var(--mantine-color-blue-5)',
  1: 'var(--mantine-color-gray-5)',
  0: 'var(--mantine-color-gray-4)',
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

function getDateColor(dateStr: string): string {
  const date = dayjs(dateStr);
  const today = dayjs().startOf('day');
  const diff = date.startOf('day').diff(today, 'day');

  if (diff < 0) return 'var(--mantine-color-red-6)';
  if (diff === 0) return 'var(--mantine-color-green-6)';
  if (diff === 1) return 'var(--mantine-color-yellow-7)';
  return 'var(--mantine-color-violet-5)';
}

interface Props {
  task: Task;
  onEdit?: (task: Task) => void;
  filterParams?: Record<string, unknown>;
  isTodayPage?: boolean;
}

export function TaskItem({ task, onEdit, filterParams, isTodayPage }: Props) {
  const { toggleTask, removeTask, editTask, fetchTasks, refreshAllCounts } = useTaskStore();
  const { projects } = useTaskStore();
  const project = task.project_id ? projects.find((p) => p.id === task.project_id) : null;
  const [hovered, setHovered] = useState(false);

  const dateColor = task.due_date ? getDateColor(task.due_date) : undefined;

  const isToday = task.due_date && dayjs(task.due_date).isSame(dayjs(), 'day');

  const handleDateChange = (date: Date | null) => {
    editTask(task.id, { due_date: date ? toNoonUTC(date) : null }).then(() => {
      fetchTasks(filterParams);
      refreshAllCounts();
    });
  };

  const handleRecurrenceChange = (rec: string | null) => {
    editTask(task.id, { recurrence: rec }).then(() => {
      fetchTasks(filterParams);
      refreshAllCounts();
    });
  };

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
            toggleTask(task.id, e.currentTarget.checked).then(() => {
              fetchTasks(filterParams);
              refreshAllCounts();
            });
          }}
          onClick={(e) => e.stopPropagation()}
          color={PRIORITY_COLORS[task.priority] || 'gray'}
          radius="xl"
          size="sm"
          mt={2}
          styles={!task.completed ? {
            input: { borderColor: PRIORITY_HEX[task.priority] || PRIORITY_HEX[0] },
          } : undefined}
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
          {(task.due_date || task.recurrence || project) && (
            <Group gap="xs" mt={4} onClick={(e) => e.stopPropagation()}>
              {task.due_date && !(isTodayPage && isToday) && (
                <DatePickerMenu
                  value={new Date(task.due_date)}
                  onChange={handleDateChange}
                  recurrence={task.recurrence}
                  onRecurrenceChange={handleRecurrenceChange}
                >
                  <Group
                    gap={4}
                    wrap="nowrap"
                    style={{ cursor: 'pointer' }}
                  >
                    <IconCalendar size={12} color={dateColor} />
                    <Text size="xs" style={{ color: dateColor }}>
                      {formatRelativeDate(task.due_date)}
                    </Text>
                    {task.recurrence && (
                      <Tooltip label={getRecurrenceLabel(task.recurrence)}>
                        <Box style={{ display: 'flex', alignItems: 'center' }}>
                          <IconRepeat size={12} color={dateColor} />
                        </Box>
                      </Tooltip>
                    )}
                  </Group>
                </DatePickerMenu>
              )}
              {!task.due_date && task.recurrence && (
                <Tooltip label={getRecurrenceLabel(task.recurrence)}>
                  <Group gap={4} wrap="nowrap">
                    <IconRepeat size={12} color="var(--mantine-color-dimmed)" />
                    <Text size="xs" c="dimmed">
                      {getRecurrenceLabel(task.recurrence)}
                    </Text>
                  </Group>
                </Tooltip>
              )}
              <Box style={{ flex: 1 }} />
              {project && (
                <Group gap={4} wrap="nowrap">
                  <Text size="xs" c="dimmed">{project.title}</Text>
                  <IconHash size={10} color={project.color} />
                </Group>
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
