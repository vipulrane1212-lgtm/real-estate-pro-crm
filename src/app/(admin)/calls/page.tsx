'use client';

import React from 'react';
import { PhoneCall } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

export default function CallsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Call Logs & Recordings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Inbound and outbound telephony logs, call durations, and audio recordings
        </p>
      </div>

      <EmptyState
        title="No data yet"
        description="Call logging UI, dialer integration, and playback will be introduced in Phase 2. The calls table and call-recordings storage bucket are ready."
        icon={PhoneCall}
        badge="Coming in next phase"
      />
    </div>
  );
}
