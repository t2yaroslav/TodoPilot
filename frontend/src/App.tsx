import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoadingOverlay } from '@mantine/core';
import { useAuthStore } from '@/stores/authStore';
import { useSurveyStore } from '@/stores/surveyStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { SurveyPrompt } from '@/components/survey/SurveyPrompt';
import { WeeklySurveyWizard } from '@/components/survey/WeeklySurveyWizard';
import { LoginPage } from '@/pages/LoginPage';
import { TodayPage } from '@/pages/TodayPage';
import { InboxPage } from '@/pages/InboxPage';
import { ProjectPage } from '@/pages/ProjectPage';
import { CompletedPage } from '@/pages/CompletedPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { UpcomingPage } from '@/pages/UpcomingPage';
import { GoalsPage } from '@/pages/GoalsPage';
import { SurveyResultsPage } from '@/pages/SurveyResultsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuthStore();
  if (loading) return <LoadingOverlay visible />;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function SurveyTrigger() {
  const { user } = useAuthStore();
  const { checkStatus } = useSurveyStore();

  useEffect(() => {
    if (user) {
      checkStatus();
    }
  }, [user]);

  return (
    <>
      <SurveyPrompt />
      <WeeklySurveyWizard />
    </>
  );
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
              <SurveyTrigger />
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Navigate to="/today" replace />} />
                  <Route path="/today" element={<TodayPage />} />
                  <Route path="/inbox" element={<InboxPage />} />
                  <Route path="/upcoming" element={<UpcomingPage />} />
                  <Route path="/completed" element={<CompletedPage />} />
                  <Route path="/project/:id" element={<ProjectPage />} />
                  <Route path="/goals" element={<GoalsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/retrospectives" element={<SurveyResultsPage />} />
                </Routes>
              </AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
