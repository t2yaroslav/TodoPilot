import { useState, useEffect } from 'react';
import {
  Title, Stack, TextInput, Textarea, Button, Paper, Text, Divider, Group,
  Select, PasswordInput, Badge, Loader, Switch,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMantineColorScheme } from '@mantine/core';
import { useAuthStore } from '@/stores/authStore';
import { getAIProviders, testAIConnection } from '@/api/client';

interface ProviderInfo {
  label: string;
  models: string[];
  requires_api_key: boolean;
  requires_api_base: boolean;
  default_api_base?: string;
}

export function SettingsPage() {
  const { user, updateUser, logout } = useAuthStore();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [name, setName] = useState(user?.name || '');
  const [profile, setProfile] = useState(user?.profile_text || '');

  // AI provider state
  const [providers, setProviders] = useState<Record<string, ProviderInfo>>({});
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [apiKey, setApiKey] = useState('');
  const [apiBase, setApiBase] = useState('');
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'ok' | 'error'>('none');

  // Load providers on mount
  useEffect(() => {
    getAIProviders().then(({ data }) => setProviders(data)).catch(() => {});
  }, []);

  // Load saved AI settings from user.settings
  useEffect(() => {
    const config = (user?.settings as Record<string, unknown>)?.ai_provider_config as Record<string, string> | undefined;
    if (config) {
      // Detect provider from model name
      const savedModel = config.model || '';
      const savedApiKey = config.api_key || '';
      const savedApiBase = config.api_base || '';

      setSelectedModel(savedModel);
      setApiKey(savedApiKey);
      setApiBase(savedApiBase);

      // Detect provider from saved model
      if (savedModel.startsWith('ollama/')) {
        setSelectedProvider('ollama');
      } else if (savedModel.startsWith('claude-')) {
        setSelectedProvider('anthropic');
      } else if (savedModel.startsWith('gpt-') || savedModel.startsWith('o1') || savedModel.startsWith('o3')) {
        setSelectedProvider('openai');
      } else if (config.provider) {
        setSelectedProvider(config.provider);
      }
    }
  }, [user?.settings]);

  const currentProvider = providers[selectedProvider];
  const modelOptions = currentProvider?.models.map((m) => ({ value: m, label: m })) || [];

  const handleProviderChange = (value: string | null) => {
    setSelectedProvider(value || '');
    setSelectedModel('');
    setApiKey('');
    setConnectionStatus('none');

    const prov = value ? providers[value] : null;
    if (prov?.default_api_base) {
      setApiBase(prov.default_api_base);
    } else {
      setApiBase('');
    }
  };

  const handleSave = async () => {
    await updateUser({ name, profile_text: profile });
    notifications.show({ title: 'Сохранено', message: 'Настройки обновлены', color: 'green' });
  };

  const handleSaveAI = async () => {
    const currentSettings = (user?.settings || {}) as Record<string, unknown>;

    if (!selectedProvider) {
      // Clear AI settings — use server defaults
      const newSettings = { ...currentSettings };
      delete newSettings.ai_provider_config;
      await updateUser({ settings: newSettings } as Record<string, unknown>);
      notifications.show({ title: 'Сохранено', message: 'AI-провайдер сброшен на серверные настройки', color: 'green' });
      return;
    }

    const aiConfig: Record<string, string> = {
      provider: selectedProvider,
      model: selectedModel,
    };
    if (apiKey) aiConfig.api_key = apiKey;
    if (apiBase) aiConfig.api_base = apiBase;

    const newSettings = { ...currentSettings, ai_provider_config: aiConfig };
    await updateUser({ settings: newSettings } as Record<string, unknown>);
    notifications.show({ title: 'Сохранено', message: 'AI-провайдер обновлён', color: 'green' });
  };

  const handleTest = async () => {
    // Save settings first, then test
    setTesting(true);
    setConnectionStatus('none');
    try {
      const currentSettings = (user?.settings || {}) as Record<string, unknown>;
      const aiConfig: Record<string, string> = {
        provider: selectedProvider,
        model: selectedModel,
      };
      if (apiKey) aiConfig.api_key = apiKey;
      if (apiBase) aiConfig.api_base = apiBase;

      const newSettings = { ...currentSettings, ai_provider_config: aiConfig };
      await updateUser({ settings: newSettings } as Record<string, unknown>);

      const { data } = await testAIConnection();
      if (data.status === 'ok') {
        setConnectionStatus('ok');
        notifications.show({ title: 'Подключение успешно', message: data.reply, color: 'green' });
      } else {
        setConnectionStatus('error');
        notifications.show({ title: 'Ошибка подключения', message: data.error, color: 'red' });
      }
    } catch {
      setConnectionStatus('error');
      notifications.show({ title: 'Ошибка', message: 'Не удалось проверить подключение', color: 'red' });
    } finally {
      setTesting(false);
    }
  };

  const providerSelectData = Object.entries(providers).map(([key, p]) => ({
    value: key,
    label: p.label,
  }));

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
        <Text fw={600} mb="sm">AI-провайдер</Text>
        <Text size="xs" c="dimmed" mb="md">
          Выберите AI-движок для всех функций приложения: чат, анализ, ретроспективы и др.
          Если не выбрано — используются серверные настройки.
        </Text>

        <Select
          label="Провайдер"
          placeholder="Серверные настройки (по умолчанию)"
          data={providerSelectData}
          value={selectedProvider || null}
          onChange={handleProviderChange}
          clearable
          mb="sm"
        />

        {currentProvider && (
          <>
            {currentProvider.requires_api_base ? (
              <TextInput
                label="Модель"
                placeholder="ollama/llama3, ollama/mistral, ollama/gpt-oss:20b..."
                description="Введите название модели в формате ollama/название"
                value={selectedModel}
                onChange={(e) => { setSelectedModel(e.currentTarget.value); setConnectionStatus('none'); }}
                mb="sm"
              />
            ) : (
              <Select
                label="Модель"
                placeholder="Выберите модель"
                data={modelOptions}
                value={selectedModel || null}
                onChange={(v) => { setSelectedModel(v || ''); setConnectionStatus('none'); }}
                searchable
                allowDeselect={false}
                mb="sm"
              />
            )}

            {currentProvider.requires_api_key && (
              <PasswordInput
                label="API ключ"
                placeholder={selectedProvider === 'openai' ? 'sk-...' : selectedProvider === 'anthropic' ? 'sk-ant-...' : 'API ключ'}
                value={apiKey}
                onChange={(e) => { setApiKey(e.currentTarget.value); setConnectionStatus('none'); }}
                mb="sm"
              />
            )}

            {currentProvider.requires_api_base && (
              <TextInput
                label="URL сервера"
                placeholder={currentProvider.default_api_base || 'http://localhost:11434'}
                value={apiBase}
                onChange={(e) => { setApiBase(e.currentTarget.value); setConnectionStatus('none'); }}
                mb="sm"
              />
            )}
          </>
        )}

        <Group mt="sm">
          <Button onClick={handleSaveAI}>
            Сохранить
          </Button>
          {selectedProvider && selectedModel && (
            <Button variant="light" onClick={handleTest} disabled={testing}>
              {testing ? <Loader size="xs" mr={8} /> : null}
              Проверить подключение
            </Button>
          )}
          {connectionStatus === 'ok' && <Badge color="green" variant="light">Подключено</Badge>}
          {connectionStatus === 'error' && <Badge color="red" variant="light">Ошибка</Badge>}
        </Group>
      </Paper>

      <Paper p="md" radius="md" withBorder>
        <Text fw={600} mb="sm">Общие</Text>
        <Stack gap="sm">
          <Switch
            label="Еженедельный обзор"
            description="Предлагать обзор недели каждый понедельник"
            checked={((user?.settings as Record<string, unknown>)?.weekly_review_enabled ?? true) as boolean}
            onChange={async (e) => {
              const currentSettings = (user?.settings || {}) as Record<string, unknown>;
              await updateUser({ settings: { ...currentSettings, weekly_review_enabled: e.currentTarget.checked } } as Record<string, unknown>);
              notifications.show({ title: 'Сохранено', message: e.currentTarget.checked ? 'Обзор недели включён' : 'Обзор недели отключён', color: 'green' });
            }}
          />
          <Group>
            <Button variant="light" onClick={() => toggleColorScheme()}>
              {colorScheme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Paper p="md" radius="md" withBorder>
        <Text fw={600} mb="sm">Профиль пользователя (AI-заметки)</Text>
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
