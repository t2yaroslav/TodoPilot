import { useState, useEffect } from 'react';
import { Modal, TextInput, Select, Group, Button } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useTaskStore } from '@/stores/taskStore';

interface Props {
  opened: boolean;
  onClose: () => void;
  defaultDueDate?: Date;
  defaultProjectId?: string;
}

export function QuickAddModal({ opened, onClose, defaultDueDate, defaultProjectId }: Props) {
  const { addTask, projects, fetchProjectTaskCounts } = useTaskStore();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('0');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (opened) {
      setDueDate(defaultDueDate || null);
      setProjectId(defaultProjectId || null);
    }
  }, [opened, defaultDueDate, defaultProjectId]);

  const handleAdd = async () => {
    if (!title.trim()) return;
    await addTask({
      title: title.trim(),
      priority: parseInt(priority),
      due_date: dueDate?.toISOString() || null,
      project_id: projectId,
    });
    fetchProjectTaskCounts();
    setTitle('');
    setPriority('0');
    setDueDate(null);
    setProjectId(null);
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Быстрое добавление задачи" size="md">
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
            { value: '0', label: 'Без приоритета' },
            { value: '1', label: 'P4' },
            { value: '2', label: 'P3 Важно' },
            { value: '3', label: 'P2 Срочно' },
            { value: '4', label: 'P1 Срочно и Важно' },
          ]}
          w={180}
        />
        <DatePickerInput size="sm" placeholder="Дата" value={dueDate} onChange={setDueDate} clearable w={150} />
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
      </Group>
      <Group justify="flex-end">
        <Button variant="subtle" onClick={onClose}>Отмена</Button>
        <Button onClick={handleAdd}>Добавить</Button>
      </Group>
    </Modal>
  );
}
