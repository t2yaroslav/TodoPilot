import { useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  Stack,
  Text,
  Button,
  Group,
  ActionIcon,
  Loader,
  Paper,
  Stepper,
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
    aiHint: 'AI Анализ: предложит ваши успехи за неделю',
    placeholder: 'Опишите достижение...',
  },
  {
    title: 'Какие трудности встретились на пути? \u{1F9F1}',
    description: '',
    dataKey: 'difficulties' as const,
    hasAI: false,
    aiHint: '',
    placeholder: 'Опиши что мешало тебе добиться целей...',
  },
  {
    title: 'Что можно изменить на этой неделе? \u{2935}\u{FE0F}',
    description: 'AI предложит изменения на основе ваших ответов и профиля',
    dataKey: 'improvements' as const,
    hasAI: true,
    aiHint: 'AI Анализ: предложит изменения в подходе к работе',
    placeholder: 'Что изменить...',
  },
  {
    title: 'Какие цели поставим на эту неделю? \u{1F3AF}',
    description: 'Цели и задачи на текущую неделю',
    dataKey: 'weeklyGoals' as const,
    hasAI: true,
    aiHint: 'AI Анализ: предложит цели на неделю',
    placeholder: 'Опишите цель...',
  },
];

/**
 * Editable bullet list:
 * - Each item is a contentEditable span with a bullet and a delete button
 * - Last line is an empty row for adding new items (type + Enter)
 * - Click any item to edit it inline
 * - Input for new items is at the BOTTOM
 */
function EditableList({
  items,
  onChange,
  placeholder,
  inputRef,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = value;
    onChange(updated);
  };

  const handleItemKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move focus to the "new item" input
      inputRef.current?.focus();
    }
    if (e.key === 'Backspace' && (e.currentTarget.textContent || '').trim() === '') {
      e.preventDefault();
      removeItem(index);
      // Focus previous item or new-input
      if (items.length > 1 && index > 0) {
        const prev = e.currentTarget.parentElement?.previousElementSibling?.querySelector<HTMLElement>('[contenteditable]');
        prev?.focus();
      } else {
        inputRef.current?.focus();
      }
    }
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
    <div style={{ minHeight: 32 }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 4,
            padding: '3px 0',
          }}
        >
          <span
            style={{
              color: 'var(--mantine-color-dimmed)',
              userSelect: 'none',
              lineHeight: '1.55',
              fontSize: 14,
              flexShrink: 0,
              paddingTop: 1,
            }}
          >
            &bull;
          </span>
          <div
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => {
              const text = (e.currentTarget.textContent || '').trim();
              if (text === '') {
                removeItem(i);
              } else if (text !== item) {
                updateItem(i, text);
              }
            }}
            onKeyDown={(e) => handleItemKeyDown(e, i)}
            style={{
              flex: 1,
              outline: 'none',
              fontSize: 14,
              lineHeight: '1.55',
              minHeight: 22,
              wordBreak: 'break-word',
            }}
          >
            {item}
          </div>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="xs"
            onClick={() => removeItem(i)}
            style={{ flexShrink: 0, marginTop: 3 }}
          >
            <IconX size={14} />
          </ActionIcon>
        </div>
      ))}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 0',
        }}
      >
        <span
          style={{
            color: 'var(--mantine-color-dimmed)',
            userSelect: 'none',
            lineHeight: '1.55',
            fontSize: 14,
            flexShrink: 0,
            opacity: 0.5,
          }}
        >
          &bull;
        </span>
        <input
          ref={inputRef}
          placeholder={placeholder}
          onKeyDown={handleNewKeyDown}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: 14,
            lineHeight: '1.55',
            background: 'transparent',
            color: 'inherit',
            fontFamily: 'inherit',
            padding: 0,
          }}
        />
      </div>
    </div>
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

  const newItemInputRef = useRef<HTMLInputElement>(null!);

  const stepIndex = currentStep - 1;
  const stepConfig = STEPS[stepIndex];

  const dataMap = {
    achievements,
    difficulties,
    improvements,
    weeklyGoals,
  };

  const currentData = dataMap[stepConfig.dataKey];

  // Auto-focus the new item input on step change and on wizard open
  useEffect(() => {
    if (wizardOpen) {
      const t = setTimeout(() => newItemInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [wizardOpen, currentStep]);

  // On wizard open, trigger AI for step 1 if needed
  useEffect(() => {
    if (wizardOpen && currentStep === 1) {
      generateForStep(1);
    }
  }, [wizardOpen]);

  /** Flush any pending text from the new-item input into the list */
  const flushPendingInput = useCallback(() => {
    const input = newItemInputRef.current;
    if (input) {
      const val = input.value.trim();
      if (val) {
        setStepData(currentStep, [...currentData, val]);
        input.value = '';
      }
    }
  }, [currentStep, currentData, setStepData]);

  const handleNext = () => {
    flushPendingInput();
    setTimeout(() => {
      if (currentStep < 4) {
        nextStep();
      } else {
        submit();
      }
    }, 0);
  };

  return (
    <Modal
      opened={wizardOpen}
      onClose={closeWizard}
      title={
        <Group gap="xs">
          <IconSparkles size={20} color="var(--mantine-color-indigo-6)" />
          <Text fw={600}>Обзор недели</Text>
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
          <Stack gap="xs">
            <Text fw={600} size="lg">
              {stepConfig.title}
            </Text>

            {currentData.length === 0 && !generating && stepConfig.description && (
              <Text size="sm" c="dimmed">
                {stepConfig.description}
              </Text>
            )}

            <EditableList
              items={currentData}
              onChange={(data) => setStepData(currentStep, data)}
              inputRef={newItemInputRef}
              placeholder={stepConfig.placeholder}
            />
          </Stack>
        </Paper>

        {/* AI status / regenerate button — outside the list box */}
        {stepConfig.hasAI && (
          generating ? (
            <Group gap="xs" justify="center">
              <Loader size="xs" color="indigo" />
              <Text size="xs" c="dimmed">
                {stepConfig.aiHint}
              </Text>
            </Group>
          ) : (
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconSparkles size={14} />}
              onClick={() => generateForStep(currentStep, true)}
            >
              {currentData.length > 0 ? 'Перегенерировать предложения AI' : 'Сгенерировать предложения AI'}
            </Button>
          )
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
            color="indigo"
          >
            {currentStep < 4 ? 'Далее' : 'Завершить'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
