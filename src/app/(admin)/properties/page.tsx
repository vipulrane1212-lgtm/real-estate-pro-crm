'use client';

import React from 'react';
import { Building2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

export default function PropertiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Property Inventory
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Residential and commercial listings, pricing, and availability
        </p>
      </div>

      <EmptyState
        title="No data yet"
        description="Property catalogue, photo gallery, and inventory filtering are coming in Phase 2. Database tables and storage buckets are ready."
        icon={Building2}
        badge="Coming in next phase"
      />
    </div>
  );
}
