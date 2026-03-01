import { Group, Title } from '@mantine/core';
import { IconInbox } from '@tabler/icons-react';
import { TaskList } from '@/components/tasks/TaskList';
import { AIFunctionMenu } from '@/components/ai/AIFunctionMenu';

export function InboxPage() {
  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={3}>Входящие</Title>
        <AIFunctionMenu />
      </Group>
      <TaskList
        filterParams={{ inbox: true, completed: false }}
        sectionTitle="Входящие"
        sectionIcon={<IconInbox size={18} />}
      />
    </>
  );
}
