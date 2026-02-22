import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppShell,
  NavLink,
  Text,
  ActionIcon,
  Group,
  Menu,
  UnstyledButton,
  Avatar,
  Divider,
  ScrollArea,
  Collapse,
  Box,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconInbox,
  IconCalendarEvent,
  IconCalendarDue,
  IconCircleCheck,
  IconPlus,
  IconSettings,
  IconLogout,
  IconMenu2,
  IconChevronDown,
  IconChevronRight,
  IconFolder,
  IconSun,
  IconMoon,
} from '@tabler/icons-react';
import { useAuthStore } from '@/stores/authStore';
import { useTaskStore, Project } from '@/stores/taskStore';
import { QuickAddModal } from '@/components/tasks/QuickAddModal';

const NAV_ITEMS = [
  { label: 'Входящие', icon: IconInbox, path: '/inbox' },
  { label: 'Сегодня', icon: IconCalendarEvent, path: '/today' },
  { label: 'Предстоящие', icon: IconCalendarDue, path: '/upcoming' },
  { label: 'Выполнено', icon: IconCircleCheck, path: '/completed' },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { projects, fetchProjects } = useTaskStore();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [opened, setOpened] = useState(true);
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [quickAdd, setQuickAdd] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <>
      <AppShell
        navbar={{ width: opened ? 280 : 0, breakpoint: 'sm' }}
        padding="md"
        styles={{
          main: { backgroundColor: colorScheme === 'dark' ? 'var(--mantine-color-dark-8)' : 'var(--mantine-color-gray-0)' },
        }}
      >
        {opened && (
          <AppShell.Navbar p="xs" style={{ borderRight: '1px solid var(--mantine-color-default-border)' }}>
            <AppShell.Section>
              <Group justify="space-between" mb="xs">
                <Menu shadow="md" width={200}>
                  <Menu.Target>
                    <UnstyledButton>
                      <Group gap="xs">
                        <Avatar size="sm" color="indigo" radius="xl">
                          {user?.name?.[0] || user?.email?.[0] || '?'}
                        </Avatar>
                        <Text size="sm" fw={500} style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {user?.name || user?.email}
                        </Text>
                      </Group>
                    </UnstyledButton>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item leftSection={<IconSettings size={14} />} onClick={() => navigate('/settings')}>
                      Настройки
                    </Menu.Item>
                    <Menu.Item
                      leftSection={colorScheme === 'dark' ? <IconSun size={14} /> : <IconMoon size={14} />}
                      onClick={() => toggleColorScheme()}
                    >
                      {colorScheme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={() => { logout(); navigate('/login'); }}>
                      Выйти
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
                <ActionIcon variant="subtle" onClick={() => setQuickAdd(true)} title="Быстрое добавление задачи">
                  <IconPlus size={18} />
                </ActionIcon>
              </Group>
            </AppShell.Section>

            <AppShell.Section grow component={ScrollArea}>
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.path}
                  label={item.label}
                  leftSection={<item.icon size={18} />}
                  active={location.pathname === item.path}
                  onClick={() => navigate(item.path)}
                  variant="light"
                />
              ))}

              <Divider my="sm" />

              <Group justify="space-between" px="sm" mb={4}>
                <UnstyledButton onClick={() => setProjectsOpen(!projectsOpen)}>
                  <Group gap={4}>
                    {projectsOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                      Мои проекты
                    </Text>
                  </Group>
                </UnstyledButton>
                <ActionIcon
                  variant="subtle"
                  size="xs"
                  onClick={() => {
                    const title = prompt('Название проекта:');
                    if (title) useTaskStore.getState().addProject({ title });
                  }}
                >
                  <IconPlus size={14} />
                </ActionIcon>
              </Group>

              <Collapse in={projectsOpen}>
                {projects.map((p: Project) => (
                  <NavLink
                    key={p.id}
                    label={p.title}
                    leftSection={<IconFolder size={16} color={p.color} />}
                    active={location.pathname === `/project/${p.id}`}
                    onClick={() => navigate(`/project/${p.id}`)}
                    variant="light"
                  />
                ))}
                {projects.length === 0 && (
                  <Text size="xs" c="dimmed" px="sm">
                    Нет проектов
                  </Text>
                )}
              </Collapse>
            </AppShell.Section>
          </AppShell.Navbar>
        )}

        <AppShell.Main>
          <Box pos="relative">
            <ActionIcon
              variant="subtle"
              onClick={() => setOpened(!opened)}
              style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }}
              title="Свернуть/развернуть сайдбар"
            >
              <IconMenu2 size={18} />
            </ActionIcon>
            <Box pl={40}>{children}</Box>
          </Box>
        </AppShell.Main>
      </AppShell>

      <QuickAddModal opened={quickAdd} onClose={() => setQuickAdd(false)} />
    </>
  );
}
