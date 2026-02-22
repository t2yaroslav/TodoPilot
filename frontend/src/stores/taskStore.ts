import { create } from 'zustand';
import * as api from '@/api/client';

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

// Smart color: pick maximally distant hue from existing project colors
function pickNextProjectColor(existingColors: string[]): string {
  const BASE_HUES = [210, 340, 140, 35, 270, 180, 10, 85, 310, 55, 240, 160];
  const usedHues = existingColors.map((c) => {
    const m = c.match(/^hsl\((\d+)/);
    return m ? parseInt(m[1]) : -1;
  }).filter((h) => h >= 0);

  // Use predefined palette first
  for (const hue of BASE_HUES) {
    if (!usedHues.some((h) => Math.abs(h - hue) < 15)) {
      return `hsl(${hue}, 65%, 50%)`;
    }
  }

  // Fallback: find the largest gap between existing hues
  if (usedHues.length === 0) return `hsl(${BASE_HUES[0]}, 65%, 50%)`;
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
  return `hsl(${Math.round(bestHue)}, 65%, 50%)`;
}

interface TaskStore {
  tasks: Task[];
  projects: Project[];
  goals: Goal[];
  projectTaskCounts: Record<string, number>;
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
  addGoal: (data: Record<string, unknown>) => Promise<Goal>;
  editGoal: (id: string, data: Record<string, unknown>) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  projects: [],
  goals: [],
  projectTaskCounts: {},
  navCounts: { today: 0, inbox: 0, completed: 0 },
  loading: false,

  fetchTasks: async (params) => {
    set({ loading: true });
    const { data } = await api.getTasks(params);
    set({ tasks: data, loading: false });
  },

  addTask: async (taskData) => {
    const { data } = await api.createTask(taskData);
    set({ tasks: [...get().tasks, data] });
    return data;
  },

  editTask: async (id, updates) => {
    const { data } = await api.updateTask(id, updates);
    set({ tasks: get().tasks.map((t) => (t.id === id ? data : t)) });
  },

  removeTask: async (id) => {
    await api.deleteTask(id);
    set({ tasks: get().tasks.filter((t) => t.id !== id) });
  },

  toggleTask: async (id, completed) => {
    const { data } = await api.updateTask(id, { completed });
    set({ tasks: get().tasks.map((t) => (t.id === id ? data : t)) });
  },

  fetchProjects: async () => {
    const { data } = await api.getProjects();
    set({ projects: data });
  },

  fetchProjectTaskCounts: async () => {
    const { data } = await api.getProjectTaskCounts();
    set({ projectTaskCounts: data });
  },

  fetchNavCounts: async () => {
    const { data } = await api.getTaskCounts();
    set({ navCounts: data });
  },

  refreshAllCounts: async () => {
    const [projCounts, navCounts] = await Promise.all([
      api.getProjectTaskCounts(),
      api.getTaskCounts(),
    ]);
    set({ projectTaskCounts: projCounts.data, navCounts: navCounts.data });
  },

  addProject: async (projData) => {
    // Auto-assign color if not provided
    if (!projData.color) {
      const existingColors = get().projects.map((p) => p.color);
      projData = { ...projData, color: pickNextProjectColor(existingColors) };
    }
    const { data } = await api.createProject(projData);
    set({ projects: [...get().projects, data] });
    return data;
  },

  editProject: async (id, updates) => {
    const { data } = await api.updateProject(id, updates);
    set({ projects: get().projects.map((p) => (p.id === id ? data : p)) });
  },

  removeProject: async (id) => {
    await api.deleteProject(id);
    set({ projects: get().projects.filter((p) => p.id !== id) });
  },

  fetchGoals: async () => {
    const { data } = await api.getGoals();
    set({ goals: data });
  },

  addGoal: async (goalData) => {
    const { data } = await api.createGoal(goalData);
    set({ goals: [...get().goals, data] });
    return data;
  },

  editGoal: async (id, updates) => {
    const { data } = await api.updateGoal(id, updates);
    set({ goals: get().goals.map((g) => (g.id === id ? data : g)) });
  },

  removeGoal: async (id) => {
    await api.deleteGoal(id);
    set({ goals: get().goals.filter((g) => g.id !== id) });
  },
}));
