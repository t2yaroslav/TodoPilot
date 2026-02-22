import { useState } from 'react';
import { Modal, Textarea, Button, Stack, Text, Paper, ScrollArea, Loader, Group, Avatar } from '@mantine/core';
import { IconSparkles } from '@tabler/icons-react';
import { aiChat } from '@/api/client';

interface Props {
  opened: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AIModal({ opened, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await aiChat(userMsg.content);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Ошибка при обращении к AI. Проверьте настройки.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconSparkles size={20} color="var(--mantine-color-indigo-6)" />
          <Text fw={600}>AI-помощник</Text>
        </Group>
      }
      size="lg"
    >
      <Stack h={400}>
        <ScrollArea style={{ flex: 1 }}>
          <Stack gap="sm" p="xs">
            {messages.length === 0 && (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                Спросите AI о ваших задачах, целях или попросите помощь с планированием.
              </Text>
            )}
            {messages.map((msg, i) => (
              <Group key={i} align="flex-start" gap="xs" wrap="nowrap">
                <Avatar size="sm" color={msg.role === 'assistant' ? 'indigo' : 'blue'} radius="xl">
                  {msg.role === 'assistant' ? 'AI' : 'Я'}
                </Avatar>
                <Paper p="xs" bg={msg.role === 'assistant' ? 'var(--mantine-color-indigo-light)' : 'var(--mantine-color-blue-light)'} radius="md" style={{ flex: 1 }}>
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Text>
                </Paper>
              </Group>
            ))}
            {loading && <Loader size="sm" />}
          </Stack>
        </ScrollArea>
        <Group gap="xs">
          <Textarea
            placeholder="Напишите сообщение..."
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
