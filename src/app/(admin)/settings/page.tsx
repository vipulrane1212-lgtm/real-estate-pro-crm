'use client';

import React, { useState } from 'react';
import { CompanySettingsForm } from '@/modules/settings/company-settings-form';
import { IntegrationsSettings } from '@/modules/settings/integrations-settings';
import { DemoDataSettings } from '@/modules/settings/demo-data-settings';
import { Building2, Share2, Database } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'company' | 'integrations' | 'demo'>('company');

  return (
    <div className="space-y-6">
      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('company')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-2 rounded-lg px-3.5 sm:px-4 py-2 text-xs font-semibold transition cursor-pointer ${
            activeTab === 'company'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Building2 className="h-4 w-4" />
          Company Profile
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-2 rounded-lg px-3.5 sm:px-4 py-2 text-xs font-semibold transition cursor-pointer ${
            activeTab === 'integrations'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Share2 className="h-4 w-4" />
          Lead Channel Integrations
        </button>
        <button
          onClick={() => setActiveTab('demo')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-2 rounded-lg px-3.5 sm:px-4 py-2 text-xs font-semibold transition cursor-pointer ${
            activeTab === 'demo'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Database className="h-4 w-4" />
          Showcase & Production Data
        </button>
      </div>

      {activeTab === 'company' && <CompanySettingsForm />}
      {activeTab === 'integrations' && <IntegrationsSettings />}
      {activeTab === 'demo' && <DemoDataSettings />}
    </div>
  );
}