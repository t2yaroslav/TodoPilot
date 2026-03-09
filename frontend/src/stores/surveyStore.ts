import { create } from 'zustand';
import {
  getSurveyStatus,
  dismissSurvey,
  saveSurveyDraft,
  generateSurveyStep,
  submitSurvey,
  updateProfileFromSurvey,
  getSurveyResults,
  updateSurveyResult,
  submitAndPoll,
  GoalOutcome,
} from '@/api/client';
import { useAITaskStore } from './aiTaskStore';

export type { GoalOutcome };

export interface SurveyResult {
  id: string;
  week_start: string;
  goal_outcomes: GoalOutcome[] | null;
  achievements: string[] | null;
  difficulties: string[] | null;
  improvements: string[] | null;
  weekly_goals: string[] | null;
  dismissed: boolean;
  completed: boolean;
  created_at: string;
}

/**
 * Tracks what data looked like when AI last generated for a step.
 * Used to decide if re-generation is needed when navigating forward.
 */
interface GenerationSnapshot {
  /** Data snapshot of dependencies when AI generated */
  deps: string;
  /** Whether generation was performed */
  done: boolean;
}

interface SurveyState {
  // Wizard state
  shouldShow: boolean;
  wizardOpen: boolean;
  currentStep: number; // 1-5: 1=goal outcomes, 2=achievements, 3=difficulties, 4=improvements, 5=weekly goals
  loading: boolean;
  generating: boolean;

  // Step 1 data: goal outcomes
  previousWeekGoals: string[]; // goals from previous week (read-only list)
  goalOutcomes: GoalOutcome[]; // user's marks on previous goals

  // Step 2-5 data (editable by user)
  achievements: string[];
  difficulties: string[];
  improvements: string[];
  weeklyGoals: string[];

  // Generation tracking per step
  genSnapshots: Record<number, GenerationSnapshot>;

  // Results
  results: SurveyResult[];

  // Actions
  checkStatus: () => Promise<void>;
  openWizard: () => void;
  closeWizard: () => void;
  dismiss: () => Promise<void>;
  generateForStep: (step: number, force?: boolean) => Promise<void>;
  setStepData: (step: number, data: string[]) => void;
  setGoalOutcome: (index: number, completed: boolean) => void;
  goToStep: (step: number) => void;
  nextStep: () => Promise<void>;
  prevStep: () => void;
  submit: () => Promise<void>;
  fetchResults: () => Promise<void>;
  updateResult: (id: string, data: {
    goal_outcomes?: GoalOutcome[];
    achievements?: string[];
    difficulties?: string[];
    improvements?: string[];
    weekly_goals?: string[];
  }) => Promise<void>;
}

/** Build a string key representing the dependencies for AI generation of a step */
function depsKey(state: SurveyState, step: number): string {
  if (step === 2) return JSON.stringify([state.goalOutcomes]);
  if (step === 4) return JSON.stringify([state.goalOutcomes, state.achievements, state.difficulties]);
  if (step === 5) return JSON.stringify([state.goalOutcomes, state.achievements, state.difficulties, state.improvements]);
  return '';
}

export const useSurveyStore = create<SurveyState>((set, get) => ({
  shouldShow: false,
  wizardOpen: false,
  currentStep: 1,
  loading: false,
  generating: false,
  previousWeekGoals: [],
  goalOutcomes: [],
  achievements: [],
  difficulties: [],
  improvements: [],
  weeklyGoals: [],
  genSnapshots: {},
  results: [],

  checkStatus: async () => {
    try {
      const { data } = await getSurveyStatus();
      if (data.should_show) {
        const prevGoals: string[] = data.previous_week_goals || [];
        // Load draft data if available
        if (data.draft) {
          const draftOutcomes: GoalOutcome[] = data.draft.goal_outcomes || [];
          // If draft has no outcomes but there are previous goals, initialize them
          const outcomes = draftOutcomes.length > 0
            ? draftOutcomes
            : prevGoals.map((g: string) => ({ goal: g, completed: false }));
          set({
            shouldShow: true,
            previousWeekGoals: prevGoals,
            goalOutcomes: outcomes,
            achievements: data.draft.achievements || [],
            difficulties: data.draft.difficulties || [],
            improvements: data.draft.improvements || [],
            weeklyGoals: data.draft.weekly_goals || [],
          });
          return;
        }
        set({
          shouldShow: true,
          previousWeekGoals: prevGoals,
          goalOutcomes: prevGoals.map((g: string) => ({ goal: g, completed: false })),
        });
        return;
      }
      set({ shouldShow: data.should_show });
    } catch {
      set({ shouldShow: false });
    }
  },

  openWizard: () => {
    const state = get();
    // If there are previous goals, start at step 1 (goal outcomes)
    // Otherwise skip to step 2 (achievements)
    const startStep = state.previousWeekGoals.length > 0 ? 1 : 2;
    set({
      wizardOpen: true,
      currentStep: startStep,
      genSnapshots: {},
    });
  },

  closeWizard: () => {
    set({ wizardOpen: false });
  },

  dismiss: async () => {
    try {
      await dismissSurvey();
      set({ shouldShow: false, wizardOpen: false });
    } catch {
      // handled by interceptor
    }
  },

  generateForStep: async (step: number, force = false) => {
    const state = get();

    // Step 1 (goal outcomes) and Step 3 (difficulties) - never AI-generated
    if (step === 1 || step === 3) return;

    const currentDeps = depsKey(state, step);
    const snapshot = state.genSnapshots[step];

    // Skip if already generated with same dependencies and not forced
    if (!force && snapshot?.done && snapshot.deps === currentDeps) return;

    set({ generating: true });
    try {
      const suggestions = await submitAndPoll<string[]>(
        () => generateSurveyStep({
          step,
          goal_outcomes: state.goalOutcomes.length > 0 ? state.goalOutcomes : undefined,
          achievements: step >= 4 ? state.achievements : undefined,
          difficulties: step >= 4 ? state.difficulties : undefined,
          improvements: step >= 5 ? state.improvements : undefined,
        }),
      );

      const newSnapshots = {
        ...get().genSnapshots,
        [step]: { deps: currentDeps, done: true },
      };

      // Pre-fill with suggestions
      if (step === 2 && get().achievements.length === 0) {
        set({ achievements: suggestions, genSnapshots: newSnapshots, generating: false });
      } else if (step === 4) {
        set({ improvements: suggestions, genSnapshots: newSnapshots, generating: false });
      } else if (step === 5) {
        set({ weeklyGoals: suggestions, genSnapshots: newSnapshots, generating: false });
      } else {
        set({ genSnapshots: newSnapshots, generating: false });
      }
    } catch {
      set({ generating: false });
    }
  },

  setStepData: (step: number, data: string[]) => {
    if (step === 2) set({ achievements: data });
    else if (step === 3) set({ difficulties: data });
    else if (step === 4) set({ improvements: data });
    else if (step === 5) set({ weeklyGoals: data });
  },

  setGoalOutcome: (index: number, completed: boolean) => {
    const outcomes = [...get().goalOutcomes];
    if (index >= 0 && index < outcomes.length) {
      outcomes[index] = { ...outcomes[index], completed };
      set({ goalOutcomes: outcomes });
    }
  },

  goToStep: (step: number) => {
    set({ currentStep: step });
  },

  nextStep: async () => {
    const state = get();
    const { currentStep, goalOutcomes, achievements, difficulties, improvements, weeklyGoals } = state;

    // Save current step data as draft
    const draftData: Record<string, unknown> = {};
    if (currentStep === 1) draftData.goal_outcomes = goalOutcomes;
    else if (currentStep === 2) draftData.achievements = achievements;
    else if (currentStep === 3) draftData.difficulties = difficulties;
    else if (currentStep === 4) draftData.improvements = improvements;
    else if (currentStep === 5) draftData.weekly_goals = weeklyGoals;

    try {
      await saveSurveyDraft(draftData as Record<string, string[]>);
    } catch {
      // non-critical
    }

    if (currentStep < 5) {
      const nextStepNum = currentStep + 1;
      set({ currentStep: nextStepNum });

      // Auto-generate for next step if needed (not step 1 or step 3)
      if (nextStepNum !== 1 && nextStepNum !== 3) {
        // Use setTimeout to let state settle
        setTimeout(() => get().generateForStep(nextStepNum), 0);
      }
    }
  },

  prevStep: () => {
    const { currentStep, previousWeekGoals } = get();
    const minStep = previousWeekGoals.length > 0 ? 1 : 2;
    if (currentStep > minStep) {
      set({ currentStep: currentStep - 1 });
    }
  },

  submit: async () => {
    const state = get();
    const surveyData = {
      goal_outcomes: state.goalOutcomes,
      achievements: state.achievements,
      difficulties: state.difficulties,
      improvements: state.improvements,
      weekly_goals: state.weeklyGoals,
    };

    set({ loading: true });
    try {
      await submitSurvey(surveyData);
      // Close wizard immediately
      set({ loading: false, wizardOpen: false, shouldShow: false });

      // Run psychoportrait update in the background (polls until done)
      useAITaskStore.getState().runTask(
        'survey-profile',
        'Обновление психопортрета',
        () => submitAndPoll(() => updateProfileFromSurvey(surveyData)),
      );
    } catch {
      set({ loading: false });
    }
  },

  fetchResults: async () => {
    set({ loading: true });
    try {
      const { data } = await getSurveyResults();
      set({ results: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  updateResult: async (id: string, data: {
    goal_outcomes?: GoalOutcome[];
    achievements?: string[];
    difficulties?: string[];
    improvements?: string[];
    weekly_goals?: string[];
  }) => {
    try {
      const { data: updated } = await updateSurveyResult(id, data);
      const results = get().results.map((r) => (r.id === id ? updated : r));
      set({ results });
    } catch {
      // handled by interceptor
    }
  },
}));
