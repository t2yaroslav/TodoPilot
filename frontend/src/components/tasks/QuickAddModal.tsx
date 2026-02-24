import { useState, useEffect } from 'react';
import { Modal, TextInput, Select, Group, Button } from '@mantine/core';
import { IconCalendar, IconRepeat } from '@tabler/icons-react';
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
  const { addTask, projects, refreshAllCounts } = useTaskStore();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('0');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<string | null>(null);

  useEffect(() => {
    if (opened) {
      setDueDate(defaultDueDate || null);
      setProjectId(defaultProjectId || null);
      setRecurrence(null);
    }
  }, [opened, defaultDueDate, defaultProjectId]);

  const handleAdd = async () => {
    if (!title.trim()) return;
    await addTask({
      title: title.trim(),
      priority: parseInt(priority),
      due_date: dueDate ? toNoonUTC(dueDate) : null,
      project_id: projectId,
      recurrence: recurrence || null,
    });
    refreshAllCounts();
    setTitle('');
    setPriority('0');
    setDueDate(null);
    setProjectId(null);
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
            { value: '0', label: 'Без приоритета' },
            { value: '1', label: '⚪ Не важно, не срочно' },
            { value: '2', label: '🔵 Важно, не срочно' },
            { value: '3', label: '🟠 Не важно и срочно' },
            { value: '4', label: '🔴 Важно и срочно' },
          ]}
          w={180}
        />
        <DatePickerMenu value={dueDate} onChange={setDueDate}>
          <Button
            size="sm"
            variant="default"
            leftSection={<IconCalendar size={16} />}
          >
            {dueDate ? dayjs(dueDate).format('D MMM') : 'Дата'}
          </Button>
        </DatePickerMenu>
        <Select
          size="sm"
          placeholder="Повторение"
          value={recurrence || ''}
          onChange={(v) => setRecurrence(v || null)}
          data={[
            { value: '', label: 'Без повторения' },
            { value: 'daily', label: 'Ежедневно' },
            { value: 'weekly', label: 'Еженедельно' },
            { value: 'biweekly', label: 'Раз в 2 недели' },
            { value: 'monthly', label: 'Ежемесячно' },
            { value: 'yearly', label: 'Ежегодно' },
          ]}
          leftSection={<IconRepeat size={14} />}
          w={170}
        />
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
