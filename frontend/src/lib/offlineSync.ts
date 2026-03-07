import * as apiClient from '@/api/client';
import { useOfflineStore } from '@/stores/offlineStore';
import { useTaskStore } from '@/stores/taskStore';

/** Replace any temp IDs embedded in a data object with their real server IDs */
function resolveData(
  data: Record<string, unknown>,
  tempIdMap: Record<string, string>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [
      k,
      typeof v === 'string' && tempIdMap[v] ? tempIdMap[v] : v,
    ]),
  );
}

/**
 * Replay all queued offline operations against the server.
 * Called automatically when connectivity is restored.
 */
export async function syncOfflineOps(): Promise<void> {
  const { pendingOps, isSyncing, setSyncing, clearOps } = useOfflineStore.getState();

  if (isSyncing || pendingOps.length === 0) {
    // Even if no ops, refresh counts to stay in sync
    if (!isSyncing) {
      const ts = useTaskStore.getState();
      await Promise.allSettled([ts.fetchProjects(), ts.fetchGoals(), ts.refreshAllCounts()]);
    }
    return;
  }

  setSyncing(true);

  // Maps temp UUIDs → real server UUIDs, built up as we process creates
  const tempIdMap: Record<string, string> = {};

  try {
    for (const op of pendingOps) {
      try {
        const resolvedEntityId = tempIdMap[op.entityId] ?? op.entityId;

        switch (op.type) {
          // ── Tasks ─────────────────────────────────────────────────────────
          case 'create_task': {
            const payload = resolveData(op.data ?? {}, tempIdMap);
            const { data } = await apiClient.createTask(payload);
            if (op.entityId.startsWith('temp_')) {
              tempIdMap[op.entityId] = data.id;
              // Swap the temp entity out for the real server entity in local state
              useTaskStore.setState((s) => ({
                tasks: s.tasks.map((t) => (t.id === op.entityId ? data : t)),
              }));
            }
            break;
          }
          case 'update_task': {
            if (resolvedEntityId.startsWith('temp_')) break; // create not yet processed
            const payload = resolveData(op.data ?? {}, tempIdMap);
            const { data } = await apiClient.updateTask(resolvedEntityId, payload);
            useTaskStore.setState((s) => ({
              tasks: s.tasks.map((t) => (t.id === resolvedEntityId ? data : t)),
            }));
            break;
          }
          case 'delete_task': {
            if (!resolvedEntityId.startsWith('temp_')) {
              await apiClient.deleteTask(resolvedEntityId);
            }
            break;
          }

          // ── Projects ──────────────────────────────────────────────────────
          case 'create_project': {
            const payload = resolveData(op.data ?? {}, tempIdMap);
            const { data } = await apiClient.createProject(payload);
            if (op.entityId.startsWith('temp_')) {
              tempIdMap[op.entityId] = data.id;
              useTaskStore.setState((s) => ({
                projects: s.projects.map((p) => (p.id === op.entityId ? data : p)),
              }));
            }
            break;
          }
          case 'update_project': {
            if (resolvedEntityId.startsWith('temp_')) break;
            const payload = resolveData(op.data ?? {}, tempIdMap);
            const { data } = await apiClient.updateProject(resolvedEntityId, payload);
            useTaskStore.setState((s) => ({
              projects: s.projects.map((p) => (p.id === resolvedEntityId ? data : p)),
            }));
            break;
          }
          case 'delete_project': {
            if (!resolvedEntityId.startsWith('temp_')) {
              await apiClient.deleteProject(resolvedEntityId);
            }
            break;
          }

          // ── Goals ─────────────────────────────────────────────────────────
          case 'create_goal': {
            const payload = resolveData(op.data ?? {}, tempIdMap);
            const { data } = await apiClient.createGoal(payload);
            if (op.entityId.startsWith('temp_')) {
              tempIdMap[op.entityId] = data.id;
              useTaskStore.setState((s) => ({
                goals: s.goals.map((g) => (g.id === op.entityId ? data : g)),
              }));
            }
            break;
          }
          case 'update_goal': {
            if (resolvedEntityId.startsWith('temp_')) break;
            const payload = resolveData(op.data ?? {}, tempIdMap);
            const { data } = await apiClient.updateGoal(resolvedEntityId, payload);
            useTaskStore.setState((s) => ({
              goals: s.goals.map((g) => (g.id === resolvedEntityId ? data : g)),
            }));
            break;
          }
          case 'delete_goal': {
            if (!resolvedEntityId.startsWith('temp_')) {
              await apiClient.deleteGoal(resolvedEntityId);
            }
            break;
          }
        }
      } catch (err) {
        console.warn('[offline] Failed to replay op:', op.type, op.entityId, err);
        // Continue with remaining ops rather than aborting
      }
    }
  } finally {
    clearOps();
    setSyncing(false);

    // Refresh all data after sync to ensure consistency
    const ts = useTaskStore.getState();
    await Promise.allSettled([
      ts.fetchProjects(),
      ts.fetchGoals(),
      ts.refreshAllCounts(),
    ]);
  }
}
