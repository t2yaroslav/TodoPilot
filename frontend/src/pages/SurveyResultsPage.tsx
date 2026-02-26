import { useEffect } from 'react';
import {
  Stack,
  Title,
  Text,
  Paper,
  Group,
  Badge,
  Accordion,
  List,
  ThemeIcon,
  Loader,
  Center,
} from '@mantine/core';
import {
  IconTrophy,
  IconAlertTriangle,
  IconBulb,
  IconTarget,
  IconCalendar,
} from '@tabler/icons-react';
import { useSurveyStore, SurveyResult } from '@/stores/surveyStore';

function formatWeekDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function SurveyCard({ survey }: { survey: SurveyResult }) {
  return (
    <Accordion.Item value={survey.id}>
      <Accordion.Control>
        <Group gap="sm">
          <IconCalendar size={18} color="var(--mantine-color-indigo-6)" />
          <Text fw={500}>Неделя от {formatWeekDate(survey.week_start)}</Text>
          <Badge size="sm" color="indigo" variant="light">
            {(survey.achievements?.length || 0) + (survey.weekly_goals?.length || 0)} пунктов
          </Badge>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        <Stack gap="md">
          {survey.achievements && survey.achievements.length > 0 && (
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
                {survey.achievements.map((item, i) => (
                  <List.Item key={i}>{item}</List.Item>
                ))}
              </List>
            </Paper>
          )}

          {survey.difficulties && survey.difficulties.length > 0 && (
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
                {survey.difficulties.map((item, i) => (
                  <List.Item key={i}>{item}</List.Item>
                ))}
              </List>
            </Paper>
          )}

          {survey.improvements && survey.improvements.length > 0 && (
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
                {survey.improvements.map((item, i) => (
                  <List.Item key={i}>{item}</List.Item>
                ))}
              </List>
            </Paper>
          )}

          {survey.weekly_goals && survey.weekly_goals.length > 0 && (
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
                {survey.weekly_goals.map((item, i) => (
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
      <Title order={3}>Еженедельные ретроспективы</Title>

      {loading ? (
        <Center py="xl">
          <Loader color="indigo" />
        </Center>
      ) : results.length === 0 ? (
        <Paper p="xl" withBorder radius="md">
          <Stack align="center" gap="sm">
            <IconCalendar size={48} color="var(--mantine-color-gray-5)" />
            <Text c="dimmed" ta="center">
              Ретроспектив пока нет. Они появляются каждый понедельник.
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
