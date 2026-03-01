import { Title } from '@mantine/core';
import { IconCalendarWeek } from '@tabler/icons-react';
import { TaskList } from '@/components/tasks/TaskList';

export function UpcomingPage() {
  return (
    <>
      <Title order={3} mb="md">Предстоящие</Title>
      <TaskList
        filterParams={{ upcoming: true, completed: false }}
        sectionTitle="Предстоящие"
        sectionIcon={<IconCalendarWeek size={18} />}
      />
    </>
  );
}
