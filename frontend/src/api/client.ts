import axios from 'axios';
import { notifications } from '@mantine/notifications';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function buildDevDetail(data: Record<string, unknown>): string {
  const parts: string[] = [];

  if (data.method && data.url) {
    parts.push(`${data.method} ${data.url}`);
  }

  // DB-specific info
  if (data.db_error) {
    parts.push(`\nDB: ${data.db_error_type || 'DatabaseError'}\n${data.db_error}`);
  }
  if (data.sql) {
    parts.push(`\nSQL: ${data.sql}`);
  }
  if (data.sql_params) {
    parts.push(`Params: ${data.sql_params}`);
  }

  // Validation errors
  if (data.validation_errors && Array.isArray(data.validation_errors)) {
    const errs = data.validation_errors.map((e: Record<string, unknown>) =>
      `  ${(e.loc as string[])?.join(' → ') || '?'}: ${e.msg}`
    ).join('\n');
    parts.push(`\nВалидация:\n${errs}`);
    if (data.body) parts.push(`Body: ${data.body}`);
  }

  // Traceback
  if (data.traceback && Array.isArray(data.traceback)) {
    parts.push(`\n${data.traceback.join('')}`);
  }

  return parts.join('\n');
}

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
    const message = data?.error || data?.detail || err.message || 'Неизвестная ошибка';

    // Build detailed dev info from all available fields
    const hasDevInfo = data?.traceback || data?.db_error || data?.validation_errors;
    const detail = hasDevInfo ? buildDevDetail(data) : (data?.detail || '');

    notifications.show({
      title: `Ошибка ${status}${data?.type ? ` (${data.type})` : ''}`,
      message: detail ? `${message}\n\n${detail}` : message,
      color: 'red',
      autoClose: detail ? false : 5000,
      styles: detail ? { description: { whiteSpace: 'pre-wrap', fontSize: '11px', maxHeight: '400px', overflow: 'auto', fontFamily: 'monospace' } } : undefined,
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
export const getGoalStats = () => api.get('/goals/stats');
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

// Weekly Survey
export const getSurveyStatus = () => api.get('/survey/status');
export const dismissSurvey = () => api.post('/survey/dismiss');
export const generateSurveyStep = (data: {
  step: number;
  achievements?: string[];
  difficulties?: string[];
  improvements?: string[];
}) => api.post('/survey/generate', data);
export const submitSurvey = (data: {
  achievements: string[];
  difficulties: string[];
  improvements: string[];
  weekly_goals: string[];
}) => api.post('/survey/submit', data);
export const getSurveyResults = () => api.get('/survey/results');
