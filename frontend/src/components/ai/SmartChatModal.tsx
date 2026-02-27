import { useState, useRef, useEffect } from 'react';
import { Modal, Textarea, Button, Stack, Text, Paper, ScrollArea, Loader, Group, Avatar, Badge } from '@mantine/core';
import { IconMessageChatbot, IconPlus, IconCheck, IconArrowRight } from '@tabler/icons-react';
import { aiSmartChat, aiExecuteAction, submitAndPoll } from '@/api/client';
import { useTaskStore } from '@/stores/taskStore';

interface Props {
  opened: boolean;
  onClose: () => void;
}

interface TaskAction {
  action: string;
  task_id?: string;
  title?: string;
  project_id?: string;
  goal_id?: string;
  priority?: number;
  due_date?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  actions?: TaskAction[];
  executedActions?: Record<number, 'pending' | 'done' | 'error'>;
}

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: typeof IconPlus }> = {
  create: { label: 'Создать', color: 'green', icon: IconPlus },
  complete: { label: 'Завершить', color: 'blue', icon: IconCheck },
  move: { label: 'Переместить', color: 'orange', icon: IconArrowRight },
};

export function SmartChatModal({ opened, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const { refreshAllCounts } = useTaskStore();

  useEffect(() => {
    if (viewport.current) {
      viewport.current.scrollTo({ top: viewport.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build history for context (last 10 messages, without actions metadata)
      const history = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const data = await submitAndPoll<{ reply: string; actions?: TaskAction[] }>(
        () => aiSmartChat(userMsg.content, history),
      );
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.reply,
        actions: data.actions && data.actions.length > 0 ? data.actions : undefined,
        executedActions: {},
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Ошибка при обращении к AI. Проверьте настройки.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (msgIndex: number, actionIndex: number, action: TaskAction) => {
    // Mark action as pending
    setMessages((prev) =>
      prev.map((msg, i) =>
        i === msgIndex
          ? { ...msg, executedActions: { ...msg.executedActions, [actionIndex]: 'pending' } }
          : msg,
      ),
    );

    try {
      await aiExecuteAction(action as unknown as Record<string, unknown>);
      setMessages((prev) =>
        prev.map((msg, i) =>
          i === msgIndex
            ? { ...msg, executedActions: { ...msg.executedActions, [actionIndex]: 'done' } }
            : msg,
        ),
      );
      refreshAllCounts();
    } catch {
      setMessages((prev) =>
        prev.map((msg, i) =>
          i === msgIndex
            ? { ...msg, executedActions: { ...msg.executedActions, [actionIndex]: 'error' } }
            : msg,
        ),
      );
    }
  };

  const getActionDescription = (action: TaskAction): string => {
    switch (action.action) {
      case 'create':
        return action.title || 'Новая задача';
      case 'complete':
        return action.title || `Задача ${action.task_id?.slice(0, 8)}`;
      case 'move':
        return action.title || `Задача ${action.task_id?.slice(0, 8)}`;
      default:
        return 'Действие';
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconMessageChatbot size={20} color="var(--mantine-color-indigo-6)" />
          <Text fw={600}>AI-чат</Text>
        </Group>
      }
      size="lg"
    >
      <Stack h={450}>
        <ScrollArea style={{ flex: 1 }} viewportRef={viewport}>
          <Stack gap="sm" p="xs">
            {messages.length === 0 && (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                Чат с AI-помощником. Можно попросить создать, закрыть или переместить задачи прямо в диалоге.
              </Text>
            )}
            {messages.map((msg, msgIdx) => (
              <div key={msgIdx}>
                <Group align="flex-start" gap="xs" wrap="nowrap">
                  <Avatar size="sm" color={msg.role === 'assistant' ? 'indigo' : 'blue'} radius="xl">
                    {msg.role === 'assistant' ? 'AI' : 'Я'}
                  </Avatar>
                  <Paper
                    p="xs"
                    bg={msg.role === 'assistant' ? 'var(--mantine-color-indigo-light)' : 'var(--mantine-color-blue-light)'}
                    radius="md"
                    style={{ flex: 1 }}
                  >
                    <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Text>
                  </Paper>
                </Group>

                {msg.actions && msg.actions.length > 0 && (
                  <Stack gap={4} mt={6} ml={36}>
                    {msg.actions.map((action, actIdx) => {
                      const config = ACTION_CONFIG[action.action] || ACTION_CONFIG.create;
                      const Icon = config.icon;
                      const status = msg.executedActions?.[actIdx];

                      return (
                        <Paper key={actIdx} p="xs" radius="md" withBorder>
                          <Group justify="space-between" wrap="nowrap">
                            <Group gap="xs" wrap="nowrap" style={{ flex: 1 }}>
                              <Badge size="xs" color={config.color} variant="light">
                                {config.label}
                              </Badge>
                              <Text size="sm" truncate style={{ flex: 1 }}>
                                {getActionDescription(action)}
                              </Text>
                            </Group>
                            {status === 'done' ? (
                              <Badge size="xs" color="green">Готово</Badge>
                            ) : status === 'error' ? (
                              <Badge size="xs" color="red">Ошибка</Badge>
                            ) : (
                              <Button
                                size="compact-xs"
                                variant="light"
                                color={config.color}
                                leftSection={<Icon size={12} />}
                                loading={status === 'pending'}
                                onClick={() => executeAction(msgIdx, actIdx, action)}
                              >
                                {config.label}
                              </Button>
                            )}
                          </Group>
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </div>
            ))}
            {loading && <Loader size="sm" />}
          </Stack>
        </ScrollArea>
        <Group gap="xs">
          <Textarea
            placeholder="Создай задачу, закрой задачу, спроси что угодно..."
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            autosize
            minRows={1}
            maxRows={3}
            style={{ flex: 1 }}
          />
          <Button onClick={handleSend} loading={loading}>
            Отправить
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
