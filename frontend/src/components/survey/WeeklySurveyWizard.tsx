import { useEffect, useRef } from 'react';
import {
  Modal,
  Stack,
  Text,
  Button,
  Group,
  TextInput,
  ActionIcon,
  Loader,
  Paper,
  Stepper,
  Center,
  Box,
} from '@mantine/core';
import { IconX, IconSparkles, IconArrowLeft, IconArrowRight, IconCheck } from '@tabler/icons-react';
import { useSurveyStore } from '@/stores/surveyStore';

const STEPS = [
  {
    title: 'Какой успех достигнут? \u{1F4AA}',
    description: 'Перечень достижений за прошлую неделю',
    dataKey: 'achievements' as const,
    hasAI: true,
  },
  {
    title: 'Какие трудности встретились на пути? \u{1F9F1}',
    description: 'Опишите трудности и препятствия прошлой недели',
    dataKey: 'difficulties' as const,
    hasAI: false,
  },
  {
    title: 'Что можно изменить на этой неделе? \u{2935}\u{FE0F}',
    description: 'AI предложит изменения на основе ваших ответов и профиля',
    dataKey: 'improvements' as const,
    hasAI: true,
  },
  {
    title: 'Какие цели поставим на эту неделю? \u{1F3AF}',
    description: 'Цели и задачи на текущую неделю',
    dataKey: 'weeklyGoals' as const,
    hasAI: true,
  },
];

/**
 * Editable list: items displayed as text lines with delete (x) button.
 * Last row is always an empty input for adding new items — just type and press Enter.
 * Click on any item text to edit it inline.
 */
function EditableList({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = value;
    onChange(updated);
  };

  const handleNewKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = e.currentTarget.value.trim();
      if (val) {
        onChange([...items, val]);
        e.currentTarget.value = '';
      }
    }
  };

  return (
    <Stack gap={4}>
      {items.map((item, i) => (
        <Group key={i} gap={4} wrap="nowrap" align="center">
          <TextInput
            variant="unstyled"
            value={item}
            onChange={(e) => updateItem(i, e.currentTarget.value)}
            style={{ flex: 1 }}
            size="sm"
            styles={{
              input: {
                paddingLeft: 8,
                borderBottom: '1px solid var(--mantine-color-default-border)',
                borderRadius: 0,
              },
            }}
          />
          <ActionIcon
            variant="subtle"
            color="gray"
            size="xs"
            onClick={() => removeItem(i)}
          >
            <IconX size={14} />
          </ActionIcon>
        </Group>
      ))}
      <TextInput
        ref={inputRef}
        placeholder={placeholder || 'Новый пункт — Enter для добавления'}
        size="sm"
        onKeyDown={handleNewKeyDown}
        styles={{
          input: {
            paddingLeft: 8,
            opacity: 0.7,
          },
        }}
      />
    </Stack>
  );
}

export function WeeklySurveyWizard() {
  const {
    wizardOpen,
    currentStep,
    generating,
    loading,
    achievements,
    difficulties,
    improvements,
    weeklyGoals,
    closeWizard,
    dismiss,
    generateForStep,
    setStepData,
    nextStep,
    prevStep,
    submit,
  } = useSurveyStore();

  const stepIndex = currentStep - 1;
  const stepConfig = STEPS[stepIndex];

  const dataMap = {
    achievements,
    difficulties,
    improvements,
    weeklyGoals,
  };

  const currentData = dataMap[stepConfig.dataKey];

  // On wizard open, trigger AI for step 1 if needed
  useEffect(() => {
    if (wizardOpen && currentStep === 1) {
      generateForStep(1);
    }
  }, [wizardOpen]);

  const handleNext = () => {
    if (currentStep < 4) {
      nextStep();
    } else {
      submit();
    }
  };

  return (
    <Modal
      opened={wizardOpen}
      onClose={closeWizard}
      title={
        <Group gap="xs">
          <IconSparkles size={20} color="var(--mantine-color-indigo-6)" />
          <Text fw={600}>Еженедельная ретроспектива</Text>
        </Group>
      }
      size="lg"
      closeOnClickOutside={false}
    >
      <Stack>
        <Stepper active={stepIndex} size="xs" color="indigo">
          <Stepper.Step label="Успехи" />
          <Stepper.Step label="Трудности" />
          <Stepper.Step label="Изменения" />
          <Stepper.Step label="Цели" />
        </Stepper>

        <Paper p="md" withBorder radius="md">
          <Stack>
            <Text fw={600} size="lg">
              {stepConfig.title}
            </Text>
            <Text size="sm" c="dimmed">
              {stepConfig.description}
            </Text>

            {generating ? (
              <Center py="xl">
                <Stack align="center" gap="xs">
                  <Loader size="sm" color="indigo" />
                  <Text size="sm" c="dimmed">
                    AI анализирует вашу неделю...
                  </Text>
                </Stack>
              </Center>
            ) : (
              <EditableList
                items={currentData}
                onChange={(data) => setStepData(currentStep, data)}
                placeholder={
                  currentStep === 2
                    ? 'Опишите трудность — Enter для добавления'
                    : 'Новый пункт — Enter для добавления'
                }
              />
            )}
          </Stack>
        </Paper>

        {!generating && stepConfig.hasAI && (
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconSparkles size={14} />}
            onClick={() => generateForStep(currentStep, true)}
          >
            {currentData.length > 0 ? 'Перегенерировать предложения AI' : 'Сгенерировать предложения AI'}
          </Button>
        )}

        <Group justify="space-between">
          <Box>
            {currentStep > 1 ? (
              <Button
                variant="default"
                leftSection={<IconArrowLeft size={16} />}
                onClick={prevStep}
              >
                Назад
              </Button>
            ) : (
              <Button variant="subtle" color="gray" onClick={dismiss}>
                Пропустить
              </Button>
            )}
          </Box>
          <Button
            rightSection={
              currentStep < 4 ? <IconArrowRight size={16} /> : <IconCheck size={16} />
            }
            onClick={handleNext}
            loading={loading}
            disabled={generating}
            color="indigo"
          >
            {currentStep < 4 ? 'Далее' : 'Завершить'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
