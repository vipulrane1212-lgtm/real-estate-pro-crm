'use client';

import React, { useState, useEffect } from 'react';
import { Database, Trash2, RotateCcw, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useDemoData } from '@/modules/demo/demo-data-context';

export function DemoDataSettings() {
  const { showDemoData, setShowDemoData, refreshDemoStatus } = useDemoData();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isDemoLoaded, setIsDemoLoaded] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [isReseeding, setIsReseeding] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/demo/manage');
      if (res.ok) {
        const data = await res.json();
        setCounts(data.counts || {});
        setIsDemoLoaded(Boolean(data.isDemoLoaded));
      }
    } catch (e) {
      console.error('Failed to load demo status:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/demo/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      if (res.ok) {
        setIsResetModalOpen(false);
        setShowDemoData(false);
        setSuccessMessage('All demo records successfully purged! CRM is now operating on a 100% clean production database.');
        await fetchStatus();
        await refreshDemoStatus();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to purge demo data');
      }
    } catch (e) {
      console.error('Purge error:', e);
    } finally {
      setIsResetting(false);
    }
  };

  const handleReseed = async () => {
    setIsReseeding(true);
    try {
      const res = await fetch('/api/demo/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reseed' }),
      });
      if (res.ok) {
        setShowDemoData(true);
        setSuccessMessage('Full Lucknow real-estate showcase dataset freshly re-seeded across all 14 CRM modules!');
        await fetchStatus();
        await refreshDemoStatus();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to re-seed demo data');
      }
    } catch (e) {
      console.error('Reseed error:', e);
    } finally {
      setIsReseeding(false);
    }
  };

  const MODULE_METRICS = [
    { label: 'Leads & Enquiries', count: counts.leads || 0, color: 'text-amber-700 bg-amber-50 border-amber-200' },
    { label: 'Properties & Inventory', count: counts.properties || 0, color: 'text-blue-700 bg-blue-50 border-blue-200' },
    { label: 'Follow-up Reminders', count: counts.follow_ups || 0, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    { label: 'Calls Logged', count: counts.calls || 0, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
    { label: 'Site Visits', count: counts.site_visits || 0, color: 'text-purple-700 bg-purple-50 border-purple-200' },
    { label: 'Closed Deals', count: counts.deals || 0, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    { label: 'Brokerage Records', count: counts.brokerage || 0, color: 'text-teal-700 bg-teal-50 border-teal-200' },
    { label: 'Rentals & Leases', count: counts.rentals || 0, color: 'text-amber-700 bg-amber-50 border-amber-200' },
    { label: 'Office Expenses', count: counts.expenses || 0, color: 'text-rose-700 bg-rose-50 border-rose-200' },
    { label: 'Attendance Punches', count: counts.attendance || 0, color: 'text-cyan-700 bg-cyan-50 border-cyan-200' },
    { label: 'Documents & KYC', count: counts.documents || 0, color: 'text-slate-700 bg-slate-50 border-slate-200' },
    { label: 'WhatsApp Chats', count: counts.whatsapp_messages || 0, color: 'text-green-700 bg-green-50 border-green-200' },
    { label: 'Client Projects', count: counts.project_submissions || 0, color: 'text-violet-700 bg-violet-50 border-violet-200' },
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 border border-amber-200">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Client Showcase & Production Readiness
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Control simulated Lucknow client data for presentations or prepare the database for live production launch
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStatus}
                disabled={isLoading}
                className="h-8 gap-1.5 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Success banner if triggered */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Global Toggle Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Master Demo Mode Switch</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-xl">
              When <strong>ON</strong>, all 14 CRM modules display rich Lucknow real-estate data for client presentations. When <strong>OFF</strong>, all demo records are hidden and your client can test adding real properties, leads, and expenses.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showDemoData}
              onChange={(e) => setShowDemoData(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            <span className="ml-3 text-xs font-bold text-slate-900">
              {showDemoData ? 'DEMO ON' : 'DEMO OFF'}
            </span>
          </label>
        </div>
      </div>

      {/* Seeded Records Overview */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Seeded Demo Records in Database</h3>
        <p className="text-xs text-slate-500 mb-4">
          Exact breakdown of records marked with <code>is_demo = true</code> currently stored in the PostgreSQL database.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {MODULE_METRICS.map((m) => (
            <div key={m.label} className={`rounded-lg border p-3 ${m.color}`}>
              <div className="text-xs font-medium opacity-80">{m.label}</div>
              <div className="text-xl font-bold mt-1">{m.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Production Actions: Clean Slate Purge & Re-seed */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Production Launch Actions</h3>
          <p className="mt-1 text-xs text-slate-500">
            Once your client approves the system and is ready to start using Diksha CRM live, you can permanently wipe all demonstration records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsResetModalOpen(true)}
            disabled={isResetting || !isDemoLoaded}
            className="border-red-200 bg-red-50/60 text-red-700 hover:bg-red-100/80 gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            Permanently Wipe All Demo Data (Go Live)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleReseed}
            disabled={isReseeding}
            className="border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100/70 gap-1.5"
          >
            <RotateCcw className={`h-4 w-4 ${isReseeding ? 'animate-spin' : ''}`} />
            Re-seed Full Showcase Dataset
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="rounded-full bg-red-100 p-2">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Wipe All Demo Data Permanently?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This action will permanently delete all records across properties, leads, calls, visits, deals, brokerage, rentals, attendance, expenses, and documents where <code>is_demo = true</code>.
            </p>
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Zero Risk to Real Data:</strong> Any real employees, real client inquiries, and real properties you or your client have entered are preserved and will never be touched.
              </span>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsResetModalOpen(false)}
                disabled={isResetting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleReset}
                isLoading={isResetting}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Confirm Wipe & Go Live
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
