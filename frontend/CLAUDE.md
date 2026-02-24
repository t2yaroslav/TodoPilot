# Frontend — React + Vite + Mantine

## Stack
React 18, Vite 6, TypeScript 5, Mantine UI v7, Zustand 5, React Router v6, Recharts, Axios, dayjs, Tabler Icons

## Entry Point
`src/main.tsx` — MantineProvider, DatesProvider (locale: ru), Notifications. `src/App.tsx` — Router with protected routes + AppLayout wrapper.

## API Client (`src/api/client.ts`)
Axios instance with JWT Bearer interceptor. Exports all API functions: `sendCode`, `verifyCode`, `getMe`, `updateMe`, task/project/goal CRUD, stats, AI endpoints. Error handler formats dev errors with DB info.

## Stores (`src/stores/`)
- `authStore.ts` — user, token, loading, fetchUser(), updateUser(), logout()
- `taskStore.ts` — tasks, projects, goals, activeProject/Goal, fetch/create/update/delete operations, pagination, color utilities

## Pages (`src/pages/`)
LoginPage, TodayPage, InboxPage, UpcomingPage, CompletedPage, ProjectPage, SettingsPage

## Components (`src/components/`)
- `layout/AppLayout.tsx` — Sidebar navigation, AppShell
- `tasks/` — TaskList, TaskItem, TaskEditModal, QuickAddModal, CompletedTaskList, PriorityTaskList, DatePickerMenu
- `ai/AIModal.tsx` — AI chat modal
- `auth/LoginForm.tsx` — Email code auth form
- `stats/ProductivityChart.tsx` — Recharts line graph

## Utilities (`src/lib/`)
- `dates.ts` — date formatting, relative date labels
- `theme.ts` — Mantine theme config

## Build
- Dev: `npm run dev` (Vite dev server)
- Build: `npm run build` (tsc + vite build → dist/)
- Vite config: React plugin, `@` path alias to `src/`, dev proxy `/api` → backend:8000
