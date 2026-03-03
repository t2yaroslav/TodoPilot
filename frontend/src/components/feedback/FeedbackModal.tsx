import { useState, useRef, useEffect } from 'react';
import {
  Modal,
  Textarea,
  SegmentedControl,
  Button,
  Group,
  Stack,
  Text,
  Image,
  CloseButton,
  Paper,
  Badge,
  Divider,
  Accordion,
} from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { IconPhoto, IconUpload, IconX, IconBug, IconBulb, IconMessageCircle } from '@tabler/icons-react';
import { useFeedbackStore } from '@/stores/feedbackStore';
import dayjs from 'dayjs';

const CATEGORIES = [
  { value: 'bug', label: 'Баг' },
  { value: 'feature', label: 'Идея' },
  { value: 'other', label: 'Другое' },
];

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

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: 'Новый', color: 'blue' },
  in_progress: { label: 'В работе', color: 'yellow' },
  resolved: { label: 'Решён', color: 'green' },
};

export function FeedbackModal() {
  const { modalOpen, closeModal, submit, submitting, myFeedback, fetchMyFeedback } = useFeedbackStore();
  const [category, setCategory] = useState('bug');
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const openRef = useRef<() => void>(null);

  useEffect(() => {
    if (modalOpen) fetchMyFeedback();
  }, [modalOpen]);

  const handleClose = () => {
    setCategory('bug');
    setMessage('');
    setScreenshot(null);
    setPreview(null);
    closeModal();
  };

  const handleDrop = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      notifications.show({ title: 'Ошибка', message: 'Файл слишком большой (макс. 10 МБ)', color: 'red' });
      return;
    }
    setScreenshot(file);
    setPreview(URL.createObjectURL(file));
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      notifications.show({ title: 'Ошибка', message: 'Введите сообщение', color: 'red' });
      return;
    }
    await submit(category, message.trim(), screenshot);
    notifications.show({ title: 'Спасибо!', message: 'Ваш отзыв отправлен', color: 'green' });
    setCategory('bug');
    setMessage('');
    setScreenshot(null);
    setPreview(null);
    fetchMyFeedback();
  };

  const feedbackWithResponses = myFeedback.filter((f) => f.admin_response);

  return (
    <Modal
      opened={modalOpen}
      onClose={handleClose}
      title="Обратная связь"
      size="md"
    >
      <Stack gap="md">
        <SegmentedControl
          value={category}
          onChange={setCategory}
          data={CATEGORIES.map((c) => ({
            value: c.value,
            label: (
              <Group gap={6} wrap="nowrap">
                {CATEGORY_ICONS[c.value]}
                <span>{c.label}</span>
              </Group>
            ),
          }))}
          fullWidth
        />

        <Textarea
          placeholder={
            category === 'bug'
              ? 'Опишите проблему: что произошло и что ожидалось...'
              : category === 'feature'
              ? 'Опишите вашу идею...'
              : 'Ваше сообщение...'
          }
          value={message}
          onChange={(e) => setMessage(e.currentTarget.value)}
          minRows={4}
          maxRows={8}
          autosize
        />

        {!screenshot ? (
          <Dropzone
            onDrop={handleDrop}
            accept={IMAGE_MIME_TYPE}
            maxSize={10 * 1024 * 1024}
            openRef={openRef}
            styles={{
              root: { padding: 16, borderStyle: 'dashed' },
            }}
          >
            <Group justify="center" gap="sm" style={{ pointerEvents: 'none' }}>
              <Dropzone.Accept>
                <IconUpload size={24} stroke={1.5} />
              </Dropzone.Accept>
              <Dropzone.Reject>
                <IconX size={24} stroke={1.5} />
              </Dropzone.Reject>
              <Dropzone.Idle>
                <IconPhoto size={24} stroke={1.5} />
              </Dropzone.Idle>
              <Text size="sm" c="dimmed">
                Перетащите скриншот или нажмите для выбора
              </Text>
            </Group>
          </Dropzone>
        ) : (
          <Paper withBorder p="xs" pos="relative">
            <CloseButton
              size="sm"
              pos="absolute"
              top={4}
              right={4}
              onClick={removeScreenshot}
              style={{ zIndex: 1 }}
            />
            <Image
              src={preview}
              alt="Screenshot preview"
              radius="sm"
              mah={200}
              fit="contain"
            />
          </Paper>
        )}

        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleClose}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            Отправить
          </Button>
        </Group>

        {feedbackWithResponses.length > 0 && (
          <>
            <Divider />
            <Accordion variant="contained">
              <Accordion.Item value="history">
                <Accordion.Control>
                  <Text size="sm" fw={500}>Ответы на ваши обращения ({feedbackWithResponses.length})</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="sm">
                    {feedbackWithResponses.map((f) => {
                      const statusInfo = STATUS_LABELS[f.status] || STATUS_LABELS.new;
                      return (
                        <Paper key={f.id} withBorder p="xs" radius="sm">
                          <Group gap="xs" mb={4}>
                            {CATEGORY_ICONS[f.category]}
                            <Text size="xs" fw={500}>{CATEGORY_LABELS[f.category]}</Text>
                            <Badge size="xs" color={statusInfo.color} variant="light">{statusInfo.label}</Badge>
                            <Text size="xs" c="dimmed">{dayjs(f.created_at).format('DD.MM.YYYY')}</Text>
                          </Group>
                          <Text size="xs" c="dimmed" lineClamp={2} mb={4}>{f.message}</Text>
                          <Paper bg="var(--mantine-color-indigo-light)" p="xs" radius="sm">
                            <Text size="xs" fw={500} mb={2}>Ответ:</Text>
                            <Text size="xs">{f.admin_response}</Text>
                          </Paper>
                        </Paper>
                      );
                    })}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </>
        )}
      </Stack>
    </Modal>
  );
}
