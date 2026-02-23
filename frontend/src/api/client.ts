import axios from 'axios';
import { notifications } from '@mantine/notifications';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      return Promise.reject(err);
    }

    const data = err.response?.data;
    const status = err.response?.status || 'Network Error';
    const message = data?.error || err.message || 'Неизвестная ошибка';
    const detail = data?.traceback
      ? data.traceback.join('')
      : data?.detail || '';

    notifications.show({
      title: `Ошибка ${status}${data?.type ? ` (${data.type})` : ''}`,
      message: detail ? `${message}\n\n${detail}` : message,
      color: 'red',
      autoClose: detail ? 15000 : 5000,
      styles: detail ? { description: { whiteSpace: 'pre-wrap', fontSize: '11px', maxHeight: '300px', overflow: 'auto' } } : undefined,
    });

    return Promise.reject(err);
  }
);

export default api;

// Auth
export const sendCode = (email: string) => api.post('/auth/send-code', { email });
export const verifyCode = (email: string, code: string) => api.post('/auth/verify', { email, code });
export const getMe = () => api.get('/auth/me');
export const updateMe = (data: Record<string, unknown>) => api.patch('/auth/me', data);

// Tasks
export const getTasks = (params?: Record<string, unknown>) => api.get('/tasks', { params });
export const getTaskCounts = () => api.get('/tasks/counts');
export const createTask = (data: Record<string, unknown>) => api.post('/tasks', data);
export const updateTask = (id: string, data: Record<string, unknown>) => api.patch(`/tasks/${id}`, data);
export const deleteTask = (id: string) => api.delete(`/tasks/${id}`);

// Projects
export const getProjects = () => api.get('/projects');
export const getProjectTaskCounts = () => api.get('/projects/task-counts');
export const createProject = (data: Record<string, unknown>) => api.post('/projects', data);
export const updateProject = (id: string, data: Record<string, unknown>) => api.patch(`/projects/${id}`, data);
export const deleteProject = (id: string) => api.delete(`/projects/${id}`);

// Goals
export const getGoals = () => api.get('/goals');
export const createGoal = (data: Record<string, unknown>) => api.post('/goals', data);
export const updateGoal = (id: string, data: Record<string, unknown>) => api.patch(`/goals/${id}`, data);
export const deleteGoal = (id: string) => api.delete(`/goals/${id}`);

// Stats
export const getProductivity = (days?: number) => api.get('/stats/productivity', { params: { days } });

// AI
export const aiChat = (message: string) => api.post('/ai/chat', { message });
export const aiProductivity = () => api.get('/ai/productivity-analysis');
export const aiRetrospective = () => api.get('/ai/retrospective');
export const aiOnboarding = (message: string) => api.post('/ai/onboarding', { message });
