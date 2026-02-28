import { useState, useEffect } from 'react';
import { Modal, TextInput, Select, Group, Button } from '@mantine/core';
import { IconCalendar, IconTarget } from '@tabler/icons-react';
import { useTaskStore } from '@/stores/taskStore';
import { DatePickerMenu } from './DatePickerMenu';
import { toNoonUTC } from '@/lib/dates';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';

dayjs.locale('ru');

interface Props {
  opened: boolean;
  onClose: () => void;
  defaultDueDate?: Date;
  defaultProjectId?: string;
}

export function QuickAddModal({ opened, onClose, defaultDueDate, defaultProjectId }: Props) {
  const { addTask, projects, goals, fetchGoals, refreshAllCounts } = useTaskStore();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('0');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<string | null>(null);

  useEffect(() => {
    if (opened) {
      setDueDate(defaultDueDate || null);
      setProjectId(defaultProjectId || null);
      setGoalId(null);
      setRecurrence(null);
      if (goals.length === 0) fetchGoals();
    }
  }, [opened, defaultDueDate, defaultProjectId]);

  const handleAdd = async () => {
    if (!title.trim()) return;
    await addTask({
      title: title.trim(),
      priority: parseInt(priority),
      due_date: dueDate ? toNoonUTC(dueDate) : null,
      project_id: projectId,
      goal_id: goalId,
      recurrence: recurrence || null,
    });
    refreshAllCounts();
    setTitle('');
    setPriority('0');
    setDueDate(null);
    setProjectId(null);
    setGoalId(null);
    setRecurrence(null);
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Быстрое добавление задачи" size={800}>
      <TextInput
        placeholder="Название задачи"
        value={title}
        onChange={(e) => setTitle(e.currentTarget.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        autoFocus
        mb="sm"
      />
      <Group gap="sm" mb="md">
        <Select
          size="sm"
          value={priority}
          onChange={(v) => setPriority(v || '0')}
          data={[
            { value: '4', label: '🔴 Важно и срочно' },
            { value: '3', label: '🟠 Не важно и срочно' },
            { value: '2', label: '🔵 Важно, не срочно' },
            { value: '1', label: '⚪ Не важно, не срочно' },
            { value: '0', label: 'Без приоритета' },
          ]}
          w={180}
        />
        <DatePickerMenu
          value={dueDate}
          onChange={setDueDate}
          recurrence={recurrence}
          onRecurrenceChange={setRecurrence}
        >
          <Button
            size="sm"
            variant="default"
            leftSection={<IconCalendar size={16} />}
          >
            {dueDate ? dayjs(dueDate).format('D MMM') : 'Дата'}
          </Button>
        </DatePickerMenu>
        {projects.length > 0 && (
          <Select
            size="sm"
            placeholder="Проект"
            value={projectId}
            onChange={setProjectId}
            data={projects.map((p) => ({ value: p.id, label: p.title }))}
            clearable
            w={160}
          />
        )}
        {goals.length > 0 && (
          <Select
            size="sm"
            placeholder="Цель"
            value={goalId}
            onChange={setGoalId}
            data={goals.map((g) => ({ value: g.id, label: g.title }))}
            leftSection={<IconTarget size={14} />}
            clearable
            w={160}
          />
        )}
      </Group>
      <Group justify="flex-end">
        <Button variant="subtle" onClick={onClose}>Отмена</Button>
        <Button onClick={handleAdd}>Сохранить</Button>
      </Group>
    </Modal>
  );
}
