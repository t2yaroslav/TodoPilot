import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
  type NodeProps,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import {
  Title,
  Stack,
  Group,
  Text,
  Button,
  Modal,
  TextInput,
  Select,
  ColorInput,
  Paper,
  Badge,
  Progress,
  ActionIcon,
  Menu,
  ThemeIcon,
  Box,
  Switch,
} from '@mantine/core';
import {
  IconPlus,
  IconTarget,
  IconFolder,
  IconEdit,
  IconTrash,
  IconQuestionMark,
  IconDots,
  IconLink,
  IconLinkOff,
  IconLayoutDistributeVertical,
  IconSubtask,
  IconCheck,
} from '@tabler/icons-react';
import { useTaskStore, Goal, Project, Task } from '@/stores/taskStore';
import { getProjects } from '@/api/client';

// ─── Constants ───────────────────────────────────────────────────────────────

const GOAL_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

const NODE_WIDTH = 220;
const GOAL_NODE_HEIGHT = 120;
const PROJECT_NODE_HEIGHT = 80;
const POSITIONS_STORAGE_KEY = 'goals-graph-positions';

function savePositions(nodes: Node[]) {
  const positions: Record<string, { x: number; y: number }> = {};
  nodes.forEach((n) => { positions[n.id] = n.position; });
  try { localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(positions)); } catch { /* ignore */ }
}

function loadPositions(): Record<string, { x: number; y: number }> | null {
  try {
    const raw = localStorage.getItem(POSITIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ─── Aggregated stats helper ─────────────────────────────────────────────────

interface AggStats {
  total: number;
  completed: number;
}

function getAggregatedStats(
  goalId: string,
  goals: Goal[],
  goalStats: Record<string, { total_tasks: number; completed_tasks: number }>,
  projects: Project[],
  tasks: Task[],
  visited: Set<string> = new Set(),
): AggStats {
  if (visited.has(goalId)) return { total: 0, completed: 0 };
  visited.add(goalId);

  const direct = goalStats[goalId];
  let total = direct?.total_tasks || 0;
  let completed = direct?.completed_tasks || 0;

  // Tasks from linked projects (that aren't already counted via goal_id)
  const linkedProjects = projects.filter((p) => p.goal_id === goalId);
  for (const proj of linkedProjects) {
    const projTasks = tasks.filter(
      (t) => t.project_id === proj.id && t.goal_id !== goalId,
    );
    total += projTasks.length;
    completed += projTasks.filter((t) => t.completed).length;
  }

  // Recursively add children
  const children = goals.filter((g) => g.parent_goal_id === goalId);
  for (const child of children) {
    const childStats = getAggregatedStats(child.id, goals, goalStats, projects, tasks, visited);
    total += childStats.total;
    completed += childStats.completed;
  }

  return { total, completed };
}

// ─── Dagre layout ────────────────────────────────────────────────────────────

function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));

  // Separate connected and unconnected nodes
  const connectedIds = new Set<string>();
  edges.forEach((e) => {
    connectedIds.add(e.source);
    connectedIds.add(e.target);
  });

  const connectedNodes = nodes.filter((n) => connectedIds.has(n.id));
  const unconnectedNodes = nodes.filter((n) => !connectedIds.has(n.id));

  // Layout connected nodes with dagre
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80, marginx: 40, marginy: 40 });

  connectedNodes.forEach((node) => {
    const height = node.type === 'goalNode' ? GOAL_NODE_HEIGHT : PROJECT_NODE_HEIGHT;
    g.setNode(node.id, { width: NODE_WIDTH, height });
  });

  // Edges are child→parent in React Flow, but dagre needs parent→child for TB layout
  edges.forEach((edge) => {
    g.setEdge(edge.target, edge.source);
  });

  dagre.layout(g);

  const layoutedConnected = connectedNodes.map((node) => {
    const pos = g.node(node.id);
    const height = node.type === 'goalNode' ? GOAL_NODE_HEIGHT : PROJECT_NODE_HEIGHT;
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - height / 2,
      },
    };
  });

  // Place unconnected nodes to the right
  const graphWidth = connectedNodes.length > 0
    ? Math.max(...layoutedConnected.map((n) => n.position.x + NODE_WIDTH)) + 80
    : 0;

  const layoutedUnconnected = unconnectedNodes.map((node, idx) => {
    const cols = 3;
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    return {
      ...node,
      position: {
        x: graphWidth + col * (NODE_WIDTH + 40),
        y: row * (GOAL_NODE_HEIGHT + 40) + 40,
      },
    };
  });

  return {
    nodes: [...layoutedConnected, ...layoutedUnconnected],
    edges,
  };
}

// ─── Custom Goal Node ────────────────────────────────────────────────────────

interface GoalNodeData {
  label: string;
  color: string;
  goalType: string;
  total: number;
  completed: number;
  isOrphan: boolean;
  isCompleted: boolean;
  goalId: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAddChild: (id: string) => void;
  onUnlink: (id: string) => void;
  hasParent: boolean;
  [key: string]: unknown;
}

function GoalNodeComponent({ data }: NodeProps<Node<GoalNodeData>>) {
  const progress = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
  const done = data.isCompleted;

  return (
    <Paper
      p="xs"
      radius="md"
      withBorder
      style={{
        borderLeft: `4px solid ${done ? 'var(--mantine-color-gray-5)' : data.color}`,
        width: NODE_WIDTH,
        minHeight: GOAL_NODE_HEIGHT,
        background: 'var(--mantine-color-body)',
        position: 'relative',
      }}
    >
      {/* Source at top: when this goal is a child, edge goes UP to parent */}
      <Handle type="source" position={Position.Top} style={{ background: done ? 'var(--mantine-color-gray-5)' : data.color, width: 10, height: 10 }} />

      {done && (
        <ThemeIcon
          variant="light"
          color="gray"
          size="sm"
          radius="xl"
          style={{ position: 'absolute', top: -10, right: -10, zIndex: 10 }}
        >
          <IconCheck size={12} />
        </ThemeIcon>
      )}

      {!done && data.isOrphan && (
        <ThemeIcon
          variant="light"
          color="yellow"
          size="sm"
          radius="xl"
          style={{ position: 'absolute', top: -10, right: -10, zIndex: 10 }}
        >
          <IconQuestionMark size={12} />
        </ThemeIcon>
      )}

      <Group justify="space-between" mb={4} wrap="nowrap">
        <Group gap={6} wrap="nowrap" style={{ overflow: 'hidden', flex: 1 }}>
          <ThemeIcon variant="light" color={done ? 'gray' : data.color} size="sm" radius="xl">
            <IconTarget size={14} />
          </ThemeIcon>
          <Text size="xs" fw={600} lineClamp={2} style={{ lineHeight: 1.3, textDecoration: done ? 'line-through' : undefined }} c={done ? 'dimmed' : undefined}>
            {data.label}
          </Text>
        </Group>
        <Menu shadow="md" width={160} position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon variant="subtle" size="xs" className="nodrag">
              <IconDots size={14} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconSubtask size={14} />} onClick={() => data.onAddChild(data.goalId)}>
              Подцель
            </Menu.Item>
            <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => data.onEdit(data.goalId)}>
              Редактировать
            </Menu.Item>
            {data.hasParent && (
              <Menu.Item leftSection={<IconLinkOff size={14} />} onClick={() => data.onUnlink(data.goalId)}>
                Отвязать
              </Menu.Item>
            )}
            <Menu.Divider />
            <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => data.onDelete(data.goalId)}>
              Удалить
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      <Badge size="xs" variant="light" color={done ? 'gray' : (data.goalType === 'yearly' ? 'orange' : 'blue')} mb={4}>
        {data.goalType === 'yearly' ? 'Год' : 'Квартал'}
      </Badge>

      <Group justify="space-between" mb={2}>
        <Text size="xs" c="dimmed">
          {data.completed}/{data.total} задач
        </Text>
        <Text size="xs" fw={600} c={done ? 'dimmed' : undefined}>
          {progress}%
        </Text>
      </Group>
      <Progress value={progress} color={done ? 'gray' : data.color} size="xs" radius="xl" />

      {/* Target at bottom: when this goal is a parent, receives edges from children below */}
      <Handle type="target" position={Position.Bottom} style={{ background: done ? 'var(--mantine-color-gray-5)' : data.color, width: 10, height: 10 }} />
    </Paper>
  );
}

// ─── Custom Project Node ─────────────────────────────────────────────────────

interface ProjectNodeData {
  label: string;
  color: string;
  total: number;
  completed: number;
  isOrphan: boolean;
  isCompleted: boolean;
  projectId: string;
  onUnlink: (id: string) => void;
  hasGoal: boolean;
  [key: string]: unknown;
}

function ProjectNodeComponent({ data }: NodeProps<Node<ProjectNodeData>>) {
  const done = data.isCompleted;

  return (
    <Paper
      p="xs"
      radius="md"
      withBorder
      style={{
        borderLeft: `4px solid ${done ? 'var(--mantine-color-gray-5)' : data.color}`,
        width: NODE_WIDTH,
        minHeight: PROJECT_NODE_HEIGHT,
        background: 'var(--mantine-color-body)',
        position: 'relative',
      }}
    >
      {/* Source at top: edge goes UP to parent goal */}
      <Handle type="source" position={Position.Top} style={{ background: done ? 'var(--mantine-color-gray-5)' : data.color, width: 10, height: 10 }} />

      {done && (
        <ThemeIcon
          variant="light"
          color="gray"
          size="sm"
          radius="xl"
          style={{ position: 'absolute', top: -10, right: -10, zIndex: 10 }}
        >
          <IconCheck size={12} />
        </ThemeIcon>
      )}

      {!done && data.isOrphan && (
        <ThemeIcon
          variant="light"
          color="yellow"
          size="sm"
          radius="xl"
          style={{ position: 'absolute', top: -10, right: -10, zIndex: 10 }}
        >
          <IconQuestionMark size={12} />
        </ThemeIcon>
      )}

      <Group justify="space-between" mb={4} wrap="nowrap">
        <Group gap={6} wrap="nowrap" style={{ overflow: 'hidden', flex: 1 }}>
          <ThemeIcon variant="light" color={done ? 'gray' : data.color} size="sm" radius="xl">
            <IconFolder size={14} />
          </ThemeIcon>
          <Text size="xs" fw={600} lineClamp={1} style={{ textDecoration: done ? 'line-through' : undefined }} c={done ? 'dimmed' : undefined}>
            {data.label}
          </Text>
        </Group>
        {data.hasGoal && (
          <ActionIcon variant="subtle" size="xs" className="nodrag" onClick={() => data.onUnlink(data.projectId)}>
            <IconLinkOff size={14} />
          </ActionIcon>
        )}
      </Group>

      <Text size="xs" c="dimmed">
        {data.completed}/{data.total} задач
      </Text>

      {/* Target at bottom: for drag-to-connect from goal above */}
      <Handle type="target" position={Position.Bottom} style={{ background: done ? 'var(--mantine-color-gray-5)' : data.color, width: 10, height: 10 }} />
    </Paper>
  );
}

// ─── Deletable Edge ──────────────────────────────────────────────────────────

interface DeletableEdgeData {
  onDelete: (edgeId: string, source: string, target: string) => void;
  edgeSource: string;
  edgeTarget: string;
  taskCount: number;
  [key: string]: unknown;
}

function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  data?: DeletableEdgeData;
  markerEnd?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const taskCount = data?.taskCount || 0;
  // Edge thickness: min 1.5, max 8, scales with sqrt of task count
  const baseWidth = Math.min(1.5 + Math.sqrt(taskCount) * 0.8, 8);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      {/* Invisible wider path for hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: hovered ? 'var(--mantine-color-red-5)' : 'var(--mantine-color-dimmed)',
          strokeWidth: hovered ? baseWidth + 1 : baseWidth,
          opacity: hovered ? 1 : 0.7,
        }}
      />
      {hovered && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <ActionIcon
              variant="filled"
              color="red"
              size="xs"
              radius="xl"
              onClick={() => data?.onDelete(id, data.edgeSource, data.edgeTarget)}
            >
              <IconTrash size={10} />
            </ActionIcon>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

// ─── Node & Edge types ───────────────────────────────────────────────────────

const nodeTypes: NodeTypes = {
  goalNode: GoalNodeComponent,
  projectNode: ProjectNodeComponent,
};

const edgeTypes: EdgeTypes = {
  deletable: DeletableEdge as unknown as EdgeTypes[string],
};

// ─── Create/Edit Forms ───────────────────────────────────────────────────────

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

// ─── Main Graph Component ────────────────────────────────────────────────────

function GoalsGraph() {
  const {
    goals, goalStats, projects, tasks,
    fetchGoals, fetchGoalStats, fetchProjects, fetchTasks,
    editGoal, editProject, removeGoal,
  } = useTaskStore();

  const [nodes, setNodes, onNodesChangeBase] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const [hideCompleted, setHideCompleted] = useState(false);
  const [allProjects, setAllProjects] = useState<Project[]>([]);

  // Wrap onNodesChange to debounce-save positions to localStorage
  const onNodesChange = useCallback((changes: Parameters<typeof onNodesChangeBase>[0]) => {
    onNodesChangeBase(changes);
    const hasPositionChange = changes.some((c: { type: string }) => c.type === 'position');
    if (hasPositionChange) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        setNodes((prev) => { savePositions(prev); return prev; });
      }, 300);
    }
  }, [onNodesChangeBase, setNodes]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | undefined>();
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const reactFlowInstance = useReactFlow();
  const initialLoadRef = useRef(true);

  // Fetch all projects including deleted (for goals graph)
  const fetchAllProjects = useCallback(async () => {
    const { data } = await getProjects({ include_deleted: true });
    setAllProjects(data);
  }, []);

  // Fetch all data on mount
  useEffect(() => {
    fetchGoals();
    fetchGoalStats();
    fetchProjects();
    fetchAllProjects();
    fetchTasks({});
  }, []);

  // Handlers
  const handleEdit = useCallback((id: string) => {
    const goal = useTaskStore.getState().goals.find((g) => g.id === id);
    if (goal) setEditingGoal(goal);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const goal = useTaskStore.getState().goals.find((g) => g.id === id);
    if (goal && confirm(`Удалить цель «${goal.title}»?`)) {
      await removeGoal(id);
      await fetchGoalStats();
    }
  }, [removeGoal, fetchGoalStats]);

  const handleAddChild = useCallback((parentId: string) => {
    setCreateParentId(parentId);
    setCreateOpen(true);
  }, []);

  const handleUnlinkGoal = useCallback(async (id: string) => {
    await editGoal(id, { parent_goal_id: null });
    await Promise.all([fetchGoals(), fetchGoalStats()]);
  }, [editGoal, fetchGoals, fetchGoalStats]);

  const handleUnlinkProject = useCallback(async (id: string) => {
    await editProject(id, { goal_id: null });
    await Promise.all([fetchProjects(), fetchAllProjects(), fetchGoalStats()]);
  }, [editProject, fetchProjects, fetchAllProjects, fetchGoalStats]);

  const handleEdgeDelete = useCallback(async (edgeId: string, source: string, target: string) => {
    if (edgeId.startsWith('goal-')) {
      await editGoal(target, { parent_goal_id: null });
    } else if (edgeId.startsWith('proj-')) {
      const projectId = target.replace('project-', '');
      await editProject(projectId, { goal_id: null });
    }
    await Promise.all([fetchGoals(), fetchProjects(), fetchAllProjects(), fetchGoalStats()]);
  }, [editGoal, editProject, fetchGoals, fetchProjects, fetchAllProjects, fetchGoalStats]);

  // Helper: compute edges and nodes from current store data
  const computeNodesAndEdges = useCallback(() => {
    const { goals: g, goalStats: gs, tasks: t } = useTaskStore.getState();
    // Use allProjects (includes deleted/completed) for the goals graph
    const graphProjects = allProjects;

    // Precompute completion status for goals and projects
    // A project is "completed" if it's soft-deleted OR all its tasks are done
    const goalCompletionMap = new Map<string, boolean>();
    g.forEach((goal) => {
      const stats = getAggregatedStats(goal.id, g, gs, graphProjects, t);
      goalCompletionMap.set(goal.id, stats.total > 0 && stats.completed === stats.total);
    });

    const projectCompletionMap = new Map<string, boolean>();
    graphProjects.forEach((proj) => {
      if (proj.deleted_at) {
        projectCompletionMap.set(proj.id, true);
      } else {
        const projTasks = t.filter((task) => task.project_id === proj.id);
        const total = projTasks.length;
        const completed = projTasks.filter((task) => task.completed).length;
        projectCompletionMap.set(proj.id, total > 0 && completed === total);
      }
    });

    // Filter based on hideCompleted
    const filteredGoals = hideCompleted
      ? g.filter((goal) => !goalCompletionMap.get(goal.id))
      : g;
    const filteredGoalIds = new Set(filteredGoals.map((g) => g.id));

    const filteredProjects = hideCompleted
      ? graphProjects.filter((proj) => !projectCompletionMap.get(proj.id))
      : graphProjects;
    const filteredProjectIds = new Set(filteredProjects.map((p) => p.id));

    // Build edges
    const newEdges: Edge[] = [];

    // Child goal → Parent goal edges
    filteredGoals.forEach((goal) => {
      if (goal.parent_goal_id && filteredGoalIds.has(goal.parent_goal_id)) {
        const childStats = getAggregatedStats(goal.id, g, gs, graphProjects, t);
        newEdges.push({
          id: `goal-${goal.parent_goal_id}-${goal.id}`,
          source: goal.id,
          target: goal.parent_goal_id,
          type: 'deletable',
          data: {
            onDelete: handleEdgeDelete,
            edgeSource: goal.parent_goal_id,
            edgeTarget: goal.id,
            taskCount: childStats.total,
          },
        });
      }
    });

    // Project → Goal edges
    filteredProjects.forEach((proj) => {
      if (proj.goal_id && filteredGoalIds.has(proj.goal_id)) {
        const projTasks = t.filter((task) => task.project_id === proj.id);
        const projTotal = projTasks.length;
        newEdges.push({
          id: `proj-${proj.goal_id}-${proj.id}`,
          source: `project-${proj.id}`,
          target: proj.goal_id,
          type: 'deletable',
          data: {
            onDelete: handleEdgeDelete,
            edgeSource: proj.goal_id,
            edgeTarget: `project-${proj.id}`,
            taskCount: projTotal,
          },
        });
      }
    });

    const connectedIds = new Set<string>();
    newEdges.forEach((e) => {
      connectedIds.add(e.source);
      connectedIds.add(e.target);
    });

    // Goal nodes
    const goalNodes: Node[] = filteredGoals.map((goal) => {
      const aggStats = getAggregatedStats(goal.id, g, gs, graphProjects, t);
      const isOrphan = !connectedIds.has(goal.id);

      return {
        id: goal.id,
        type: 'goalNode',
        position: { x: 0, y: 0 },
        data: {
          label: goal.title,
          color: goal.color,
          goalType: goal.goal_type,
          total: aggStats.total,
          completed: aggStats.completed,
          isOrphan,
          isCompleted: goalCompletionMap.get(goal.id) || false,
          goalId: goal.id,
          onEdit: handleEdit,
          onDelete: handleDelete,
          onAddChild: handleAddChild,
          onUnlink: handleUnlinkGoal,
          hasParent: !!goal.parent_goal_id,
        } satisfies GoalNodeData,
      };
    });

    // Project nodes
    const projectNodes: Node[] = filteredProjects.map((proj) => {
      const projTasks = t.filter((task) => task.project_id === proj.id);
      const total = projTasks.length;
      const completed = projTasks.filter((task) => task.completed).length;
      const nodeId = `project-${proj.id}`;
      const isOrphan = !connectedIds.has(nodeId);

      return {
        id: nodeId,
        type: 'projectNode',
        position: { x: 0, y: 0 },
        data: {
          label: proj.title,
          color: proj.color,
          total,
          completed,
          isOrphan,
          isCompleted: projectCompletionMap.get(proj.id) || false,
          projectId: proj.id,
          onUnlink: handleUnlinkProject,
          hasGoal: !!proj.goal_id,
        } satisfies ProjectNodeData,
      };
    });

    return { nodes: [...goalNodes, ...projectNodes], edges: newEdges };
  }, [allProjects, hideCompleted, handleEdit, handleDelete, handleAddChild, handleUnlinkGoal, handleUnlinkProject, handleEdgeDelete]);

  // Full layout: positions all nodes via Dagre. Called on button click and initial load.
  const applyLayout = useCallback((useSaved = false) => {
    const { nodes: newNodes, edges: newEdges } = computeNodesAndEdges();
    const saved = useSaved ? loadPositions() : null;

    let finalNodes: Node[];
    if (saved && newNodes.every((n) => saved[n.id])) {
      // All positions found in localStorage — restore them
      finalNodes = newNodes.map((n) => ({ ...n, position: saved[n.id] }));
    } else {
      // Run dagre layout
      const layouted = getLayoutedElements(newNodes, newEdges);
      finalNodes = layouted.nodes;
    }

    setNodes(finalNodes);
    setEdges(newEdges);
    savePositions(finalNodes);
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2 });
    }, 50);
  }, [computeNodesAndEdges, setNodes, setEdges, reactFlowInstance]);

  // Data-only update: updates node data and edges without resetting positions.
  // New nodes (not yet on canvas) get placed via Dagre.
  const syncData = useCallback(() => {
    const { nodes: newNodes, edges: newEdges } = computeNodesAndEdges();

    setNodes((prevNodes) => {
      const existingPositions = new Map(prevNodes.map((n) => [n.id, n.position]));
      const currentIds = new Set(prevNodes.map((n) => n.id));
      const addedNodes = newNodes.filter((n) => !currentIds.has(n.id));

      // If there are new nodes, run dagre to get positions for them
      let newNodePositions = new Map<string, { x: number; y: number }>();
      if (addedNodes.length > 0) {
        const layouted = getLayoutedElements(newNodes, newEdges);
        newNodePositions = new Map(layouted.nodes.map((n) => [n.id, n.position]));
      }

      const result = newNodes.map((node) => ({
        ...node,
        position: existingPositions.get(node.id) || newNodePositions.get(node.id) || node.position,
      }));
      savePositions(result);
      return result;
    });
    setEdges(newEdges);
  }, [computeNodesAndEdges, setNodes, setEdges]);

  // Initial layout on first data load (try to restore saved positions)
  useEffect(() => {
    if (initialLoadRef.current && (goals.length > 0 || allProjects.length > 0)) {
      initialLoadRef.current = false;
      applyLayout(true);
    }
  }, [goals, allProjects, applyLayout]);

  // Sync node data when store data or filter changes (without resetting positions)
  useEffect(() => {
    if (initialLoadRef.current) return; // skip before initial layout
    syncData();
  }, [goals, goalStats, allProjects, tasks, hideCompleted, syncData]);

  // Handle new connections (drag-to-connect)
  // With reversed edges: source = child (dragged from source handle at top),
  // target = parent (dropped on target handle at bottom)
  const onConnect = useCallback(async (connection: Connection) => {
    if (!connection.source || !connection.target) return;

    const sourceIsProject = connection.source.startsWith('project-');
    const sourceIsGoal = !sourceIsProject;

    if (sourceIsGoal) {
      // Child goal → Parent goal: set parent_goal_id on the source (child)
      await editGoal(connection.source, { parent_goal_id: connection.target });
    } else {
      // Project → Goal: set goal_id on the project
      const projectId = connection.source.replace('project-', '');
      await editProject(projectId, { goal_id: connection.target });
    }

    await Promise.all([fetchGoals(), fetchProjects(), fetchAllProjects(), fetchGoalStats()]);
  }, [editGoal, editProject, fetchGoals, fetchProjects, fetchAllProjects, fetchGoalStats]);

  const handleAutoLayout = useCallback(() => {
    applyLayout(false); // force dagre, ignore saved positions
  }, [applyLayout]);

  const hasData = goals.length > 0 || allProjects.length > 0;

  return (
    <Stack style={{ height: 'calc(100vh - 80px)' }} gap="xs">
      {/* Header */}
      <Group justify="space-between">
        <Group gap="lg">
          <div>
            <Title order={3}>Дерево целей</Title>
            <Text size="sm" c="dimmed">Связывайте цели и проекты перетаскиванием</Text>
          </div>
          <Switch
            label="Скрыть завершённые"
            checked={hideCompleted}
            onChange={(e) => setHideCompleted(e.currentTarget.checked)}
            size="sm"
          />
        </Group>
        <Group gap="xs">
          <Button
            variant="light"
            leftSection={<IconLayoutDistributeVertical size={16} />}
            onClick={handleAutoLayout}
            size="sm"
          >
            Раскладка
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => { setCreateParentId(undefined); setCreateOpen(true); }}
            size="sm"
          >
            Новая цель
          </Button>
        </Group>
      </Group>

      {/* Graph or Empty state */}
      {!hasData ? (
        <Paper p="xl" radius="md" withBorder ta="center" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div>
            <ThemeIcon size={60} radius="xl" variant="light" color="indigo" mx="auto" mb="md">
              <IconTarget size={32} />
            </ThemeIcon>
            <Title order={4} mb="xs">Поставьте свою первую цель</Title>
            <Text size="sm" c="dimmed" maw={400} mx="auto" mb="md">
              Цели помогают видеть общую картину. Создавайте цели и связывайте их
              с проектами, перетаскивая соединения между нодами.
            </Text>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => { setCreateParentId(undefined); setCreateOpen(true); }}
            >
              Создать цель
            </Button>
          </div>
        </Paper>
      ) : (
        <div style={{ flex: 1, borderRadius: 'var(--mantine-radius-md)', overflow: 'hidden', border: '1px solid var(--mantine-color-default-border)' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.3}
            maxZoom={2}
            defaultEdgeOptions={{
              type: 'deletable',
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} size={1} />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                const data = node.data as GoalNodeData | ProjectNodeData;
                return data?.color || '#888';
              }}
              maskColor="rgba(0,0,0,0.1)"
              style={{ borderRadius: 8 }}
            />
          </ReactFlow>
        </div>
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
    </Stack>
  );
}

// ─── Page wrapper with ReactFlowProvider ─────────────────────────────────────

export function GoalsPage() {
  return (
    <ReactFlowProvider>
      <GoalsGraph />
    </ReactFlowProvider>
  );
}
