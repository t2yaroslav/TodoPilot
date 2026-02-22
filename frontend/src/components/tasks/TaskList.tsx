import { useEffect, useState } from 'react';
import { Stack, Text, TextInput, Group, Button, ActionIcon, Select, Box } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconPlus } from '@tabler/icons-react';
import { Task, useTaskStore } from '@/stores/taskStore';
import { TaskItem } from './TaskItem';
import { TaskEditModal } from './TaskEditModal';

interface Props {
  filterParams?: Record<string, unknown>;
  showAddButton?: boolean;
}

export function TaskList({ filterParams, showAddButton = true }: Props) {
  const { tasks, loading, fetchTasks, addTask, projects } = useTaskStore();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('0');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchTasks(filterParams);
  }, [JSON.stringify(filterParams)]);

  const handleAdd = async () => {
    if (!title.trim()) return;
    await addTask({
      title: title.trim(),
      priority: parseInt(priority),
      due_date: dueDate?.toISOString() || null,
      project_id: projectId || filterParams?.project_id || null,
    });
    setTitle('');
    setPriority('0');
    setDueDate(null);
    setProjectId(null);
    setAdding(false);
    fetchTasks(filterParams);
  };

  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <Stack gap={0}>
      {activeTasks.map((task) => (
        <TaskItem key={task.id} task={task} onEdit={setEditingTask} />
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
          <TextInput
            placeholder="Название задачи"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            autoFocus
            mb="xs"
          />
          <Group gap="xs">
            <Select
              size="xs"
              value={priority}
              onChange={(v) => setPriority(v || '0')}
              data={[
                { value: '0', label: 'Без приоритета' },
                { value: '1', label: 'P4' },
                { value: '2', label: 'P3 Важно' },
                { value: '3', label: 'P2 Срочно' },
                { value: '4', label: 'P1 Срочно и Важно' },
              ]}
              w={160}
            />
            <DatePickerInput
              size="xs"
              placeholder="Дата"
              value={dueDate}
              onChange={setDueDate}
              clearable
              w={130}
            />
            {projects.length > 0 && (
              <Select
                size="xs"
                placeholder="Проект"
                value={projectId}
                onChange={setProjectId}
                data={projects.map((p) => ({ value: p.id, label: p.title }))}
                clearable
                w={140}
              />
            )}
            <Button size="xs" onClick={handleAdd}>Добавить</Button>
            <Button size="xs" variant="subtle" onClick={() => setAdding(false)}>Отмена</Button>
          </Group>
        </Box>
      )}

      {completedTasks.length > 0 && (
        <>
          <Text size="xs" c="dimmed" px="sm" py={8} fw={600}>
            Завершено ({completedTasks.length})
          </Text>
          {completedTasks.map((task) => (
            <TaskItem key={task.id} task={task} onEdit={setEditingTask} />
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
