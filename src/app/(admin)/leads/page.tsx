'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

export default function LeadsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Leads Management
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Inbound client enquiries, requirements, and pipeline stages
        </p>
      </div>

      <EmptyState
        title="No data yet"
        description="Leads UI, CSV import, and pipeline board are scheduled for Phase 2. Database tables and RLS are already configured."
        icon={Users}
        badge="Coming in next phase"
      />
    </div>
  );
}
