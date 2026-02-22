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

interface TaskStore {
  tasks: Task[];
  projects: Project[];
  goals: Goal[];
  projectTaskCounts: Record<string, number>;
  loading: boolean;

  fetchTasks: (params?: Record<string, unknown>) => Promise<void>;
  addTask: (data: Record<string, unknown>) => Promise<Task>;
  editTask: (id: string, data: Record<string, unknown>) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  toggleTask: (id: string, completed: boolean) => Promise<void>;

  fetchProjects: () => Promise<void>;
  fetchProjectTaskCounts: () => Promise<void>;
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

  addProject: async (projData) => {
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
