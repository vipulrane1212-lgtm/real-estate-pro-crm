'use client';

import React from 'react';
import { MapPin } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

export default function SiteVisitsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Site Visits
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Client on-site inspections, feedback logs, and visit scheduling
        </p>
      </div>

      <EmptyState
        title="No data yet"
        description="Site visit scheduling and client feedback collection will be launched in Phase 2. The underlying database model is configured."
        icon={MapPin}
        badge="Coming in next phase"
      />
    </div>
  );
}
