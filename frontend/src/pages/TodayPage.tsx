import { Group, Title, Text } from '@mantine/core';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { PriorityTaskList } from '@/components/tasks/PriorityTaskList';
import { AIFunctionMenu } from '@/components/ai/AIFunctionMenu';

dayjs.locale('ru');

export function TodayPage() {
  return (
    <>
      <Group justify="space-between" mb="md">
        <div>
          <Title order={3}>Сегодня</Title>
          <Text size="sm" c="dimmed">{dayjs().format('dd, D MMMM')}</Text>
        </div>
        <AIFunctionMenu />
      </Group>
      <PriorityTaskList filterParams={{ due_today: true, completed: false }} defaultDueDate={new Date()} />
    </>
  );
}
