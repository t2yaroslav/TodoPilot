import React, { useEffect, useState } from 'react';
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
  Burger,
  useMantineColorScheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconInbox,
  IconCalendarEvent,
  IconCalendarWeek,
  IconCircleCheck,
  IconPlus,
  IconSettings,
  IconLogout,
  IconChevronDown,
  IconChevronRight,
  IconHash,
  IconSun,
  IconMoon,
  IconDots,
  IconEdit,
  IconTrash,
  IconTarget,
} from '@tabler/icons-react';
import { useAuthStore } from '@/stores/authStore';
import { useTaskStore, Project } from '@/stores/taskStore';
import { QuickAddModal } from '@/components/tasks/QuickAddModal';

function ProjectNavItem({ project, active, taskCount, onNavigate }: {
  project: Project;
  active: boolean;
  taskCount: number;
  onNavigate: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [menuOpened, setMenuOpened] = useState(false);
  const { editProject, removeProject, refreshAllCounts } = useTaskStore();
  const navigate = useNavigate();

  const handleRename = () => {
    const newTitle = prompt('Новое название проекта:', project.title);
    if (newTitle && newTitle !== project.title) {
      editProject(project.id, { title: newTitle });
    }
  };

  const handleDelete = () => {
    if (confirm(`Удалить проект «${project.title}»? Задачи проекта останутся без проекта.`)) {
      removeProject(project.id).then(refreshAllCounts);
      if (active) navigate('/inbox');
    }
  };

  return (
    <NavLink
      label={project.title}
      leftSection={<IconHash size={16} color={project.color} />}
      active={active}
      onClick={() => onNavigate()}
      variant="light"
      rightSection={
        <Box
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => { if (!menuOpened) setHovered(false); }}
          style={{ display: 'flex', alignItems: 'center', minWidth: 24, justifyContent: 'center' }}
        >
          {hovered || menuOpened ? (
            <Menu
              opened={menuOpened}
              onChange={(opened) => {
                setMenuOpened(opened);
                if (!opened) setHovered(false);
              }}
              shadow="md"
              width={180}
              position="bottom-end"
            >
              <Menu.Target>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconDots size={14} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconEdit size={14} />}
                  onClick={(e) => { e.stopPropagation(); handleRename(); }}
                >
                  Переименовать
                </Menu.Item>
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={14} />}
                  onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                >
                  Удалить
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          ) : (
            taskCount > 0 && <Text size="xs" c="dimmed">{taskCount}</Text>
          )}
        </Box>
      }
    />
  );
}

const NAV_ITEMS = [
  { label: 'Входящие', icon: IconInbox, path: '/inbox', countKey: 'inbox' as const },
  { label: 'Сегодня', icon: IconCalendarEvent, path: '/today', countKey: 'today' as const },
  { label: 'Предстоящие', icon: IconCalendarWeek, path: '/upcoming', countKey: null },
  { label: 'Выполнено', icon: IconCircleCheck, path: '/completed', countKey: 'completed' as const },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { projects, projectTaskCounts, navCounts, fetchProjects, refreshAllCounts } = useTaskStore();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [opened, setOpened] = useState(true);
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [quickAdd, setQuickAdd] = useState(false);

  useEffect(() => {
    fetchProjects();
    refreshAllCounts();
  }, []);

  // Auto-close sidebar on mobile
  useEffect(() => {
    if (isMobile) setOpened(false);
  }, [isMobile]);

  // Close sidebar on navigation on mobile
  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) setOpened(false);
  };

  return (
    <>
      <AppShell
        navbar={{ width: opened ? 280 : 0, breakpoint: 0 }}
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
                    <Menu.Item leftSection={<IconTarget size={14} />} onClick={() => handleNavigate('/goals')}>
                      Мои цели
                    </Menu.Item>
                    <Menu.Item leftSection={<IconSettings size={14} />} onClick={() => handleNavigate('/settings')}>
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
              {NAV_ITEMS.map((item) => {
                const count = item.countKey ? navCounts[item.countKey] : 0;
                return (
                  <NavLink
                    key={item.path}
                    label={item.label}
                    leftSection={<item.icon size={18} />}
                    active={location.pathname === item.path}
                    onClick={() => handleNavigate(item.path)}
                    variant="light"
                    rightSection={count > 0 ? <Text size="xs" c="dimmed">{count}</Text> : undefined}
                  />
                );
              })}

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
                  <ProjectNavItem
                    key={p.id}
                    project={p}
                    active={location.pathname === `/project/${p.id}`}
                    taskCount={projectTaskCounts[p.id] || 0}
                    onNavigate={() => handleNavigate(`/project/${p.id}`)}
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
            <Burger
              opened={opened}
              onClick={() => setOpened(!opened)}
              size="sm"
              style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }}
              title="Свернуть/развернуть сайдбар"
            />
            <Box pl={40} maw={960} mx="auto">{children}</Box>
          </Box>
        </AppShell.Main>
      </AppShell>

      <QuickAddModal
        opened={quickAdd}
        onClose={() => setQuickAdd(false)}
        defaultDueDate={location.pathname === '/today' ? new Date() : undefined}
        defaultProjectId={location.pathname.match(/^\/project\/(.+)$/)?.[1] || undefined}
      />
    </>
  );
}
