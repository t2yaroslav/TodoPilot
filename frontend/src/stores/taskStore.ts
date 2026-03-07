import { create } from 'zustand';
import * as api from '@/api/client';
import { useOfflineStore } from '@/stores/offlineStore';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: number;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  project_id: string | null;
  goal_id: string | null;
  parent_task_id: string | null;
  recurrence: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  title: string;
  color: string;
  goal_id: string | null;
  position: number;
  created_at: string;
}

export interface Goal {
  id: string;
  title: string;
  color: string;
  goal_type: string;
  parent_goal_id: string | null;
  created_at: string;
}

export interface NavCounts {
  today: number;
  inbox: number;
  completed: number;
}

// Convert HSL (h: 0-360, s: 0-1, l: 0-1) to hex #RRGGBB
function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Extract hue (0-360) from hex color
function hexToHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
  else if (max === g) h = ((b - r) / d + 2);
  else h = ((r - g) / d + 4);
  return h * 60;
}

// Smart color: pick maximally distant hue from existing project colors
function pickNextProjectColor(existingColors: string[]): string {
  const BASE_HUES = [210, 340, 140, 35, 270, 180, 10, 85, 310, 55, 240, 160];
  const usedHues = existingColors
    .filter((c) => c.startsWith('#') && c.length === 7)
    .map(hexToHue);

  // Use predefined palette first
  for (const hue of BASE_HUES) {
    if (!usedHues.some((h) => Math.abs(h - hue) < 15)) {
      return hslToHex(hue, 0.65, 0.5);
    }
  }

  // Fallback: find the largest gap between existing hues
  if (usedHues.length === 0) return hslToHex(BASE_HUES[0], 0.65, 0.5);
  const sorted = [...usedHues].sort((a, b) => a - b);
  let bestHue = 0;
  let bestGap = 0;
  for (let i = 0; i < sorted.length; i++) {
    const next = i + 1 < sorted.length ? sorted[i + 1] : sorted[0] + 360;
    const gap = next - sorted[i];
    if (gap > bestGap) {
      bestGap = gap;
      bestHue = (sorted[i] + gap / 2) % 360;
    }
  }
  return hslToHex(Math.round(bestHue), 0.65, 0.5);
}

export interface GoalStats {
  total_tasks: number;
  completed_tasks: number;
  projects: number;
}

/** Returns true if the error is a network-level failure (no server response) */
function isNetworkError(err: unknown): boolean {
  return !!(err && typeof err === 'object' && 'isAxiosError' in err && !(err as { response?: unknown }).response);
}

/** Build a minimal optimistic Task object for offline creates */
function makeOptimisticTask(id: string, taskData: Record<string, unknown>, position: number): Task {
  const now = new Date().toISOString();
  return {
    id,
    title: (taskData.title as string) ?? '',
    description: (taskData.description as string) ?? null,
    priority: (taskData.priority as number) ?? 0,
    due_date: (taskData.due_date as string) ?? null,
    completed: false,
    completed_at: null,
    project_id: (taskData.project_id as string) ?? null,
    goal_id: (taskData.goal_id as string) ?? null,
    parent_task_id: (taskData.parent_task_id as string) ?? null,
    recurrence: (taskData.recurrence as string) ?? null,
    position,
    created_at: now,
    updated_at: now,
  };
}

/** Build a minimal optimistic Project object for offline creates */
function makeOptimisticProject(id: string, data: Record<string, unknown>, position: number): Project {
  return {
    id,
    title: (data.title as string) ?? '',
    color: (data.color as string) ?? '#4a90d9',
    goal_id: (data.goal_id as string) ?? null,
    position,
    created_at: new Date().toISOString(),
  };
}

/** Build a minimal optimistic Goal object for offline creates */
function makeOptimisticGoal(id: string, data: Record<string, unknown>): Goal {
  return {
    id,
    title: (data.title as string) ?? '',
    color: (data.color as string) ?? '#4a90d9',
    goal_type: (data.goal_type as string) ?? 'quarterly',
    parent_goal_id: (data.parent_goal_id as string) ?? null,
    created_at: new Date().toISOString(),
  };
}

interface TaskStore {
  tasks: Task[];
  projects: Project[];
  goals: Goal[];
  projectTaskCounts: Record<string, number>;
  goalStats: Record<string, GoalStats>;
  navCounts: NavCounts;
  loading: boolean;

  fetchTasks: (params?: Record<string, unknown>) => Promise<void>;
  addTask: (data: Record<string, unknown>) => Promise<Task>;
  editTask: (id: string, data: Record<string, unknown>) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  toggleTask: (id: string, completed: boolean) => Promise<void>;

  fetchProjects: () => Promise<void>;
  fetchProjectTaskCounts: () => Promise<void>;
  fetchNavCounts: () => Promise<void>;
  refreshAllCounts: () => Promise<void>;
  addProject: (data: Record<string, unknown>) => Promise<Project>;
  editProject: (id: string, data: Record<string, unknown>) => Promise<void>;
  removeProject: (id: string) => Promise<void>;

  fetchGoals: () => Promise<void>;
  fetchGoalStats: () => Promise<void>;
  addGoal: (data: Record<string, unknown>) => Promise<Goal>;
  editGoal: (id: string, data: Record<string, unknown>) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  projects: [],
  goals: [],
  projectTaskCounts: {},
  goalStats: {},
  navCounts: { today: 0, inbox: 0, completed: 0 },
  loading: false,

  // ── Tasks ───────────────────────────────────────────────────────────────

  fetchTasks: async (params) => {
    set({ loading: true });
    try {
      const { data } = await api.getTasks(params);
      set({ tasks: data, loading: false });
    } catch (err) {
      set({ loading: false });
      if (!isNetworkError(err)) throw err;
      // Silently keep existing cached data when offline
    }
  },

  addTask: async (taskData) => {
    const { isOnline, enqueue } = useOfflineStore.getState();
    if (!isOnline) {
      const tempId = `temp_${crypto.randomUUID()}`;
      const optimistic = makeOptimisticTask(tempId, taskData, get().tasks.length);
      set({ tasks: [...get().tasks, optimistic] });
      enqueue({ type: 'create_task', entityId: tempId, data: taskData });
      return optimistic;
    }
    const { data } = await api.createTask(taskData);
    set({ tasks: [...get().tasks, data] });
    return data;
  },

  editTask: async (id, updates) => {
    const { isOnline, enqueue } = useOfflineStore.getState();
    if (!isOnline) {
      set({
        tasks: get().tasks.map((t) =>
          t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t,
        ),
      });
      enqueue({ type: 'update_task', entityId: id, data: updates });
      return;
    }
    const { data } = await api.updateTask(id, updates);
    set({ tasks: get().tasks.map((t) => (t.id === id ? data : t)) });
  },

  removeTask: async (id) => {
    const { isOnline, enqueue } = useOfflineStore.getState();
    if (!isOnline) {
      set({ tasks: get().tasks.filter((t) => t.id !== id) });
      enqueue({ type: 'delete_task', entityId: id });
      return;
    }
    await api.deleteTask(id);
    set({ tasks: get().tasks.filter((t) => t.id !== id) });
  },

  toggleTask: async (id, completed) => {
    const { isOnline, enqueue } = useOfflineStore.getState();
    if (!isOnline) {
      set({
        tasks: get().tasks.map((t) =>
          t.id === id
            ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null }
            : t,
        ),
      });
      enqueue({ type: 'update_task', entityId: id, data: { completed } });
      return;
    }
    const { data } = await api.updateTask(id, { completed });
    set({ tasks: get().tasks.map((t) => (t.id === id ? data : t)) });
  },

  // ── Projects ────────────────────────────────────────────────────────────

  fetchProjects: async () => {
    try {
      const { data } = await api.getProjects();
      set({ projects: data });
    } catch (err) {
      if (!isNetworkError(err)) throw err;
    }
  },

  fetchProjectTaskCounts: async () => {
    try {
      const { data } = await api.getProjectTaskCounts();
      set({ projectTaskCounts: data });
    } catch (err) {
      if (!isNetworkError(err)) throw err;
    }
  },

  fetchNavCounts: async () => {
    try {
      const { data } = await api.getTaskCounts();
      set({ navCounts: data });
    } catch (err) {
      if (!isNetworkError(err)) throw err;
    }
  },

  refreshAllCounts: async () => {
    try {
      const [projCounts, navCounts] = await Promise.all([
        api.getProjectTaskCounts(),
        api.getTaskCounts(),
      ]);
      set({ projectTaskCounts: projCounts.data, navCounts: navCounts.data });
    } catch (err) {
      if (!isNetworkError(err)) throw err;
    }
  },

  addProject: async (projData) => {
    if (!projData.color) {
      const existingColors = get().projects.map((p) => p.color);
      projData = { ...projData, color: pickNextProjectColor(existingColors) };
    }
    const { isOnline, enqueue } = useOfflineStore.getState();
    if (!isOnline) {
      const tempId = `temp_${crypto.randomUUID()}`;
      const optimistic = makeOptimisticProject(tempId, projData, get().projects.length);
      set({ projects: [...get().projects, optimistic] });
      enqueue({ type: 'create_project', entityId: tempId, data: projData });
      return optimistic;
    }
    const { data } = await api.createProject(projData);
    set({ projects: [...get().projects, data] });
    return data;
  },

  editProject: async (id, updates) => {
    const { isOnline, enqueue } = useOfflineStore.getState();
    if (!isOnline) {
      set({ projects: get().projects.map((p) => (p.id === id ? { ...p, ...updates } : p)) });
      enqueue({ type: 'update_project', entityId: id, data: updates });
      return;
    }
    const { data } = await api.updateProject(id, updates);
    set({ projects: get().projects.map((p) => (p.id === id ? data : p)) });
  },

  removeProject: async (id) => {
    const { isOnline, enqueue } = useOfflineStore.getState();
    if (!isOnline) {
      set({ projects: get().projects.filter((p) => p.id !== id) });
      enqueue({ type: 'delete_project', entityId: id });
      return;
    }
    await api.deleteProject(id);
    set({ projects: get().projects.filter((p) => p.id !== id) });
  },

  // ── Goals ───────────────────────────────────────────────────────────────

  fetchGoals: async () => {
    try {
      const { data } = await api.getGoals();
      set({ goals: data });
    } catch (err) {
      if (!isNetworkError(err)) throw err;
    }
  },

  fetchGoalStats: async () => {
    try {
      const { data } = await api.getGoalStats();
      set({ goalStats: data });
    } catch (err) {
      if (!isNetworkError(err)) throw err;
    }
  },

  addGoal: async (goalData) => {
    const { isOnline, enqueue } = useOfflineStore.getState();
    if (!isOnline) {
      const tempId = `temp_${crypto.randomUUID()}`;
      const optimistic = makeOptimisticGoal(tempId, goalData);
      set({ goals: [...get().goals, optimistic] });
      enqueue({ type: 'create_goal', entityId: tempId, data: goalData });
      return optimistic;
    }
    const { data } = await api.createGoal(goalData);
    set({ goals: [...get().goals, data] });
    return data;
  },

  editGoal: async (id, updates) => {
    const { isOnline, enqueue } = useOfflineStore.getState();
    if (!isOnline) {
      set({ goals: get().goals.map((g) => (g.id === id ? { ...g, ...updates } : g)) });
      enqueue({ type: 'update_goal', entityId: id, data: updates });
      return;
    }
    const { data } = await api.updateGoal(id, updates);
    set({ goals: get().goals.map((g) => (g.id === id ? data : g)) });
  },

  removeGoal: async (id) => {
    const { isOnline, enqueue } = useOfflineStore.getState();
    if (!isOnline) {
      set({ goals: get().goals.filter((g) => g.id !== id) });
      enqueue({ type: 'delete_goal', entityId: id });
      return;
    }
    await api.deleteGoal(id);
    set({ goals: get().goals.filter((g) => g.id !== id) });
  },
}));
