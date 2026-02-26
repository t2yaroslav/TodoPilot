import { useEffect, useState } from 'react';
import {
  Title,
  Stack,
  Paper,
  Group,
  Text,
  ActionIcon,
  TextInput,
  Button,
  Progress,
  Badge,
  ColorSwatch,
  Menu,
  Modal,
  Select,
  ColorInput,
  Box,
  ThemeIcon,
  RingProgress,
  Collapse,
  UnstyledButton,
  Divider,
} from '@mantine/core';
import {
  IconPlus,
  IconDots,
  IconEdit,
  IconTrash,
  IconTarget,
  IconChevronDown,
  IconChevronRight,
  IconLink,
  IconTrophy,
} from '@tabler/icons-react';
import { useTaskStore, Goal, GoalStats, Task, Project } from '@/stores/taskStore';

const GOAL_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

function GoalCreateForm({ onClose, parentGoalId }: { onClose: () => void; parentGoalId?: string }) {
  const { addGoal, fetchGoals, fetchGoalStats } = useTaskStore();
  const [title, setTitle] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [goalType, setGoalType] = useState<string>('quarterly');

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await addGoal({
      title: title.trim(),
      color,
      goal_type: goalType,
      parent_goal_id: parentGoalId || null,
    });
    await Promise.all([fetchGoals(), fetchGoalStats()]);
    onClose();
  };

  return (
    <Stack>
      <TextInput
        label="Название цели"
        placeholder="Например: Выучить английский до B2"
        value={title}
        onChange={(e) => setTitle(e.currentTarget.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        autoFocus
      />
      <Group grow>
        <Select
          label="Тип"
          value={goalType}
          onChange={(v) => setGoalType(v || 'quarterly')}
          data={[
            { value: 'quarterly', label: 'Квартальная' },
            { value: 'yearly', label: 'Годовая' },
          ]}
        />
        <ColorInput
          label="Цвет"
          value={color}
          onChange={setColor}
          swatches={GOAL_COLORS}
        />
      </Group>
      <Group justify="flex-end">
        <Button variant="subtle" onClick={onClose}>Отмена</Button>
        <Button onClick={handleSubmit}>Создать</Button>
      </Group>
    </Stack>
  );
}

function GoalEditForm({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const { editGoal, fetchGoals, fetchGoalStats } = useTaskStore();
  const [title, setTitle] = useState(goal.title);
  const [color, setColor] = useState(goal.color);
  const [goalType, setGoalType] = useState(goal.goal_type);

  const handleSave = async () => {
    if (!title.trim()) return;
    await editGoal(goal.id, { title: title.trim(), color, goal_type: goalType });
    await Promise.all([fetchGoals(), fetchGoalStats()]);
    onClose();
  };

  return (
    <Stack>
      <TextInput
        label="Название цели"
        value={title}
        onChange={(e) => setTitle(e.currentTarget.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        autoFocus
      />
      <Group grow>
        <Select
          label="Тип"
          value={goalType}
          onChange={(v) => setGoalType(v || 'quarterly')}
          data={[
            { value: 'quarterly', label: 'Квартальная' },
            { value: 'yearly', label: 'Годовая' },
          ]}
        />
        <ColorInput
          label="Цвет"
          value={color}
          onChange={setColor}
          swatches={GOAL_COLORS}
        />
      </Group>
      <Group justify="flex-end">
        <Button variant="subtle" onClick={onClose}>Отмена</Button>
        <Button onClick={handleSave}>Сохранить</Button>
      </Group>
    </Stack>
  );
}

function LinkModal({
  opened,
  onClose,
  goal,
}: {
  opened: boolean;
  onClose: () => void;
  goal: Goal;
}) {
  const { projects, tasks, fetchTasks, editProject, editTask, fetchGoalStats, fetchProjects } = useTaskStore();
  const [mode, setMode] = useState<'project' | 'task'>('project');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (opened) {
      fetchTasks({ completed: false });
    }
  }, [opened]);

  const availableProjects = projects.filter((p) => p.goal_id !== goal.id);
  const availableTasks = tasks.filter((t) => t.goal_id !== goal.id && !t.completed);

  const handleLink = async () => {
    if (!selectedId) return;
    if (mode === 'project') {
      await editProject(selectedId, { goal_id: goal.id });
      await fetchProjects();
    } else {
      await editTask(selectedId, { goal_id: goal.id });
    }
    await fetchGoalStats();
    setSelectedId(null);
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title={`Привязать к цели «${goal.title}»`} size="md">
      <Stack>
        <Select
          label="Что привязать"
          value={mode}
          onChange={(v) => { setMode(v as 'project' | 'task'); setSelectedId(null); }}
          data={[
            { value: 'project', label: 'Проект' },
            { value: 'task', label: 'Задачу' },
          ]}
        />
        {mode === 'project' ? (
          <Select
            label="Выберите проект"
            placeholder="Поиск проекта..."
            value={selectedId}
            onChange={setSelectedId}
            data={availableProjects.map((p) => ({ value: p.id, label: p.title }))}
            searchable
            nothingFoundMessage="Нет доступных проектов"
          />
        ) : (
          <Select
            label="Выберите задачу"
            placeholder="Поиск задачи..."
            value={selectedId}
            onChange={setSelectedId}
            data={availableTasks.map((t) => ({ value: t.id, label: t.title }))}
            searchable
            nothingFoundMessage="Нет доступных задач"
          />
        )}
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>Отмена</Button>
          <Button onClick={handleLink} disabled={!selectedId}>Привязать</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function GoalCard({
  goal,
  stats,
  childGoals,
  allStats,
  onEdit,
  onDelete,
  onLink,
  onAddChild,
  linkedProjects,
  linkedTasks,
}: {
  goal: Goal;
  stats: GoalStats;
  childGoals: Goal[];
  allStats: Record<string, GoalStats>;
  onEdit: (g: Goal) => void;
  onDelete: (g: Goal) => void;
  onLink: (g: Goal) => void;
  onAddChild: (parentId: string) => void;
  linkedProjects: Project[];
  linkedTasks: Task[];
}) {
  const [expanded, setExpanded] = useState(true);
  const progress = stats.total_tasks > 0
    ? Math.round((stats.completed_tasks / stats.total_tasks) * 100)
    : 0;

  return (
    <Paper p="md" radius="md" withBorder style={{ borderLeft: `4px solid ${goal.color}` }}>
      <Group justify="space-between" mb="xs">
        <Group gap="sm">
          <ThemeIcon variant="light" color={goal.color} size="lg" radius="xl">
            <IconTarget size={20} />
          </ThemeIcon>
          <div>
            <Group gap="xs">
              <Text fw={600} size="md">{goal.title}</Text>
              <Badge size="xs" variant="light" color={goal.goal_type === 'yearly' ? 'orange' : 'blue'}>
                {goal.goal_type === 'yearly' ? 'Год' : 'Квартал'}
              </Badge>
            </Group>
          </div>
        </Group>
        <Group gap={4}>
          <Menu shadow="md" width={180} position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="subtle" size="sm">
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconLink size={14} />} onClick={() => onLink(goal)}>
                Привязать
              </Menu.Item>
              <Menu.Item leftSection={<IconPlus size={14} />} onClick={() => onAddChild(goal.id)}>
                Подцель
              </Menu.Item>
              <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => onEdit(goal)}>
                Редактировать
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => onDelete(goal)}>
                Удалить
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      {/* Progress section */}
      <Box mb="xs">
        <Group justify="space-between" mb={4}>
          <Group gap="xs">
            <Text size="xs" c="dimmed">Задачи: {stats.completed_tasks}/{stats.total_tasks}</Text>
          </Group>
          <Text size="xs" fw={600} c={progress === 100 ? 'green' : undefined}>
            {progress}%
          </Text>
        </Group>
        <Progress
          value={progress}
          color={progress === 100 ? 'green' : goal.color}
          size="sm"
          radius="xl"
        />
      </Box>

      {/* Linked projects */}
      {linkedProjects.length > 0 && (
        <Box mb="xs">
          <Text size="xs" c="dimmed" fw={600} mb={4}>Проекты</Text>
          <Group gap={6}>
            {linkedProjects.map((p) => (
              <Badge
                key={p.id}
                variant="light"
                leftSection={<ColorSwatch color={p.color} size={10} />}
                size="sm"
              >
                {p.title}
              </Badge>
            ))}
          </Group>
        </Box>
      )}

      {/* Linked tasks (show up to 5) */}
      {linkedTasks.length > 0 && (
        <Box mb="xs">
          <Text size="xs" c="dimmed" fw={600} mb={4}>
            Задачи ({linkedTasks.filter(t => !t.completed).length} активных)
          </Text>
          {linkedTasks.filter(t => !t.completed).slice(0, 5).map((t) => (
            <Group key={t.id} gap={6} mb={2}>
              <Box
                w={10} h={10}
                style={{
                  borderRadius: '50%',
                  border: '2px solid var(--mantine-color-dimmed)',
                  flexShrink: 0,
                }}
              />
              <Text size="xs" lineClamp={1}>{t.title}</Text>
            </Group>
          ))}
          {linkedTasks.filter(t => !t.completed).length > 5 && (
            <Text size="xs" c="dimmed" mt={2}>
              ... ещё {linkedTasks.filter(t => !t.completed).length - 5}
            </Text>
          )}
        </Box>
      )}

      {/* Child goals */}
      {childGoals.length > 0 && (
        <Box mt="sm">
          <UnstyledButton onClick={() => setExpanded(!expanded)} mb={4}>
            <Group gap={4}>
              {expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
              <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                Подцели ({childGoals.length})
              </Text>
            </Group>
          </UnstyledButton>
          <Collapse in={expanded}>
            <Stack gap="xs" pl="md" style={{ borderLeft: `2px solid var(--mantine-color-default-border)` }}>
              {childGoals.map((child) => {
                const childStats = allStats[child.id] || { total_tasks: 0, completed_tasks: 0, projects: 0 };
                const childProgress = childStats.total_tasks > 0
                  ? Math.round((childStats.completed_tasks / childStats.total_tasks) * 100)
                  : 0;
                return (
                  <Paper key={child.id} p="xs" radius="sm" withBorder>
                    <Group justify="space-between">
                      <Group gap="xs">
                        <ColorSwatch color={child.color} size={12} />
                        <Text size="sm" fw={500}>{child.title}</Text>
                        <Badge size="xs" variant="light">
                          {childStats.completed_tasks}/{childStats.total_tasks}
                        </Badge>
                      </Group>
                      <Group gap={4}>
                        <Text size="xs" c="dimmed">{childProgress}%</Text>
                        <Menu shadow="md" width={160}>
                          <Menu.Target>
                            <ActionIcon variant="subtle" size="xs">
                              <IconDots size={14} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item leftSection={<IconLink size={14} />} onClick={() => onLink(child)}>
                              Привязать
                            </Menu.Item>
                            <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => onEdit(child)}>
                              Редактировать
                            </Menu.Item>
                            <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => onDelete(child)}>
                              Удалить
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Group>
                    </Group>
                    <Progress value={childProgress} color={child.color} size="xs" radius="xl" mt={6} />
                  </Paper>
                );
              })}
            </Stack>
          </Collapse>
        </Box>
      )}
    </Paper>
  );
}

export function GoalsPage() {
  const { goals, goalStats, projects, tasks, fetchGoals, fetchGoalStats, fetchProjects, fetchTasks, removeGoal } = useTaskStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | undefined>();
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [linkingGoal, setLinkingGoal] = useState<Goal | null>(null);

  useEffect(() => {
    fetchGoals();
    fetchGoalStats();
    fetchProjects();
    fetchTasks({ completed: false });
  }, []);

  const handleDelete = async (goal: Goal) => {
    if (confirm(`Удалить цель «${goal.title}»? Привязанные задачи и проекты останутся.`)) {
      await removeGoal(goal.id);
      await fetchGoalStats();
    }
  };

  const handleAddChild = (parentId: string) => {
    setCreateParentId(parentId);
    setCreateOpen(true);
  };

  const topLevelGoals = goals.filter((g) => !g.parent_goal_id);
  const yearlyGoals = topLevelGoals.filter((g) => g.goal_type === 'yearly');
  const quarterlyGoals = topLevelGoals.filter((g) => g.goal_type === 'quarterly');

  // Overall stats
  const totalTasks = Object.values(goalStats).reduce((sum, s) => sum + s.total_tasks, 0);
  const completedTasks = Object.values(goalStats).reduce((sum, s) => sum + s.completed_tasks, 0);
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const renderGoalGroup = (title: string, goalsToRender: Goal[]) => {
    if (goalsToRender.length === 0) return null;
    return (
      <Box>
        <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb="sm">{title}</Text>
        <Stack gap="md">
          {goalsToRender.map((goal) => {
            const stats = goalStats[goal.id] || { total_tasks: 0, completed_tasks: 0, projects: 0 };
            const childGoals = goals.filter((g) => g.parent_goal_id === goal.id);
            const goalLinkedProjects = projects.filter((p) => p.goal_id === goal.id);
            const goalLinkedTasks = tasks.filter((t) => t.goal_id === goal.id);
            return (
              <GoalCard
                key={goal.id}
                goal={goal}
                stats={stats}
                childGoals={childGoals}
                allStats={goalStats}
                onEdit={setEditingGoal}
                onDelete={handleDelete}
                onLink={setLinkingGoal}
                onAddChild={handleAddChild}
                linkedProjects={goalLinkedProjects}
                linkedTasks={goalLinkedTasks}
              />
            );
          })}
        </Stack>
      </Box>
    );
  };

  return (
    <Stack>
      <Group justify="space-between">
        <div>
          <Title order={3}>Мои цели</Title>
          <Text size="sm" c="dimmed">Отслеживайте прогресс и двигайтесь к результату</Text>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => { setCreateParentId(undefined); setCreateOpen(true); }}
        >
          Новая цель
        </Button>
      </Group>

      {/* Overall summary */}
      {goals.length > 0 && (
        <Paper p="sm" radius="md" withBorder>
          <Group gap="md">
            <RingProgress
              size={56}
              thickness={6}
              roundCaps
              sections={[{ value: overallProgress, color: 'indigo' }]}
              label={
                <Text ta="center" size="xs" fw={700}>{overallProgress}%</Text>
              }
            />
            <div>
              <Text size="sm" fw={600}>Общий прогресс</Text>
              <Text size="xs" c="dimmed">
                {completedTasks} из {totalTasks} задач выполнено
              </Text>
            </div>
          </Group>
        </Paper>
      )}

      {/* Goal groups */}
      {renderGoalGroup('Годовые цели', yearlyGoals)}
      {renderGoalGroup('Квартальные цели', quarterlyGoals)}

      {/* Empty state */}
      {goals.length === 0 && (
        <Paper p="xl" radius="md" withBorder ta="center">
          <ThemeIcon size={60} radius="xl" variant="light" color="indigo" mx="auto" mb="md">
            <IconTrophy size={32} />
          </ThemeIcon>
          <Title order={4} mb="xs">Поставьте свою первую цель</Title>
          <Text size="sm" c="dimmed" maw={400} mx="auto" mb="md">
            Цели помогают видеть общую картину. Привязывайте к ним проекты и задачи, чтобы понимать для чего вы работаете и видеть прогресс.
          </Text>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => { setCreateParentId(undefined); setCreateOpen(true); }}
          >
            Создать цель
          </Button>
        </Paper>
      )}

      {/* Create modal */}
      <Modal
        opened={createOpen}
        onClose={() => { setCreateOpen(false); setCreateParentId(undefined); }}
        title={createParentId ? 'Новая подцель' : 'Новая цель'}
      >
        <GoalCreateForm
          onClose={() => { setCreateOpen(false); setCreateParentId(undefined); }}
          parentGoalId={createParentId}
        />
      </Modal>

      {/* Edit modal */}
      <Modal
        opened={!!editingGoal}
        onClose={() => setEditingGoal(null)}
        title="Редактирование цели"
      >
        {editingGoal && (
          <GoalEditForm goal={editingGoal} onClose={() => setEditingGoal(null)} />
        )}
      </Modal>

      {/* Link modal */}
      {linkingGoal && (
        <LinkModal
          opened={!!linkingGoal}
          onClose={() => setLinkingGoal(null)}
          goal={linkingGoal}
        />
      )}
    </Stack>
  );
}
