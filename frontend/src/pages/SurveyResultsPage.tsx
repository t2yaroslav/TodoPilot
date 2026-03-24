import { useEffect } from 'react';
import {
  Stack,
  Title,
  Text,
  Paper,
  Group,
  Accordion,
  List,
  ThemeIcon,
  Loader,
  Center,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconTrophy,
  IconAlertTriangle,
  IconBulb,
  IconTarget,
  IconCalendar,
  IconClipboardCheck,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { useSurveyStore, SurveyResult, GoalOutcome } from '@/stores/surveyStore';

function formatWeekDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function GoalOutcomeItem({
  outcome,
  onToggle,
}: {
  outcome: GoalOutcome;
  onToggle: (completed: boolean) => void;
}) {
  const isCompleted = outcome.completed === true;
  const isNotCompleted = outcome.completed === false;

  return (
    <Group gap="xs" wrap="nowrap" py={2}>
      <Tooltip label={isCompleted ? 'Выполнено' : isNotCompleted ? 'Не выполнено' : 'Отметить'}>
        <ActionIcon
          variant="subtle"
          color={isCompleted ? 'green' : isNotCompleted ? 'red' : 'gray'}
          size="sm"
          onClick={() => onToggle(!isCompleted)}
        >
          {isCompleted ? <IconCheck size={14} /> : <IconX size={14} />}
        </ActionIcon>
      </Tooltip>
      <Text size="sm">{outcome.goal}</Text>
    </Group>
  );
}

function SurveyCard({ survey }: { survey: SurveyResult }) {
  const { updateResult } = useSurveyStore();

  const handleGoalOutcomeToggle = (index: number, completed: boolean) => {
    const outcomes = [...(survey.goal_outcomes || [])];
    outcomes[index] = { ...outcomes[index], completed };
    updateResult(survey.id, { goal_outcomes: outcomes });
  };

  return (
    <Accordion.Item value={survey.id}>
      <Accordion.Control>
        <Group gap="sm">
          <IconCalendar size={18} color="var(--mantine-color-indigo-6)" />
          <Text fw={500}>Неделя от {formatWeekDate(survey.week_start)}</Text>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        <Stack gap="md">
          {survey.goal_outcomes?.filter((o) => o.goal?.trim()).length > 0 && (
            <Paper p="sm" withBorder radius="md">
              <Group gap="xs" mb="xs">
                <ThemeIcon size="sm" color="violet" variant="light">
                  <IconClipboardCheck size={14} />
                </ThemeIcon>
                <Text fw={600} size="sm">
                  Итоги недели
                </Text>
              </Group>
              <Stack gap={0}>
                {survey.goal_outcomes.map((outcome, i) => (
                  <GoalOutcomeItem
                    key={i}
                    outcome={outcome}
                    onToggle={(completed) => handleGoalOutcomeToggle(i, completed)}
                  />
                ))}
              </Stack>
            </Paper>
          )}

          {survey.achievements?.filter((s) => s.trim()).length > 0 && (
            <Paper p="sm" withBorder radius="md">
              <Group gap="xs" mb="xs">
                <ThemeIcon size="sm" color="green" variant="light">
                  <IconTrophy size={14} />
                </ThemeIcon>
                <Text fw={600} size="sm">
                  Достижения
                </Text>
              </Group>
              <List size="sm" spacing="xs">
                {survey.achievements.filter((s) => s.trim()).map((item, i) => (
                  <List.Item key={i}>{item}</List.Item>
                ))}
              </List>
            </Paper>
          )}

          {survey.difficulties?.filter((s) => s.trim()).length > 0 && (
            <Paper p="sm" withBorder radius="md">
              <Group gap="xs" mb="xs">
                <ThemeIcon size="sm" color="orange" variant="light">
                  <IconAlertTriangle size={14} />
                </ThemeIcon>
                <Text fw={600} size="sm">
                  Трудности
                </Text>
              </Group>
              <List size="sm" spacing="xs">
                {survey.difficulties.filter((s) => s.trim()).map((item, i) => (
                  <List.Item key={i}>{item}</List.Item>
                ))}
              </List>
            </Paper>
          )}

          {survey.improvements?.filter((s) => s.trim()).length > 0 && (
            <Paper p="sm" withBorder radius="md">
              <Group gap="xs" mb="xs">
                <ThemeIcon size="sm" color="blue" variant="light">
                  <IconBulb size={14} />
                </ThemeIcon>
                <Text fw={600} size="sm">
                  Что изменить
                </Text>
              </Group>
              <List size="sm" spacing="xs">
                {survey.improvements.filter((s) => s.trim()).map((item, i) => (
                  <List.Item key={i}>{item}</List.Item>
                ))}
              </List>
            </Paper>
          )}

          {survey.weekly_goals?.filter((s) => s.trim()).length > 0 && (
            <Paper p="sm" withBorder radius="md">
              <Group gap="xs" mb="xs">
                <ThemeIcon size="sm" color="indigo" variant="light">
                  <IconTarget size={14} />
                </ThemeIcon>
                <Text fw={600} size="sm">
                  Цели на неделю
                </Text>
              </Group>
              <List size="sm" spacing="xs">
                {survey.weekly_goals.filter((s) => s.trim()).map((item, i) => (
                  <List.Item key={i}>{item}</List.Item>
                ))}
              </List>
            </Paper>
          )}
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

export function SurveyResultsPage() {
  const { results, loading, fetchResults } = useSurveyStore();

  useEffect(() => {
    fetchResults();
  }, []);

  return (
    <Stack>
      <Title order={3}>Обзоры недели</Title>

      {loading ? (
        <Center py="xl">
          <Loader color="indigo" />
        </Center>
      ) : results.length === 0 ? (
        <Paper p="xl" withBorder radius="md">
          <Stack align="center" gap="sm">
            <IconCalendar size={48} color="var(--mantine-color-gray-5)" />
            <Text c="dimmed" ta="center">
              Обзоров пока нет. Они появляются каждый понедельник.
            </Text>
          </Stack>
        </Paper>
      ) : (
        <Accordion variant="separated" radius="md">
          {results.map((survey) => (
            <SurveyCard key={survey.id} survey={survey} />
          ))}
        </Accordion>
      )}
    </Stack>
  );
}
