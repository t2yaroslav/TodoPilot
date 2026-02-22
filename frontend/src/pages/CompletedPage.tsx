import { Title, Stack } from '@mantine/core';
import { ProductivityChart } from '@/components/stats/ProductivityChart';
import { TaskList } from '@/components/tasks/TaskList';

export function CompletedPage() {
  return (
    <Stack>
      <Title order={3}>Выполнено</Title>
      <ProductivityChart />
      <TaskList filterParams={{ completed: true }} showAddButton={false} />
    </Stack>
  );
}
