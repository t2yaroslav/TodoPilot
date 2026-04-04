import { useState } from 'react';
import { Paper, TextInput, Button, Stack, Text, PinInput, Group, Title, Divider } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useGoogleLogin } from '@react-oauth/google';
import { IconBrandGoogle } from '@tabler/icons-react';
import { sendCode, verifyCode, googleAuth } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';

function GoogleLoginButton({ loading, setLoading, setToken }: {
  loading: boolean;
  setLoading: (v: boolean) => void;
  setToken: (t: string) => void;
}) {
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const { data } = await googleAuth(tokenResponse.access_token);
        setToken(data.access_token);
        window.location.href = '/today';
      } catch {
        notifications.show({ title: 'Ошибка', message: 'Не удалось войти через Google', color: 'red' });
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      notifications.show({ title: 'Ошибка', message: 'Ошибка Google Sign-In', color: 'red' });
    },
  });

  return (
    <>
      <Divider label="или" labelPosition="center" />
      <Button
        variant="default"
        leftSection={<IconBrandGoogle size={18} />}
        onClick={() => googleLogin()}
        loading={loading}
        fullWidth
      >
        Войти через Google
      </Button>
    </>
  );
}

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { setToken } = useAuthStore();

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleSendCode = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { data } = await sendCode(email);
      setStep('code');
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
    if (code.length !== 4) return;
    setLoading(true);
    try {
      const { data } = await verifyCode(email, code);
      setToken(data.access_token);
      window.location.href = '/today';
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

            {googleClientId && (
              <GoogleLoginButton loading={loading} setLoading={setLoading} setToken={setToken} />
            )}
          </>
        ) : (
          <>
            <Group justify="center">
              <PinInput length={4} value={code} onChange={setCode} type="number" size="md" />
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
