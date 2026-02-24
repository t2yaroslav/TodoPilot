import { Title, Stack } from '@mantine/core';
import { ProductivityChart } from '@/components/stats/ProductivityChart';
import { CompletedTaskList } from '@/components/tasks/CompletedTaskList';

export function CompletedPage() {
  return (
    <Stack>
      <Title order={3}>Выполнено</Title>
      <ProductivityChart />
      <CompletedTaskList filterParams={{ completed: true }} />
    </Stack>
  );
}
