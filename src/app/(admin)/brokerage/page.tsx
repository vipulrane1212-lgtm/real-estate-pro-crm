'use client';

import React from 'react';
import { Percent } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

export default function BrokeragePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Brokerage & Commission
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Agent commission ledger, deal cuts, and payout schedules
        </p>
      </div>

      <EmptyState
        title="No data yet"
        description="Commission payout calculators and brokerage ledgers will be unlocked in Phase 2. Database schemas with generated columns are established."
        icon={Percent}
        badge="Coming in next phase"
      />
    </div>
  );
}
