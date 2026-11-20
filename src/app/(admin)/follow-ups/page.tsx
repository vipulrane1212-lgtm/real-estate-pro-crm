'use client';

import React from 'react';
import { CalendarClock } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

export default function FollowUpsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Follow-ups & Reminders
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Agent call reminders, scheduled follow-up dates, and outcome tracking
        </p>
      </div>

      <EmptyState
        title="No data yet"
        description="Follow-up task lists and automated reminders will be activated in Phase 2. Database schemas and RLS are active."
        icon={CalendarClock}
        badge="Coming in next phase"
      />
    </div>
  );
}
