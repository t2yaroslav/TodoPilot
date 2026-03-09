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
  ScrollArea,
  List,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconX,
  IconSparkles,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconTrophy,
  IconAlertTriangle,
  IconBulb,
  IconTarget,
  IconClipboardCheck,
  IconCircleCheck,
  IconCircleX,
  IconQuestionMark,
} from '@tabler/icons-react';
import { useSurveyStore } from '@/stores/surveyStore';

const STEPS = [
  {
    step: 1,
    title: 'Итоги недели 📋',
    description: 'Отметьте выполненные и невыполненные цели прошлой недели',
    dataKey: 'goalOutcomes' as const,
    hasAI: false,
    aiHint: '',
    placeholder: '',
    icon: IconClipboardCheck,
    iconColor: 'violet',
    label: 'Итоги',
  },
  {
    step: 2,
    title: 'Какой успех достигнут? 💪',
    description: 'Перечень достижений за прошлую неделю',
    dataKey: 'achievements' as const,
    hasAI: true,
    aiHint: 'AI Анализ: предложит ваши успехи за неделю',
    placeholder: 'Опишите достижение...',
    icon: IconTrophy,
    iconColor: 'green',
    label: 'Успехи',
  },
  {
    step: 3,
    title: 'Какие трудности встретились на пути? 🧱',
    description: '',
    dataKey: 'difficulties' as const,
    hasAI: false,
    aiHint: '',
    placeholder: 'Опиши что мешало тебе добиться целей...',
    icon: IconAlertTriangle,
    iconColor: 'orange',
    label: 'Трудности',
  },
  {
    step: 4,
    title: 'Что можно изменить на этой неделе? ⤵️',
    description: 'AI предложит изменения на основе ваших ответов и профиля',
    dataKey: 'improvements' as const,
    hasAI: true,
    aiHint: 'AI Анализ: предложит изменения в подходе к работе',
    placeholder: 'Что изменить...',
    icon: IconBulb,
    iconColor: 'blue',
    label: 'Изменения',
  },
  {
    step: 5,
    title: 'Какие цели поставим на эту неделю? 🎯',
    description: 'Цели и задачи на текущую неделю',
    dataKey: 'weeklyGoals' as const,
    hasAI: true,
    aiHint: 'AI Анализ: предложит цели на неделю',
    placeholder: 'Опишите цель...',
    icon: IconTarget,
    iconColor: 'indigo',
    label: 'Цели',
  },
];

/**
 * Editable bullet list:
 * - Each item is a contentEditable span with a bullet and a delete button
 * - Last line is an empty row for adding new items (type + Enter)
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
      inputRef.current?.focus();
    }
    if (e.key === 'Backspace' && (e.currentTarget.textContent || '').trim() === '') {
      e.preventDefault();
      removeItem(index);
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

/**
 * Goal outcomes checklist for step 1.
 * Flat list with status icon on the right.
 * Click cycles: ? (question) → ✓ (done) → ✗ (not done) → ✓ → ✗ → ...
 */
function GoalOutcomesChecklist() {
  const { goalOutcomes, setGoalOutcome, noGoalsMessage } = useSurveyStore();

  if (goalOutcomes.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {noGoalsMessage || 'Нет целей прошлой недели для оценки.'}
      </Text>
    );
  }

  const handleToggle = (index: number, current: boolean | null) => {
    // null (question) → true (done) → false (not done) → true → false → ...
    if (current === null || current === undefined) return setGoalOutcome(index, true);
    if (current === true) return setGoalOutcome(index, false);
    return setGoalOutcome(index, true);
  };

  return (
    <Stack gap={0}>
      {goalOutcomes.map((outcome, i) => {
        const isDone = outcome.completed === true;
        const isFailed = outcome.completed === false;
        const isUnmarked = outcome.completed === null || outcome.completed === undefined;

        const icon = isDone
          ? <IconCircleCheck size={20} />
          : isFailed
            ? <IconCircleX size={20} />
            : <IconQuestionMark size={20} />;
        const color = isDone ? 'green' : isFailed ? 'red' : 'gray';
        const tooltip = isDone ? 'Выполнено' : isFailed ? 'Не выполнено' : 'Не отмечено';

        return (
          <Box
            key={i}
            py={10}
            px="sm"
            style={{
              borderBottom: '1px solid var(--mantine-color-default-border)',
            }}
          >
            <Group gap="sm" wrap="nowrap" align="center">
              <Text
                size="sm"
                td={isDone ? 'line-through' : undefined}
                c={isDone ? 'dimmed' : undefined}
                style={{ flex: 1 }}
              >
                {outcome.goal}
              </Text>
              <Tooltip label={tooltip} position="left">
                <ActionIcon
                  variant={isUnmarked ? 'subtle' : 'light'}
                  color={color}
                  size="md"
                  radius="xl"
                  onClick={() => handleToggle(i, outcome.completed)}
                >
                  {icon}
                </ActionIcon>
              </Tooltip>
            </Group>
          </Box>
        );
      })}
    </Stack>
  );
}

/**
 * Sidebar showing completed previous steps during the survey.
 */
function PreviousStepsSidebar({ currentStep }: { currentStep: number }) {
  const { goalOutcomes, achievements, difficulties, improvements, previousWeekGoals } = useSurveyStore();

  const hasGoalOutcomes = previousWeekGoals.length > 0;

  const completedSteps: { step: number; title: string; icon: typeof IconTrophy; iconColor: string; items: string[] }[] = [];

  if (currentStep > 1 && hasGoalOutcomes) {
    const items = goalOutcomes.map(
      (o) => `${o.completed ? '✅' : '❌'} ${o.goal}`
    );
    if (items.length > 0) {
      completedSteps.push({
        step: 1,
        title: 'Итоги недели',
        icon: IconClipboardCheck,
        iconColor: 'violet',
        items,
      });
    }
  }

  if (currentStep > 2) {
    if (achievements.length > 0) {
      completedSteps.push({
        step: 2,
        title: 'Успехи',
        icon: IconTrophy,
        iconColor: 'green',
        items: achievements,
      });
    }
  }

  if (currentStep > 3) {
    if (difficulties.length > 0) {
      completedSteps.push({
        step: 3,
        title: 'Трудности',
        icon: IconAlertTriangle,
        iconColor: 'orange',
        items: difficulties,
      });
    }
  }

  if (currentStep > 4) {
    if (improvements.length > 0) {
      completedSteps.push({
        step: 4,
        title: 'Изменения',
        icon: IconBulb,
        iconColor: 'blue',
        items: improvements,
      });
    }
  }

  if (completedSteps.length === 0) return null;

  return (
    <ScrollArea h="100%" offsetScrollbars>
      <Stack gap="xs">
        <Text size="xs" fw={600} c="dimmed" tt="uppercase">
          Предыдущие ответы
        </Text>
        {completedSteps.map((s) => (
          <Paper key={s.step} p="xs" withBorder radius="sm" bg="var(--mantine-color-default)">
            <Group gap={4} mb={4}>
              <ThemeIcon size="xs" color={s.iconColor} variant="light">
                <s.icon size={12} />
              </ThemeIcon>
              <Text size="xs" fw={600}>
                {s.title}
              </Text>
            </Group>
            <List size="xs" spacing={2}>
              {s.items.map((item, i) => (
                <List.Item key={i}>
                  <Text size="xs" c="dimmed" lineClamp={2}>
                    {item}
                  </Text>
                </List.Item>
              ))}
            </List>
          </Paper>
        ))}
      </Stack>
    </ScrollArea>
  );
}

export function WeeklySurveyWizard() {
  const {
    wizardOpen,
    currentStep,
    generating,
    loading,
    previousWeekGoals,
    goalOutcomes,
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

  const hasGoalOutcomes = previousWeekGoals.length > 0;

  // Get the step config for the current step number
  const stepConfig = STEPS.find((s) => s.step === currentStep)!;

  // Determine visible steps for the stepper
  const visibleSteps = hasGoalOutcomes ? STEPS : STEPS.filter((s) => s.step !== 1);
  const stepperIndex = visibleSteps.findIndex((s) => s.step === currentStep);

  const dataMap: Record<string, string[]> = {
    achievements,
    difficulties,
    improvements,
    weeklyGoals,
  };

  const isGoalOutcomesStep = currentStep === 1;
  const currentData = isGoalOutcomesStep ? [] : (dataMap[stepConfig.dataKey] || []);

  // Check if all goal outcomes are marked (for step 1 validation)
  const allGoalsMarked = goalOutcomes.length === 0 || goalOutcomes.every(
    (o) => o.completed === true || o.completed === false
  );

  const canProceed = isGoalOutcomesStep ? allGoalsMarked : true;

  // Auto-focus the new item input on step change and on wizard open
  useEffect(() => {
    if (wizardOpen && !isGoalOutcomesStep) {
      const t = setTimeout(() => newItemInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [wizardOpen, currentStep, isGoalOutcomesStep]);

  // On wizard open, trigger AI for step 2 if starting there (no goal outcomes)
  useEffect(() => {
    if (wizardOpen && currentStep === 2 && !hasGoalOutcomes) {
      generateForStep(2);
    }
  }, [wizardOpen]);

  /** Flush any pending text from the new-item input into the list */
  const flushPendingInput = useCallback(() => {
    if (isGoalOutcomesStep) return;
    const input = newItemInputRef.current;
    if (input) {
      const val = input.value.trim();
      if (val) {
        setStepData(currentStep, [...currentData, val]);
        input.value = '';
      }
    }
  }, [currentStep, currentData, setStepData, isGoalOutcomesStep]);

  const handleNext = () => {
    flushPendingInput();
    setTimeout(() => {
      if (currentStep < 5) {
        nextStep();
      } else {
        submit();
      }
    }, 0);
  };

  const minStep = hasGoalOutcomes ? 1 : 2;

  // Check if sidebar should be shown (only when there are completed previous steps)
  const showSidebar = currentStep > minStep;

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
      size={showSidebar ? 900 : 'xl'}
      closeOnClickOutside={false}
    >
      <Stack>
        <Stepper active={stepperIndex} size="xs" color="indigo">
          {visibleSteps.map((s) => (
            <Stepper.Step key={s.step} label={s.label} />
          ))}
        </Stepper>

        <div style={{
          display: showSidebar ? 'flex' : 'block',
          gap: 16,
          minHeight: 200,
        }}>
          {/* Previous steps sidebar */}
          {showSidebar && (
            <Box
              style={{
                width: 220,
                minWidth: 220,
                flexShrink: 0,
                borderRight: '1px solid var(--mantine-color-default-border)',
                paddingRight: 16,
              }}
            >
              <PreviousStepsSidebar currentStep={currentStep} />
            </Box>
          )}

          {/* Main content area */}
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Paper p="md" withBorder radius="md">
              <Stack gap="xs">
                <Text fw={600} size="lg">
                  {stepConfig.title}
                </Text>

                {isGoalOutcomesStep ? (
                  <GoalOutcomesChecklist />
                ) : (
                  <>
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
                  </>
                )}
              </Stack>
            </Paper>

            {/* AI status / regenerate button */}
            {stepConfig.hasAI && (
              generating ? (
                <Group gap="xs" justify="center" mt="xs">
                  <Loader size="xs" color="indigo" />
                  <Text size="xs" c="dimmed">
                    {stepConfig.aiHint}
                  </Text>
                </Group>
              ) : (
                <Button
                  variant="subtle"
                  size="xs"
                  mt="xs"
                  leftSection={<IconSparkles size={14} />}
                  onClick={() => generateForStep(currentStep, true)}
                >
                  {currentData.length > 0 ? 'Перегенерировать предложения AI' : 'Сгенерировать предложения AI'}
                </Button>
              )
            )}

            {/* Validation message for goal outcomes */}
            {isGoalOutcomesStep && !allGoalsMarked && goalOutcomes.length > 0 && (
              <Text size="xs" c="orange" mt="xs">
                Отметьте все цели, чтобы продолжить
              </Text>
            )}
          </Box>
        </div>

        <Group justify="space-between">
          <Box>
            {currentStep > minStep ? (
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
              currentStep < 5 ? <IconArrowRight size={16} /> : <IconCheck size={16} />
            }
            onClick={handleNext}
            loading={loading}
            color="indigo"
            disabled={!canProceed}
          >
            {currentStep < 5 ? 'Далее' : 'Завершить'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
