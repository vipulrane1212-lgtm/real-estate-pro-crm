'use client';

import React from 'react';
import { FileText } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Documents & Agreements
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Client agreements, KYC docs, title deeds, and receipts
        </p>
      </div>

      <EmptyState
        title="No data yet"
        description="Document upload viewer and client dossier storage are scheduled for Phase 2. Private storage bucket 'documents' is provisioned with RLS."
        icon={FileText}
        badge="Coming in next phase"
      />
    </div>
  );
}
