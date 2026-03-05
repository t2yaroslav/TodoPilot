import { useState } from 'react';
import { Title, Stack, Button, Modal, TextInput, CopyButton, Group, Text, ActionIcon, Tooltip } from '@mantine/core';
import { IconCircleCheck, IconChartBar, IconCopy, IconCheck, IconExternalLink } from '@tabler/icons-react';
import { ProductivityChart } from '@/components/stats/ProductivityChart';
import { CompletedTaskList } from '@/components/tasks/CompletedTaskList';
import { getDashboardToken } from '@/api/client';

export function CompletedPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOpenDashboard = async () => {
    setLoading(true);
    try {
      const res = await getDashboardToken();
      const url = `${window.location.origin}/dashboard/${res.data.token}`;
      setDashboardUrl(url);
      setModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack>
      <Group justify="space-between" align="center">
        <Title order={3}>Выполнено</Title>
        <Button
          size="xs"
          variant="light"
          leftSection={<IconChartBar size={14} />}
          onClick={handleOpenDashboard}
          loading={loading}
        >
          Дашборд
        </Button>
      </Group>

      <ProductivityChart />

      <CompletedTaskList
        filterParams={{ completed: true }}
        sectionTitle="Выполнено"
        sectionIcon={<IconCircleCheck size={18} />}
      />

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Ссылка на дашборд"
        size="md"
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Уникальная ссылка для отображения дашборда на отдельном мониторе. Данные обновляются автоматически каждую минуту.
          </Text>
          {dashboardUrl && (
            <Group gap="xs" wrap="nowrap">
              <TextInput
                value={dashboardUrl}
                readOnly
                style={{ flex: 1 }}
                size="sm"
              />
              <CopyButton value={dashboardUrl}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'Скопировано!' : 'Копировать'}>
                    <ActionIcon
                      color={copied ? 'teal' : 'indigo'}
                      variant="light"
                      onClick={copy}
                      size="lg"
                    >
                      {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
              <Tooltip label="Открыть в новой вкладке">
                <ActionIcon
                  variant="light"
                  color="gray"
                  size="lg"
                  component="a"
                  href={dashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <IconExternalLink size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          )}
          <Text size="xs" c="dimmed">
            Страница доступна без авторизации — поделитесь ссылкой или откройте на отдельном мониторе.
          </Text>
        </Stack>
      </Modal>
    </Stack>
  );
}
