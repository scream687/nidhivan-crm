'use client';
import { useAuthStore } from '@/stores/authStore';
import { ManagerView } from './manager-view';
import { AgentView } from './agent-view';

export default function DashboardPage() {
  const { user } = useAuthStore();

  if (!user) return null;

  if (user.role === 'ADMIN' || user.role === 'MANAGER') {
    return <ManagerView />;
  }

  return <AgentView />;
}
