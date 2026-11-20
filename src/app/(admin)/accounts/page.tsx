'use client';

import React from 'react';
import { Receipt } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Accounts & Expenses
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Operational expenses, client invoices, vouchers, and cashflow
        </p>
      </div>

      <EmptyState
        title="No data yet"
        description="Accounting ledger, expense approvals, and financial overview are scheduled for Phase 2. The expenses table is configured with audit trails."
        icon={Receipt}
        badge="Coming in next phase"
      />
    </div>
  );
}
