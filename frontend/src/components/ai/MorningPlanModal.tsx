import { useState } from 'react';
import { Modal, Stack, Text, Paper, ScrollArea, Loader, Group, Button } from '@mantine/core';
import { IconSunrise } from '@tabler/icons-react';
import { aiMorningPlan, submitAndPoll } from '@/api/client';

interface Props {
  opened: boolean;
  onClose: () => void;
}

export function MorningPlanModal({ opened, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);

  const fetchPlan = async () => {
    setLoading(true);
    setPlan(null);
    try {
      const result = await submitAndPoll<string>(() => aiMorningPlan());
      setPlan(result);
    } catch {
      setPlan('Ошибка при генерации плана. Проверьте настройки AI.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconSunrise size={20} color="var(--mantine-color-yellow-6)" />
          <Text fw={600}>Утренний план</Text>
        </Group>
      }
      size="lg"
    >
      <Stack>
        {!plan && !loading && (
          <Stack align="center" py="xl">
            <Text size="sm" c="dimmed" ta="center">
              AI проанализирует ваши задачи на сегодня, приоритеты и цели, и предложит с чего начать день.
            </Text>
            <Button onClick={fetchPlan} leftSection={<IconSunrise size={16} />} color="yellow" variant="filled" c="dark">
              Составить план
            </Button>
          </Stack>
        )}

        {loading && (
          <Stack align="center" py="xl">
            <Loader size="md" />
            <Text size="sm" c="dimmed">Составляю план на утро...</Text>
          </Stack>
        )}

        {plan && (
          <>
            <ScrollArea h={400}>
              <Paper p="md" bg="var(--mantine-color-yellow-light)" radius="md">
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{plan}</Text>
              </Paper>
            </ScrollArea>
            <Button variant="light" onClick={fetchPlan} loading={loading}>
              Обновить план
            </Button>
          </>
        )}
      </Stack>
    </Modal>
  );
}
