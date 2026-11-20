'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

export default function WhatsAppPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          WhatsApp Business
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Direct client messaging, brochures, and automated template messages
        </p>
      </div>

      <EmptyState
        title="No data yet"
        description="WhatsApp Cloud API integration and broadcast messaging will be delivered in Phase 2."
        icon={MessageSquare}
        badge="Coming in next phase"
      />
    </div>
  );
}
