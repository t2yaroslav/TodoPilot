import { useEffect, useState } from 'react';
import {
  Title,
  SegmentedControl,
  Stack,
  Paper,
  Group,
  Text,
  Badge,
  Textarea,
  Button,
  Image,
  Modal,
  Select,
  Box,
  Loader,
  Center,
} from '@mantine/core';
import { IconBug, IconBulb, IconMessageCircle, IconPhoto } from '@tabler/icons-react';
import { useFeedbackStore, FeedbackItem } from '@/stores/feedbackStore';
import dayjs from 'dayjs';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: 'Новый', color: 'blue' },
  in_progress: { label: 'В работе', color: 'yellow' },
  resolved: { label: 'Решён', color: 'green' },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  bug: <IconBug size={16} />,
  feature: <IconBulb size={16} />,
  other: <IconMessageCircle size={16} />,
};

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Баг',
  feature: 'Идея',
  other: 'Другое',
};

function FeedbackCard({ item }: { item: FeedbackItem }) {
  const { updateFeedback } = useFeedbackStore();
  const [response, setResponse] = useState(item.admin_response || '');
  const [saving, setSaving] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const statusInfo = STATUS_LABELS[item.status] || STATUS_LABELS.new;

  const handleStatusChange = async (val: string | null) => {
    if (!val) return;
    await updateFeedback(item.id, { status: val });
  };

  const handleSaveResponse = async () => {
    setSaving(true);
    try {
      await updateFeedback(item.id, { admin_response: response });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between" wrap="wrap">
          <Group gap="xs">
            {CATEGORY_ICONS[item.category]}
            <Text fw={500}>{CATEGORY_LABELS[item.category] || item.category}</Text>
            <Badge color={statusInfo.color} variant="light" size="sm">
              {statusInfo.label}
            </Badge>
          </Group>
          <Text size="xs" c="dimmed">
            {dayjs(item.created_at).format('DD.MM.YYYY HH:mm')}
          </Text>
        </Group>

        <Group gap="xs">
          <Text size="xs" c="dimmed">
            {item.user_email}
            {item.user_name ? ` (${item.user_name})` : ''}
          </Text>
        </Group>

        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{item.message}</Text>

        {item.screenshot_path && (
          <>
            <Box
              style={{ cursor: 'pointer', display: 'inline-block' }}
              onClick={() => setImageOpen(true)}
            >
              <Group gap={4}>
                <IconPhoto size={14} />
                <Text size="xs" c="blue" td="underline">Скриншот</Text>
              </Group>
            </Box>
            <Modal opened={imageOpen} onClose={() => setImageOpen(false)} size="xl" title="Скриншот">
              <Image
                src={`/api/feedback/uploads/${item.screenshot_path}`}
                alt="Screenshot"
                radius="sm"
              />
            </Modal>
          </>
        )}

        <Group gap="sm" align="flex-end">
          <Select
            label="Статус"
            size="xs"
            value={item.status}
            onChange={handleStatusChange}
            data={[
              { value: 'new', label: 'Новый' },
              { value: 'in_progress', label: 'В работе' },
              { value: 'resolved', label: 'Решён' },
            ]}
            w={140}
          />
        </Group>

        <Textarea
          label="Ответ пользователю"
          size="xs"
          placeholder="Напишите ответ..."
          value={response}
          onChange={(e) => setResponse(e.currentTarget.value)}
          minRows={2}
          autosize
        />
        <Group justify="flex-end">
          <Button
            size="xs"
            onClick={handleSaveResponse}
            loading={saving}
            disabled={response === (item.admin_response || '')}
          >
            Сохранить ответ
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}

export function AdminFeedbackPage() {
  const { adminFeedback, adminLoading, fetchAdminFeedback } = useFeedbackStore();
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchAdminFeedback(filter === 'all' ? undefined : filter);
  }, [filter]);

  return (
    <Stack gap="lg">
      <Title order={2}>Обратная связь</Title>

      <SegmentedControl
        value={filter}
        onChange={setFilter}
        data={[
          { value: 'all', label: 'Все' },
          { value: 'new', label: 'Новые' },
          { value: 'in_progress', label: 'В работе' },
          { value: 'resolved', label: 'Решённые' },
        ]}
      />

      {adminLoading ? (
        <Center py="xl"><Loader /></Center>
      ) : adminFeedback.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">Нет обращений</Text>
      ) : (
        <Stack gap="md">
          {adminFeedback.map((item) => (
            <FeedbackCard key={item.id} item={item} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
