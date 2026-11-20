'use client';

import React, { useState } from 'react';
import { CompanySettingsForm } from '@/modules/settings/company-settings-form';
import { IntegrationsSettings } from '@/modules/settings/integrations-settings';
import { Building2, Share2 } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'company' | 'integrations'>('company');

  return (
    <div className="space-y-6">
      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('company')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition cursor-pointer ${
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
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition cursor-pointer ${
            activeTab === 'integrations'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Share2 className="h-4 w-4" />
          Lead Channel Integrations
        </button>
      </div>

      {activeTab === 'company' ? <CompanySettingsForm /> : <IntegrationsSettings />}
    </div>
  );
}