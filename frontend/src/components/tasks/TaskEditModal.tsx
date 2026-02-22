import { useEffect, useState } from 'react';
import { Modal, TextInput, Textarea, Select, Group, Button, Stack } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { Task, useTaskStore } from '@/stores/taskStore';

interface Props {
  task: Task | null;
  onClose: () => void;
  filterParams?: Record<string, unknown>;
}

export function TaskEditModal({ task, onClose, filterParams }: Props) {
  const { editTask, fetchTasks, refreshAllCounts, projects, goals } = useTaskStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('0');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [goalId, setGoalId] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(String(task.priority));
      setDueDate(task.due_date ? new Date(task.due_date) : null);
      setProjectId(task.project_id);
      setGoalId(task.goal_id);
    }
  }, [task]);

  const handleSave = async () => {
    if (!task) return;
    await editTask(task.id, {
      title,
      description: description || null,
      priority: parseInt(priority),
      due_date: dueDate?.toISOString() || null,
      project_id: projectId,
      goal_id: goalId,
    });
    fetchTasks(filterParams);
    refreshAllCounts();
    onClose();
  };

  return (
    <Modal opened={!!task} onClose={onClose} title="Редактирование задачи" size="md">
      <Stack>
        <TextInput label="Название" value={title} onChange={(e) => setTitle(e.currentTarget.value)} />
        <Textarea label="Описание" value={description} onChange={(e) => setDescription(e.currentTarget.value)} autosize minRows={2} />
        <Group grow>
          <Select
            label="Приоритет"
            value={priority}
            onChange={(v) => setPriority(v || '0')}
            data={[
              { value: '0', label: 'Без приоритета' },
              { value: '1', label: 'P4' },
              { value: '2', label: 'P3 Важно' },
              { value: '3', label: 'P2 Срочно' },
              { value: '4', label: 'P1 Срочно и Важно' },
            ]}
          />
          <DatePickerInput label="Дедлайн" value={dueDate} onChange={setDueDate} clearable />
        </Group>
        <Group grow>
          {projects.length > 0 && (
            <Select
              label="Проект"
              value={projectId}
              onChange={setProjectId}
              data={projects.map((p) => ({ value: p.id, label: p.title }))}
              clearable
            />
          )}
          {goals.length > 0 && (
            <Select
              label="Цель"
              value={goalId}
              onChange={setGoalId}
              data={goals.map((g) => ({ value: g.id, label: g.title }))}
              clearable
            />
          )}
        </Group>
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>Отмена</Button>
          <Button onClick={handleSave}>Сохранить</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
