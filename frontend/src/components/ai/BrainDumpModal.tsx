import { useState } from 'react';
import { Modal, Stack, Text, Paper, Textarea, Button, Group, Badge, Loader, Checkbox, ScrollArea, ActionIcon } from '@mantine/core';
import { IconBrain, IconTrash } from '@tabler/icons-react';
import { aiBrainDump, aiBrainDumpSave } from '@/api/client';
import { useTaskStore } from '@/stores/taskStore';

interface Props {
  opened: boolean;
  onClose: () => void;
}

interface BrainDumpItem {
  type: 'task' | 'project' | 'goal';
  title: string;
  priority: number;
  due_date: string | null;
  project: string | null;
  goal: string | null;
  selected: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  task: 'Задача',
  project: 'Проект',
  goal: 'Цель',
};

const TYPE_COLORS: Record<string, string> = {
  task: 'blue',
  project: 'violet',
  goal: 'orange',
};

const PRIORITY_LABELS: Record<number, string> = {
  0: '',
  1: 'P4',
  2: 'P3',
  3: 'P2',
  4: 'P1',
};

export function BrainDumpModal({ opened, onClose }: Props) {
  const [step, setStep] = useState<'input' | 'preview' | 'done'>('input');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<BrainDumpItem[]>([]);
  const [aiReply, setAiReply] = useState('');
  const [savedResult, setSavedResult] = useState<{ tasks: number; projects: number; goals: number } | null>(null);

  const { refreshAllCounts, fetchProjects, fetchGoals } = useTaskStore();

  const handleExtract = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const { data } = await aiBrainDump(text.trim());
      setItems(data.items.map((item: Omit<BrainDumpItem, 'selected'>) => ({ ...item, selected: true })));
      setAiReply(data.reply);
      setStep('preview');
    } catch {
      setAiReply('Ошибка при обработке текста. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const selected = items.filter((i) => i.selected);
    if (selected.length === 0) return;
    setSaving(true);
    try {
      const toSave = selected.map(({ selected: _, ...rest }) => rest);
      const { data } = await aiBrainDumpSave(toSave);
      setSavedResult(data.created);
      setStep('done');
      refreshAllCounts();
      fetchProjects();
      fetchGoals();
    } catch {
      setAiReply('Ошибка при сохранении. Попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = (index: number) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, selected: !item.selected } : item));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    setStep('input');
    setText('');
    setItems([]);
    setAiReply('');
    setSavedResult(null);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <IconBrain size={20} color="var(--mantine-color-violet-6)" />
          <Text fw={600}>Выгрузка из головы</Text>
        </Group>
      }
      size="lg"
    >
      <Stack>
        {step === 'input' && (
          <>
            <Text size="sm" c="dimmed">
              Напишите всё что в голове — задачи, идеи, планы. AI извлечёт задачи, проекты и цели.
            </Text>
            <Textarea
              placeholder="Нужно позвонить маме, доделать презентацию к пятнице, начать учить английский, купить продукты..."
              value={text}
              onChange={(e) => setText(e.currentTarget.value)}
              autosize
              minRows={5}
              maxRows={12}
            />
            <Button onClick={handleExtract} loading={loading} color="violet" disabled={!text.trim()}>
              {loading ? 'Обрабатываю...' : 'Извлечь задачи'}
            </Button>
          </>
        )}

        {step === 'preview' && (
          <>
            {aiReply && (
              <Paper p="sm" bg="var(--mantine-color-violet-light)" radius="md">
                <Text size="sm">{aiReply}</Text>
              </Paper>
            )}

            <ScrollArea h={350}>
              <Stack gap="xs">
                {items.map((item, i) => (
                  <Paper key={i} p="sm" radius="md" withBorder style={{ opacity: item.selected ? 1 : 0.5 }}>
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="sm" wrap="nowrap" style={{ flex: 1 }}>
                        <Checkbox
                          checked={item.selected}
                          onChange={() => toggleItem(i)}
                          size="sm"
                        />
                        <div style={{ flex: 1 }}>
                          <Group gap="xs">
                            <Badge size="xs" color={TYPE_COLORS[item.type]}>{TYPE_LABELS[item.type]}</Badge>
                            {item.priority > 0 && (
                              <Badge size="xs" color="red" variant="light">{PRIORITY_LABELS[item.priority]}</Badge>
                            )}
                            {item.due_date && (
                              <Badge size="xs" color="gray" variant="light">{item.due_date}</Badge>
                            )}
                          </Group>
                          <Text size="sm" fw={500} mt={2}>{item.title}</Text>
                          {(item.project || item.goal) && (
                            <Text size="xs" c="dimmed">
                              {item.project && `Проект: ${item.project}`}
                              {item.project && item.goal && ' · '}
                              {item.goal && `Цель: ${item.goal}`}
                            </Text>
                          )}
                        </div>
                      </Group>
                      <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => removeItem(i)}>
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </ScrollArea>

            <Group justify="space-between">
              <Button variant="subtle" onClick={() => { setStep('input'); setItems([]); }}>
                Назад
              </Button>
              <Group gap="xs">
                <Text size="xs" c="dimmed">
                  Выбрано: {items.filter((i) => i.selected).length} из {items.length}
                </Text>
                <Button onClick={handleSave} loading={saving} color="violet" disabled={items.filter((i) => i.selected).length === 0}>
                  Сохранить
                </Button>
              </Group>
            </Group>
          </>
        )}

        {step === 'done' && savedResult && (
          <Stack align="center" py="xl">
            <Text size="lg" fw={600} c="green">Сохранено!</Text>
            <Group gap="md">
              {savedResult.tasks > 0 && <Badge size="lg" color="blue">Задач: {savedResult.tasks}</Badge>}
              {savedResult.projects > 0 && <Badge size="lg" color="violet">Проектов: {savedResult.projects}</Badge>}
              {savedResult.goals > 0 && <Badge size="lg" color="orange">Целей: {savedResult.goals}</Badge>}
            </Group>
            <Button variant="light" onClick={handleClose} mt="md">Закрыть</Button>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}
