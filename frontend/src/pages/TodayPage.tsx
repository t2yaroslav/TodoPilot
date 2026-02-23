import { useState } from 'react';
import { Group, Title, Text, ActionIcon } from '@mantine/core';
import { IconSparkles } from '@tabler/icons-react';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { TaskList } from '@/components/tasks/TaskList';
import { AIModal } from '@/components/ai/AIModal';

dayjs.locale('ru');

export function TodayPage() {
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <>
      <Group justify="space-between" mb="md">
        <div>
          <Title order={3}>Сегодня</Title>
          <Text size="sm" c="dimmed">{dayjs().format('dd, D MMMM YYYY')}</Text>
        </div>
        <ActionIcon variant="light" color="indigo" size="lg" onClick={() => setAiOpen(true)} title="AI-помощник">
          <IconSparkles size={20} />
        </ActionIcon>
      </Group>
      <TaskList filterParams={{ due_today: true, completed: false }} defaultDueDate={new Date()} />
      <AIModal opened={aiOpen} onClose={() => setAiOpen(false)} />
    </>
  );
}
