import { create } from 'zustand';
import {
  getSurveyStatus,
  dismissSurvey,
  saveSurveyDraft,
  generateSurveyStep,
  submitSurvey,
  updateProfileFromSurvey,
  getSurveyResults,
  submitAndPoll,
} from '@/api/client';
import { useAITaskStore } from './aiTaskStore';

export interface SurveyResult {
  id: string;
  week_start: string;
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
  currentStep: number;
  loading: boolean;
  generating: boolean;

  // Step data (editable by user)
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
  goToStep: (step: number) => void;
  nextStep: () => Promise<void>;
  prevStep: () => void;
  submit: () => Promise<void>;
  fetchResults: () => Promise<void>;
}

/** Build a string key representing the dependencies for AI generation of a step */
function depsKey(state: SurveyState, step: number): string {
  if (step === 1) return 'init';
  if (step === 3) return JSON.stringify([state.achievements, state.difficulties]);
  if (step === 4) return JSON.stringify([state.achievements, state.difficulties, state.improvements]);
  return '';
}

export const useSurveyStore = create<SurveyState>((set, get) => ({
  shouldShow: false,
  wizardOpen: false,
  currentStep: 1,
  loading: false,
  generating: false,
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
        // Load draft data if available
        if (data.draft) {
          set({
            shouldShow: true,
            achievements: data.draft.achievements || [],
            difficulties: data.draft.difficulties || [],
            improvements: data.draft.improvements || [],
            weeklyGoals: data.draft.weekly_goals || [],
          });
          return;
        }
      }
      set({ shouldShow: data.should_show });
    } catch {
      set({ shouldShow: false });
    }
  },

  openWizard: () => {
    set({
      wizardOpen: true,
      currentStep: 1,
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

    // Step 2 (difficulties) — never AI-generated
    if (step === 2) return;

    const currentDeps = depsKey(state, step);
    const snapshot = state.genSnapshots[step];

    // Skip if already generated with same dependencies and not forced
    if (!force && snapshot?.done && snapshot.deps === currentDeps) return;

    set({ generating: true });
    try {
      const suggestions = await submitAndPoll<string[]>(
        () => generateSurveyStep({
          step,
          achievements: step >= 3 ? state.achievements : undefined,
          difficulties: step >= 3 ? state.difficulties : undefined,
          improvements: step >= 4 ? state.improvements : undefined,
        }),
      );

      const newSnapshots = {
        ...get().genSnapshots,
        [step]: { deps: currentDeps, done: true },
      };

      // Pre-fill with suggestions
      if (step === 1 && get().achievements.length === 0) {
        set({ achievements: suggestions, genSnapshots: newSnapshots, generating: false });
      } else if (step === 3) {
        set({ improvements: suggestions, genSnapshots: newSnapshots, generating: false });
      } else if (step === 4) {
        set({ weeklyGoals: suggestions, genSnapshots: newSnapshots, generating: false });
      } else {
        set({ genSnapshots: newSnapshots, generating: false });
      }
    } catch {
      set({ generating: false });
    }
  },

  setStepData: (step: number, data: string[]) => {
    if (step === 1) set({ achievements: data });
    else if (step === 2) set({ difficulties: data });
    else if (step === 3) set({ improvements: data });
    else if (step === 4) set({ weeklyGoals: data });
  },

  goToStep: (step: number) => {
    set({ currentStep: step });
  },

  nextStep: async () => {
    const state = get();
    const { currentStep, achievements, difficulties, improvements, weeklyGoals } = state;

    // Save current step data as draft
    const draftData: Record<string, string[]> = {};
    if (currentStep === 1) draftData.achievements = achievements;
    else if (currentStep === 2) draftData.difficulties = difficulties;
    else if (currentStep === 3) draftData.improvements = improvements;
    else if (currentStep === 4) draftData.weekly_goals = weeklyGoals;

    try {
      await saveSurveyDraft(draftData);
    } catch {
      // non-critical
    }

    if (currentStep < 4) {
      const nextStepNum = currentStep + 1;
      set({ currentStep: nextStepNum });

      // Auto-generate for next step if needed (not step 2)
      if (nextStepNum !== 2) {
        // Use setTimeout to let state settle
        setTimeout(() => get().generateForStep(nextStepNum), 0);
      }
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 1) {
      set({ currentStep: currentStep - 1 });
    }
  },

  submit: async () => {
    const state = get();
    const surveyData = {
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
}));
