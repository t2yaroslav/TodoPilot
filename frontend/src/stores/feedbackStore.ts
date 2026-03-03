import { create } from 'zustand';
import { createFeedback, getMyFeedback, getAdminFeedback, updateAdminFeedback } from '@/api/client';

export interface FeedbackItem {
  id: string;
  user_id: string;
  category: string;
  message: string;
  screenshot_path: string | null;
  status: string;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
  // admin-only fields
  user_email?: string;
  user_name?: string | null;
}

interface FeedbackState {
  // User feedback modal
  modalOpen: boolean;
  submitting: boolean;
  myFeedback: FeedbackItem[];
  openModal: () => void;
  closeModal: () => void;
  submit: (category: string, message: string, screenshot: File | null) => Promise<void>;
  fetchMyFeedback: () => Promise<void>;

  // Admin
  adminFeedback: FeedbackItem[];
  adminLoading: boolean;
  fetchAdminFeedback: (status?: string) => Promise<void>;
  updateFeedback: (id: string, data: { status?: string; admin_response?: string }) => Promise<void>;
}

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  modalOpen: false,
  submitting: false,
  myFeedback: [],

  openModal: () => set({ modalOpen: true }),
  closeModal: () => set({ modalOpen: false }),

  submit: async (category, message, screenshot) => {
    set({ submitting: true });
    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('message', message);
      if (screenshot) formData.append('screenshot', screenshot);
      await createFeedback(formData);
      set({ modalOpen: false });
    } finally {
      set({ submitting: false });
    }
  },

  fetchMyFeedback: async () => {
    const { data } = await getMyFeedback();
    set({ myFeedback: data });
  },

  // Admin
  adminFeedback: [],
  adminLoading: false,

  fetchAdminFeedback: async (status?: string) => {
    set({ adminLoading: true });
    try {
      const { data } = await getAdminFeedback(status);
      set({ adminFeedback: data });
    } finally {
      set({ adminLoading: false });
    }
  },

  updateFeedback: async (id, updates) => {
    const { data } = await updateAdminFeedback(id, updates);
    set({
      adminFeedback: get().adminFeedback.map((f) => (f.id === id ? data : f)),
    });
  },
}));
