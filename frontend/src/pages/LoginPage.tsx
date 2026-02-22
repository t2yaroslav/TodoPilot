import { Center } from '@mantine/core';
import { Navigate } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuthStore } from '@/stores/authStore';

export function LoginPage() {
  const { token } = useAuthStore();
  if (token) return <Navigate to="/" replace />;

  return (
    <Center h="100vh" bg="var(--mantine-color-gray-0)">
      <LoginForm />
    </Center>
  );
}
