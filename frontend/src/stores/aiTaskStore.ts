import { create } from 'zustand';

export type AITaskStatus = 'running' | 'done' | 'error';

export interface AITask {
  id: string;
  type: string;
  label: string;
  status: AITaskStatus;
  result?: unknown;
  error?: string;
  startedAt: number;
  finishedAt?: number;
}

interface AITaskState {
  tasks: AITask[];
  /** True when at least one task is running */
  hasRunning: boolean;
  /** True when at least one task finished (done or error) and hasn't been dismissed */
  hasFinished: boolean;

  /** Run a promise in the background and track its status */
  runTask: (type: string, label: string, fn: () => Promise<unknown>) => string;
  /** Dismiss a finished task */
  dismissTask: (id: string) => void;
  /** Clear all finished tasks */
  clearFinished: () => void;
}

let taskCounter = 0;

function recompute(tasks: AITask[]) {
  return {
    tasks,
    hasRunning: tasks.some((t) => t.status === 'running'),
    hasFinished: tasks.some((t) => t.status === 'done' || t.status === 'error'),
  };
}

export const useAITaskStore = create<AITaskState>((set, get) => ({
  tasks: [],
  hasRunning: false,
  hasFinished: false,

  runTask: (type: string, label: string, fn: () => Promise<unknown>) => {
    const id = `ai-task-${++taskCounter}-${Date.now()}`;
    const task: AITask = {
      id,
      type,
      label,
      status: 'running',
      startedAt: Date.now(),
    };

    set((s) => recompute([...s.tasks, task]));

    fn()
      .then((result) => {
        set((s) =>
          recompute(
            s.tasks.map((t) =>
              t.id === id ? { ...t, status: 'done' as const, result, finishedAt: Date.now() } : t,
            ),
          ),
        );
      })
      .catch((err) => {
        set((s) =>
          recompute(
            s.tasks.map((t) =>
              t.id === id
                ? { ...t, status: 'error' as const, error: err?.message || 'Ошибка', finishedAt: Date.now() }
                : t,
            ),
          ),
        );
      });

    return id;
  },

  dismissTask: (id: string) => {
    set((s) => recompute(s.tasks.filter((t) => t.id !== id)));
  },

  clearFinished: () => {
    set((s) => recompute(s.tasks.filter((t) => t.status === 'running')));
  },
}));
