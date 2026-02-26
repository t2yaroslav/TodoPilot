import { useState } from 'react';
import { Modal, Stack, Text, Paper, ScrollArea, Loader, Group, Button, SimpleGrid, RingProgress, ThemeIcon } from '@mantine/core';
import { IconChartBar, IconTarget, IconAlertTriangle, IconTrendingUp } from '@tabler/icons-react';
import { aiAnalysis } from '@/api/client';

interface Props {
  opened: boolean;
  onClose: () => void;
}

interface Stats {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  today_tasks: number;
  completed_7d: number;
  completed_30d: number;
  avg_daily_7d: number;
  total_projects: number;
  total_goals: number;
  priority_p1: number;
  priority_p2: number;
  priority_p3: number;
  priority_p4: number;
  priority_none: number;
}

export function AnalysisModal({ opened, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setAnalysis(null);
    setStats(null);
    try {
      const { data } = await aiAnalysis();
      setAnalysis(data.analysis);
      setStats(data.stats);
    } catch {
      setAnalysis('Ошибка при получении анализа. Проверьте настройки AI.');
    } finally {
      setLoading(false);
    }
  };

  const completionRate = stats && stats.total_tasks > 0
    ? Math.round((stats.completed_tasks / stats.total_tasks) * 100)
    : 0;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconChartBar size={20} color="var(--mantine-color-indigo-6)" />
          <Text fw={600}>Анализ продуктивности</Text>
        </Group>
      }
      size="lg"
    >
      <Stack>
        {!analysis && !loading && (
          <Stack align="center" py="xl">
            <Text size="sm" c="dimmed" ta="center">
              AI проанализирует вашу статистику по задачам, проектам и целям и предложит рекомендации для повышения продуктивности.
            </Text>
            <Button onClick={runAnalysis} leftSection={<IconChartBar size={16} />} color="indigo">
              Запустить анализ
            </Button>
          </Stack>
        )}

        {loading && (
          <Stack align="center" py="xl">
            <Loader size="md" />
            <Text size="sm" c="dimmed">Анализирую вашу статистику...</Text>
          </Stack>
        )}

        {stats && (
          <SimpleGrid cols={4} spacing="xs">
            <Paper p="xs" radius="md" withBorder>
              <Group gap={4}>
                <ThemeIcon size="sm" variant="light" color="blue"><IconTarget size={12} /></ThemeIcon>
                <Text size="xs" c="dimmed">Всего</Text>
              </Group>
              <Text fw={700} size="lg">{stats.total_tasks}</Text>
            </Paper>
            <Paper p="xs" radius="md" withBorder>
              <Group gap={4}>
                <ThemeIcon size="sm" variant="light" color="green"><IconTrendingUp size={12} /></ThemeIcon>
                <Text size="xs" c="dimmed">Выполнено</Text>
              </Group>
              <Text fw={700} size="lg">{stats.completed_tasks}</Text>
            </Paper>
            <Paper p="xs" radius="md" withBorder>
              <Group gap={4}>
                <ThemeIcon size="sm" variant="light" color="orange"><IconAlertTriangle size={12} /></ThemeIcon>
                <Text size="xs" c="dimmed">Просрочено</Text>
              </Group>
              <Text fw={700} size="lg" c={stats.overdue_tasks > 0 ? 'red' : undefined}>{stats.overdue_tasks}</Text>
            </Paper>
            <Paper p="xs" radius="md" withBorder>
              <Text size="xs" c="dimmed">Завершение</Text>
              <RingProgress size={50} thickness={5} roundCaps sections={[{ value: completionRate, color: 'indigo' }]} label={<Text size="xs" ta="center" fw={700}>{completionRate}%</Text>} />
            </Paper>
          </SimpleGrid>
        )}

        {analysis && (
          <ScrollArea h={350}>
            <Paper p="md" bg="var(--mantine-color-indigo-light)" radius="md">
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{analysis}</Text>
            </Paper>
          </ScrollArea>
        )}

        {analysis && (
          <Button variant="light" onClick={runAnalysis} loading={loading}>
            Обновить анализ
          </Button>
        )}
      </Stack>
    </Modal>
  );
}
