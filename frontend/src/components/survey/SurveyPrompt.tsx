import { Modal, Stack, Text, Button, Group } from '@mantine/core';
import { IconSparkles } from '@tabler/icons-react';
import { useSurveyStore } from '@/stores/surveyStore';

export function SurveyPrompt() {
  const { shouldShow, openWizard, dismiss } = useSurveyStore();

  const handleStart = () => {
    openWizard();
  };

  return (
    <Modal
      opened={shouldShow}
      onClose={dismiss}
      title={
        <Group gap="xs">
          <IconSparkles size={20} color="var(--mantine-color-indigo-6)" />
          <Text fw={600}>Обзор недели</Text>
        </Group>
      }
      size="sm"
    >
      <Stack>
        <Text size="sm">
          Начало новой недели — отличное время для обзора!
          AI поможет проанализировать прошлую неделю и спланировать новую.
        </Text>
        <Text size="sm" c="dimmed">
          Это займёт пару минут. Вы сможете отредактировать предложения AI.
        </Text>
        <Group justify="flex-end" mt="sm">
          <Button variant="subtle" color="gray" onClick={dismiss}>
            Не сейчас
          </Button>
          <Button
            color="indigo"
            leftSection={<IconSparkles size={16} />}
            onClick={handleStart}
          >
            Начать
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
