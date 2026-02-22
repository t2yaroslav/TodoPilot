import { useState } from 'react';
import { Paper, TextInput, Button, Stack, Text, PinInput, Group, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { sendCode, verifyCode } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { setToken } = useAuthStore();

  const handleSendCode = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { data } = await sendCode(email);
      setStep('code');
      // Dev mode: show code in notification
      if (data.dev_code) {
        notifications.show({ title: 'Dev mode', message: `Код: ${data.dev_code}`, color: 'yellow' });
      }
    } catch {
      notifications.show({ title: 'Ошибка', message: 'Не удалось отправить код', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const { data } = await verifyCode(email, code);
      setToken(data.access_token);
      window.location.href = '/';
    } catch {
      notifications.show({ title: 'Ошибка', message: 'Неверный код', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper p="xl" radius="md" withBorder w={400}>
      <Stack>
        <Title order={2} ta="center">TodoPilot</Title>
        <Text size="sm" c="dimmed" ta="center">
          {step === 'email' ? 'Войдите по email' : 'Введите код из письма'}
        </Text>

        {step === 'email' ? (
          <>
            <TextInput
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
              type="email"
            />
            <Button onClick={handleSendCode} loading={loading} fullWidth>
              Получить код
            </Button>
          </>
        ) : (
          <>
            <Group justify="center">
              <PinInput length={6} value={code} onChange={setCode} type="number" size="md" />
            </Group>
            <Button onClick={handleVerify} loading={loading} fullWidth>
              Войти
            </Button>
            <Button variant="subtle" size="xs" onClick={() => setStep('email')}>
              Другой email
            </Button>
          </>
        )}
      </Stack>
    </Paper>
  );
}
