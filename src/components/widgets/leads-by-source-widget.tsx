'use client';

import React from 'react';
import Link from 'next/link';
import {
  Layers,
  Share2,
  Globe,
  Phone,
  Search,
  Camera,
  FileText,
  UserCheck,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface LeadSourceItem {
  source: string;
  count: number;
}

interface LeadsBySourceWidgetProps {
  sources: LeadSourceItem[];
  includeDemo?: boolean;
}

const SOURCE_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; barColor: string }
> = {
  meta_ads: { label: 'Meta Ads (FB/IG)', icon: Share2, color: 'text-blue-600 bg-blue-50 border-blue-200', barColor: 'bg-blue-600' },
  facebook: { label: 'Facebook', icon: Share2, color: 'text-blue-600 bg-blue-50 border-blue-200', barColor: 'bg-blue-600' },
  housing: { label: 'Housing.com', icon: Layers, color: 'text-amber-700 bg-amber-50 border-amber-200', barColor: 'bg-amber-600' },
  whatsapp: { label: 'WhatsApp', icon: Phone, color: 'text-emerald-700 bg-emerald-50 border-emerald-200', barColor: 'bg-emerald-600' },
  google: { label: 'Google Search/Ads', icon: Search, color: 'text-indigo-700 bg-indigo-50 border-indigo-200', barColor: 'bg-indigo-600' },
  instagram: { label: 'Instagram', icon: Camera, color: 'text-pink-700 bg-pink-50 border-pink-200', barColor: 'bg-pink-600' },
  website: { label: 'Website Form', icon: Globe, color: 'text-cyan-700 bg-cyan-50 border-cyan-200', barColor: 'bg-cyan-600' },
  manual: { label: 'Manual Entry / Walk-in', icon: UserCheck, color: 'text-slate-700 bg-slate-100 border-slate-200', barColor: 'bg-slate-700' },
  csv: { label: 'CSV Import', icon: FileText, color: 'text-purple-700 bg-purple-50 border-purple-200', barColor: 'bg-purple-600' },
  other: { label: 'Other', icon: Layers, color: 'text-slate-600 bg-slate-50 border-slate-200', barColor: 'bg-slate-500' },
};

export function LeadsBySourceWidget({ sources = [], includeDemo = false }: LeadsBySourceWidgetProps) {
  const totalLeads = sources.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-50 p-1.5 text-blue-600">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Leads by Inflow Source
            </h3>
            <p className="text-[11px] text-slate-500">
              Breakdown across portals, social ads, and direct enquiries {includeDemo ? '(Including Demo)' : ''}
            </p>
          </div>
        </div>

        <Link
          href="/leads"
          className="text-xs font-medium text-amber-700 hover:text-amber-800 inline-flex items-center gap-1"
        >
          View Inbox <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="mt-4">
        {sources.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No leads recorded for this filter view.
          </div>
        ) : (
          <div className="space-y-3">
            {sources.map((item) => {
              const meta = SOURCE_META[item.source.toLowerCase()] || {
                label: item.source.toUpperCase(),
                icon: Layers,
                color: 'text-slate-700 bg-slate-50 border-slate-200',
                barColor: 'bg-slate-600',
              };
              const Icon = meta.icon;
              const pct = totalLeads > 0 ? Math.round((item.count / totalLeads) * 100) : 0;

              return (
                <Link
                  key={item.source}
                  href={`/leads?source=${encodeURIComponent(item.source)}`}
                  className="group block rounded-lg p-2 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center rounded p-1 border ${meta.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-semibold text-slate-800 group-hover:text-amber-700 transition-colors">
                        {meta.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{item.count} leads</span>
                      <span className="text-[11px] text-slate-400 w-9 text-right font-medium">
                        ({pct}%)
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${meta.barColor}`}
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
