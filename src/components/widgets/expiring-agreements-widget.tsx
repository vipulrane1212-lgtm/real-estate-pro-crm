'use client';

import React, { useEffect, useState } from 'react';
import { FileText, AlertTriangle, Clock, ArrowRight, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

interface ExpiryItem {
  id: string;
  source: 'document' | 'deal' | 'rental';
  title: string;
  document_type?: string;
  client_name: string;
  property_title: string;
  expiry_date: string;
  days_remaining: number;
  is_expired: boolean;
}

export function ExpiringAgreementsWidget() {
  const [items, setItems] = useState<ExpiryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/alerts/expiries');
        if (res.ok) {
          const json = await res.json();
          setItems(json.expiries || []);
        }
      } catch (err) {
        console.error('Failed to load expiring agreements:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-amber-50 p-1.5 text-amber-600">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Agreements & Renewals Expiring Soon
            </h3>
            <p className="text-[11px] text-slate-500">Expiring in next 30 days (nearest first)</p>
          </div>
        </div>

        <Link
          href="/documents"
          className="text-xs font-medium text-amber-700 hover:text-amber-800 inline-flex items-center gap-1"
        >
          View All <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="mt-3">
        {isLoading ? (
          <div className="py-6 text-center text-xs text-slate-400">Checking expiries...</div>
        ) : items.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            No data yet — No agreements or documents expiring in the next 30 days.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.slice(0, 5).map((item) => {
              const isUrgent = item.days_remaining <= 3;
              return (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-medium text-slate-800 truncate">
                      <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      Client: <span className="text-slate-700 font-medium">{item.client_name}</span> &bull; {item.property_title}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                        item.is_expired
                          ? 'bg-red-100 text-red-800'
                          : isUrgent
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.is_expired
                        ? 'Expired'
                        : item.days_remaining === 0
                        ? 'Expires Today'
                        : `${item.days_remaining}d left`}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">{item.expiry_date}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
