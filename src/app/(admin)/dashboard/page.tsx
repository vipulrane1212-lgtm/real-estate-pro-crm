'use client';

import React from 'react';
import { DashboardShell } from '@/modules/dashboard/dashboard-shell';
import { useAuth } from '@/modules/auth/auth-context';

export default function DashboardPage() {
  const { profile } = useAuth();
  return <DashboardShell userName={profile?.full_name || 'Agent'} />;
}
