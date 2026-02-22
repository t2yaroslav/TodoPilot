import { useState } from 'react';
import { Title, Stack, TextInput, Textarea, Button, Paper, Text, Divider, Group } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMantineColorScheme } from '@mantine/core';
import { useAuthStore } from '@/stores/authStore';

export function SettingsPage() {
  const { user, updateUser, logout } = useAuthStore();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [name, setName] = useState(user?.name || '');
  const [profile, setProfile] = useState(user?.profile_text || '');

  const handleSave = async () => {
    await updateUser({ name, profile_text: profile });
    notifications.show({ title: 'Сохранено', message: 'Настройки обновлены', color: 'green' });
  };

  return (
    <Stack maw={600}>
      <Title order={3}>Настройки</Title>

      <Paper p="md" radius="md" withBorder>
        <Text fw={600} mb="sm">Аккаунт</Text>
        <TextInput label="Email" value={user?.email || ''} disabled mb="sm" />
        <TextInput label="Имя" value={name} onChange={(e) => setName(e.currentTarget.value)} mb="sm" />
        <Button onClick={handleSave}>Сохранить</Button>
      </Paper>

      <Paper p="md" radius="md" withBorder>
        <Text fw={600} mb="sm">Общие</Text>
        <Group>
          <Button variant="light" onClick={() => toggleColorScheme()}>
            {colorScheme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          </Button>
        </Group>
      </Paper>

      <Paper p="md" radius="md" withBorder>
        <Text fw={600} mb="sm">Психопортрет (AI-заметки)</Text>
        <Text size="xs" c="dimmed" mb="xs">
          AI использует эти заметки для персонализации рекомендаций. Вы можете редактировать.
        </Text>
        <Textarea
          value={profile}
          onChange={(e) => setProfile(e.currentTarget.value)}
          autosize
          minRows={4}
          maxRows={12}
          placeholder="AI ещё не составил профиль. Он появится после нескольких взаимодействий."
          mb="sm"
        />
        <Button onClick={handleSave}>Сохранить</Button>
      </Paper>

      <Divider />
      <Button variant="subtle" color="red" onClick={logout}>Выйти из аккаунта</Button>
    </Stack>
  );
}
