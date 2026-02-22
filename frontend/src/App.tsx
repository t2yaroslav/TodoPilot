import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoadingOverlay } from '@mantine/core';
import { useAuthStore } from '@/stores/authStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { TodayPage } from '@/pages/TodayPage';
import { InboxPage } from '@/pages/InboxPage';
import { ProjectPage } from '@/pages/ProjectPage';
import { CompletedPage } from '@/pages/CompletedPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { UpcomingPage } from '@/pages/UpcomingPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuthStore();
  if (loading) return <LoadingOverlay visible />;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { token, fetchUser } = useAuthStore();

  useEffect(() => {
    if (token) fetchUser();
    else useAuthStore.setState({ loading: false });
  }, [token]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Navigate to="/today" replace />} />
                  <Route path="/today" element={<TodayPage />} />
                  <Route path="/inbox" element={<InboxPage />} />
                  <Route path="/upcoming" element={<UpcomingPage />} />
                  <Route path="/completed" element={<CompletedPage />} />
                  <Route path="/project/:id" element={<ProjectPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
