import { create } from 'zustand';
import {
  getSurveyStatus,
  dismissSurvey,
  generateSurveyStep,
  submitSurvey,
  getSurveyResults,
} from '@/api/client';

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

  // AI suggestions (generated)
  suggestions: string[];

  // Results
  results: SurveyResult[];

  // Actions
  checkStatus: () => Promise<void>;
  openWizard: () => void;
  closeWizard: () => void;
  dismiss: () => Promise<void>;
  generateStep: (step: number) => Promise<void>;
  setStepData: (step: number, data: string[]) => void;
  nextStep: () => void;
  prevStep: () => void;
  submit: () => Promise<void>;
  fetchResults: () => Promise<void>;
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
  suggestions: [],
  results: [],

  checkStatus: async () => {
    try {
      const { data } = await getSurveyStatus();
      set({ shouldShow: data.should_show });
    } catch {
      set({ shouldShow: false });
    }
  },

  openWizard: () => {
    set({
      wizardOpen: true,
      currentStep: 1,
      achievements: [],
      difficulties: [],
      improvements: [],
      weeklyGoals: [],
      suggestions: [],
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

  generateStep: async (step: number) => {
    const state = get();
    set({ generating: true, suggestions: [] });
    try {
      const { data } = await generateSurveyStep({
        step,
        achievements: step >= 3 ? state.achievements : undefined,
        difficulties: step >= 3 ? state.difficulties : undefined,
        improvements: step >= 4 ? state.improvements : undefined,
      });
      set({ suggestions: data.suggestions, generating: false });

      // Pre-fill step data with suggestions if empty
      if (step === 1 && state.achievements.length === 0) {
        set({ achievements: data.suggestions });
      } else if (step === 2 && state.difficulties.length === 0) {
        set({ difficulties: data.suggestions });
      } else if (step === 3 && state.improvements.length === 0) {
        set({ improvements: data.suggestions });
      } else if (step === 4 && state.weeklyGoals.length === 0) {
        set({ weeklyGoals: data.suggestions });
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

  nextStep: () => {
    const { currentStep } = get();
    if (currentStep < 4) {
      set({ currentStep: currentStep + 1, suggestions: [] });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 1) {
      set({ currentStep: currentStep - 1, suggestions: [] });
    }
  },

  submit: async () => {
    const state = get();
    set({ loading: true });
    try {
      await submitSurvey({
        achievements: state.achievements,
        difficulties: state.difficulties,
        improvements: state.improvements,
        weekly_goals: state.weeklyGoals,
      });
      set({ loading: false, wizardOpen: false, shouldShow: false });
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
