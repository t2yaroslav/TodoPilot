import { useState } from 'react';
import { Menu, ActionIcon, Text, Group, Badge, Stack, Loader, ThemeIcon } from '@mantine/core';
import {
  IconSparkles,
  IconChartBar,
  IconBrain,
  IconSunrise,
  IconMessageChatbot,
  IconClipboardList,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { AnalysisModal } from './AnalysisModal';
import { BrainDumpModal } from './BrainDumpModal';
import { MorningPlanModal } from './MorningPlanModal';
import { SmartChatModal } from './SmartChatModal';
import { useSurveyStore } from '@/stores/surveyStore';
import { useAITaskStore } from '@/stores/aiTaskStore';

const pulseKeyframes = `
@keyframes ai-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.5); }
  50% { box-shadow: 0 0 0 6px rgba(99, 102, 241, 0); }
}
`;

export function AIFunctionMenu() {
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [brainDumpOpen, setBrainDumpOpen] = useState(false);
  const [morningPlanOpen, setMorningPlanOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const openWizard = useSurveyStore((s) => s.openWizard);
  const { tasks, hasRunning, hasFinished, dismissTask, clearFinished } = useAITaskStore();

  const finishedTasks = tasks.filter((t) => t.status === 'done' || t.status === 'error');
  const runningTasks = tasks.filter((t) => t.status === 'running');

  return (
    <>
      <style>{pulseKeyframes}</style>
      <Menu shadow="md" width={280} position="bottom-end">
        <Menu.Target>
          <ActionIcon
            variant="light"
            color="indigo"
            size="lg"
            title="AI-помощник"
            style={
              hasRunning
                ? { animation: 'ai-pulse 1.5s ease-in-out infinite' }
                : undefined
            }
            pos="relative"
          >
            <IconSparkles size={20} />
            {hasFinished && !hasRunning && (
              <Badge
                size="xs"
                circle
                color="green"
                variant="filled"
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  width: 14,
                  height: 14,
                  padding: 0,
                  minWidth: 'unset',
                  fontSize: 9,
                }}
              >
                {finishedTasks.length}
              </Badge>
            )}
          </ActionIcon>
        </Menu.Target>

        <Menu.Dropdown>
          {/* Background tasks section */}
          {(runningTasks.length > 0 || finishedTasks.length > 0) && (
            <>
              <Menu.Label>
                <Group justify="space-between">
                  <Text size="xs">Фоновые задачи</Text>
                  {finishedTasks.length > 0 && (
                    <Text
                      size="xs"
                      c="dimmed"
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFinished();
                      }}
                    >
                      Очистить
                    </Text>
                  )}
                </Group>
              </Menu.Label>
              {tasks
                .filter((t) => t.status === 'running' || t.status === 'done' || t.status === 'error')
                .map((task) => (
                  <Menu.Item
                    key={task.id}
                    leftSection={
                      task.status === 'running' ? (
                        <Loader size={14} color="indigo" />
                      ) : task.status === 'done' ? (
                        <ThemeIcon size="xs" color="green" variant="light" radius="xl">
                          <IconCheck size={10} />
                        </ThemeIcon>
                      ) : (
                        <ThemeIcon size="xs" color="red" variant="light" radius="xl">
                          <IconX size={10} />
                        </ThemeIcon>
                      )
                    }
                    rightSection={
                      task.status !== 'running' ? (
                        <ActionIcon
                          size="xs"
                          variant="subtle"
                          color="gray"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissTask(task.id);
                          }}
                        >
                          <IconX size={12} />
                        </ActionIcon>
                      ) : undefined
                    }
                    disabled={task.status === 'running'}
                    closeMenuOnClick={false}
                  >
                    <Stack gap={0}>
                      <Text size="xs">{task.label}</Text>
                      {task.status === 'error' && task.error && (
                        <Text size="xs" c="red">{task.error}</Text>
                      )}
                    </Stack>
                  </Menu.Item>
                ))}
              <Menu.Divider />
            </>
          )}

          <Menu.Label>AI-помощник</Menu.Label>
          <Menu.Item
            leftSection={<IconChartBar size={16} />}
            onClick={() => setAnalysisOpen(true)}
          >
            Анализ
          </Menu.Item>
          <Menu.Item
            leftSection={<IconBrain size={16} />}
            onClick={() => setBrainDumpOpen(true)}
          >
            Выгрузка из головы
          </Menu.Item>
          <Menu.Item
            leftSection={<IconSunrise size={16} />}
            onClick={() => setMorningPlanOpen(true)}
          >
            Утренний план
          </Menu.Item>
          <Menu.Item
            leftSection={<IconClipboardList size={16} />}
            onClick={openWizard}
          >
            Обзор недели
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            leftSection={<IconMessageChatbot size={16} />}
            onClick={() => setChatOpen(true)}
          >
            AI-чат
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <AnalysisModal opened={analysisOpen} onClose={() => setAnalysisOpen(false)} />
      <BrainDumpModal opened={brainDumpOpen} onClose={() => setBrainDumpOpen(false)} />
      <MorningPlanModal opened={morningPlanOpen} onClose={() => setMorningPlanOpen(false)} />
      <SmartChatModal opened={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
