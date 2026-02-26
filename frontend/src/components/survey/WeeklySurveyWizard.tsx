import { useEffect, useState } from 'react';
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
import { IconPlus, IconTrash, IconSparkles, IconArrowLeft, IconArrowRight, IconCheck } from '@tabler/icons-react';
import { useSurveyStore } from '@/stores/surveyStore';

const STEPS = [
  {
    title: 'Какой успех достигнут? \u{1F4AA}',
    description: 'Перечень достижений за прошлую неделю',
    dataKey: 'achievements' as const,
  },
  {
    title: 'Какие трудности встретились на пути? \u{1F9F1}',
    description: 'Трудности и препятствия прошлой недели',
    dataKey: 'difficulties' as const,
  },
  {
    title: 'Что можно изменить на этой неделе? \u{2935}\u{FE0F}',
    description: 'Предложения по улучшению продуктивности',
    dataKey: 'improvements' as const,
  },
  {
    title: 'Какие цели поставим на эту неделю? \u{1F3AF}',
    description: 'Цели и задачи на текущую неделю',
    dataKey: 'weeklyGoals' as const,
  },
];

function EditableList({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    const text = newItem.trim();
    if (text) {
      onChange([...items, text]);
      setNewItem('');
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = value;
    onChange(updated);
  };

  return (
    <Stack gap="xs">
      {items.map((item, i) => (
        <Group key={i} gap="xs" wrap="nowrap">
          <TextInput
            value={item}
            onChange={(e) => updateItem(i, e.currentTarget.value)}
            style={{ flex: 1 }}
            size="sm"
          />
          <ActionIcon
            variant="subtle"
            color="red"
            size="sm"
            onClick={() => removeItem(i)}
          >
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
      ))}
      <Group gap="xs" wrap="nowrap">
        <TextInput
          value={newItem}
          onChange={(e) => setNewItem(e.currentTarget.value)}
          placeholder={placeholder || 'Добавить пункт...'}
          style={{ flex: 1 }}
          size="sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <ActionIcon variant="light" color="indigo" size="sm" onClick={addItem}>
          <IconPlus size={14} />
        </ActionIcon>
      </Group>
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
    generateStep,
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

  // Generate AI suggestions when step changes
  useEffect(() => {
    if (wizardOpen && currentData.length === 0) {
      generateStep(currentStep);
    }
  }, [currentStep, wizardOpen]);

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
                placeholder="Добавить пункт..."
              />
            )}
          </Stack>
        </Paper>

        {!generating && currentData.length === 0 && (
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconSparkles size={14} />}
            onClick={() => generateStep(currentStep)}
          >
            Сгенерировать предложения AI
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
