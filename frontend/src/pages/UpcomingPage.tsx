import { Title } from '@mantine/core';
import { TaskList } from '@/components/tasks/TaskList';

export function UpcomingPage() {
  return (
    <>
      <Title order={3} mb="md">Предстоящие</Title>
      <TaskList filterParams={{ completed: false }} />
    </>
  );
}
