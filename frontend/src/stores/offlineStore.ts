import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OpType =
  | 'create_task'
  | 'update_task'
  | 'delete_task'
  | 'create_project'
  | 'update_project'
  | 'delete_project'
  | 'create_goal'
  | 'update_goal'
  | 'delete_goal';

export interface OfflineOp {
  id: string;
  type: OpType;
  /** Temp UUID (prefixed "temp_") for creates, real server UUID for updates/deletes */
  entityId: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

interface OfflineState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingOps: OfflineOp[];
}

interface OfflineActions {
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  enqueue: (op: Omit<OfflineOp, 'id' | 'timestamp'>) => void;
  clearOps: () => void;
}

export const useOfflineStore = create<OfflineState & OfflineActions>()(
  persist(
    (set, get) => ({
      isOnline: navigator.onLine,
      isSyncing: false,
      pendingOps: [],

      setOnline: (online) => set({ isOnline: online }),
      setSyncing: (syncing) => set({ isSyncing: syncing }),
      clearOps: () => set({ pendingOps: [] }),

      enqueue: (op) => {
        const ops = get().pendingOps;

        // Merge consecutive updates for the same entity
        if (op.type === 'update_task' || op.type === 'update_project' || op.type === 'update_goal') {
          let existingIdx = -1;
          for (let i = ops.length - 1; i >= 0; i--) {
            if (ops[i].type === op.type && ops[i].entityId === op.entityId) {
              existingIdx = i;
              break;
            }
          }
          if (existingIdx !== -1) {
            const updated = [...ops];
            updated[existingIdx] = {
              ...updated[existingIdx],
              data: { ...updated[existingIdx].data, ...op.data },
              timestamp: Date.now(),
            };
            set({ pendingOps: updated });
            return;
          }
        }

        // For delete: remove prior update/create ops for the same entity
        if (op.type === 'delete_task' || op.type === 'delete_project' || op.type === 'delete_goal') {
          const entity = op.type.replace('delete_', '') as 'task' | 'project' | 'goal';
          const updateType = `update_${entity}` as OpType;
          const createType = `create_${entity}` as OpType;

          const hadTempCreate = ops.some(
            (o) => o.type === createType && o.entityId === op.entityId,
          );

          const filtered = ops.filter(
            (o) => !((o.type === updateType || o.type === createType) && o.entityId === op.entityId),
          );

          // If the entity was created offline (temp), removing from queue is enough
          if (hadTempCreate) {
            set({ pendingOps: filtered });
            return;
          }

          set({ pendingOps: [...filtered, { ...op, id: crypto.randomUUID(), timestamp: Date.now() }] });
          return;
        }

        set({ pendingOps: [...ops, { ...op, id: crypto.randomUUID(), timestamp: Date.now() }] });
      },
    }),
    {
      name: 'todopilot-offline',
      partialize: (state) => ({ pendingOps: state.pendingOps }),
    },
  ),
);
