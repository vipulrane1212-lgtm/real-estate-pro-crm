'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Analytics & Performance Reports
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Agent conversions, revenue analysis, lead sources, and visit ratios
        </p>
      </div>

      <EmptyState
        title="No data yet"
        description="Comprehensive visual analytics, agent leaderboards, and revenue charts will be delivered in Phase 2."
        icon={BarChart3}
        badge="Coming in next phase"
      />
    </div>
  );
}
