import { useState } from 'react';
import { Group, Title, ActionIcon } from '@mantine/core';
import { IconSparkles } from '@tabler/icons-react';
import { TaskList } from '@/components/tasks/TaskList';
import { AIModal } from '@/components/ai/AIModal';

export function InboxPage() {
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={3}>Входящие</Title>
        <ActionIcon variant="light" color="indigo" size="lg" onClick={() => setAiOpen(true)}>
          <IconSparkles size={20} />
        </ActionIcon>
      </Group>
      <TaskList filterParams={{ inbox: true, completed: false }} />
      <AIModal opened={aiOpen} onClose={() => setAiOpen(false)} />
    </>
  );
}
