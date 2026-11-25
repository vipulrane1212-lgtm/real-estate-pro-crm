'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/modules/auth/auth-context';
import { NeuralMonitorView } from '@/modules/neural/neural-monitor-view';

export default function NeuralMonitorPage() {
  const router = useRouter();
  const { role, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && role === 'employee') {
      router.replace('/dashboard');
    }
  }, [role, isLoading, router]);

  if (!isLoading && role === 'employee') {
    return null;
  }

  return <NeuralMonitorView />;
}
