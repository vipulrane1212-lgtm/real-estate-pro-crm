'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  RefreshCw,
  TrendingUp,
  Award,
  PhoneCall,
  MapPin,
  CalendarCheck,
  Building2,
  Users,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

interface AnalyticsData {
  leadsByStatus: Array<{ status: string; count: number }>;
  leadsByType: Array<{ type: string; count: number }>;
  leadsBySource: Array<{ source: string; count: number }>;
  followUps: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
  };
  siteVisits: {
    total: number;
    completed: number;
    scheduled: number;
    cancelled: number;
    noShow: number;
  };
  deals: {
    totalDeals: number;
    closedDeals: number;
    totalDealValue: number;
    totalBrokerage: number;
  };
  agentPerformance: Array<{
    id: string;
    name: string;
    designation: string;
    leadsAssigned: number;
    callsMade: number;
    visitsCompleted: number;
    dealsClosed: number;
    totalBrokerage: number;
  }>;
}

function formatCurrencyINR(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} Lakh`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-500',
  contacted: 'bg-indigo-500',
  follow_up: 'bg-amber-500',
  site_visit: 'bg-purple-500',
  negotiation: 'bg-pink-500',
  closed_won: 'bg-emerald-500',
  closed_lost: 'bg-rose-500',
};

export function ReportsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const fetchAnalytics = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    try {
      const res = await fetch('/api/reports/analytics');
      if (res.ok) {
        const json = await res.json();
        setData(json.analytics);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const handleToggle = () => fetchAnalytics();
    window.addEventListener('diksha_demo_toggle', handleToggle);
    return () => window.removeEventListener('diksha_demo_toggle', handleToggle);
  }, []);

  const handleExport = async (type: 'all' | 'leads' | 'deals' | 'visits' | 'agents') => {
    setIsExporting(type);
    try {
      const res = await fetch(`/api/reports/export?type=${type}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      a.download = `Diksha_CRM_${type.toUpperCase()}_Report_${timestamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to generate Excel report. Please try again.');
    } finally {
      setIsExporting(null);
      setExportOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin text-amber-500" />
          <p className="text-sm font-medium text-slate-500">Compiling real-time CRM analytics...</p>
        </div>
      </div>
    );
  }

  const totalLeads = data?.leadsByStatus.reduce((acc, curr) => acc + curr.count, 0) || 0;
  const visitCompletionRate =
    data && data.siteVisits.total > 0
      ? Math.round((data.siteVisits.completed / data.siteVisits.total) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Analytics & Business Intelligence
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real performance telemetry: sales pipeline, site visit conversions, and brokerage revenue.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnalytics(true)}
            disabled={isRefreshing}
            className="border-slate-200"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {/* Export Dropdown */}
          <div className="relative">
            <Button
              size="sm"
              onClick={() => setExportOpen(!exportOpen)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-xs"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export to Excel (.xlsx)
              <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
            </Button>

            {exportOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg z-30">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Select Dataset
                </div>
                <button
                  onClick={() => handleExport('all')}
                  disabled={!!isExporting}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 flex items-center justify-between"
                >
                  <span>Complete CRM Workbook</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">All Sheets</span>
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  onClick={() => handleExport('leads')}
                  disabled={!!isExporting}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  Leads & Inquiries
                </button>
                <button
                  onClick={() => handleExport('deals')}
                  disabled={!!isExporting}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  Deals & Revenue
                </button>
                <button
                  onClick={() => handleExport('visits')}
                  disabled={!!isExporting}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  Site Visits Log
                </button>
                <button
                  onClick={() => handleExport('agents')}
                  disabled={!!isExporting}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Award className="h-3.5 w-3.5 text-slate-400" />
                  Agent Performance
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Deal Revenue */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Deal Volume
            </span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrencyINR(data?.deals.totalDealValue || 0)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {data?.deals.closedDeals || 0} deals closed successfully
          </p>
        </div>

        {/* Brokerage Earned */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Brokerage Earned
            </span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrencyINR(data?.deals.totalBrokerage || 0)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Across verified property transactions</p>
        </div>

        {/* Site Visit Ratio */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Visit Success Rate
            </span>
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
              <MapPin className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {visitCompletionRate}%
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {data?.siteVisits.completed || 0} of {data?.siteVisits.total || 0} visits completed
          </p>
        </div>

        {/* Pipeline Health */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Inquiries
            </span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {totalLeads}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {data?.followUps.pending || 0} follow-ups awaiting completion
          </p>
        </div>
      </div>

      {/* Grid: Lead Funnel & Lead Source Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Leads By Status Funnel */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Lead Status Distribution
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">Stage-by-stage progression of potential buyers & tenants</p>

          <div className="mt-5 space-y-3">
            {data?.leadsByStatus && data.leadsByStatus.length > 0 ? (
              data.leadsByStatus.map((item) => {
                const pct = totalLeads > 0 ? Math.round((item.count / totalLeads) * 100) : 0;
                const barColor = statusColors[item.status.toLowerCase()] || 'bg-slate-500';

                return (
                  <div key={item.status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="capitalize text-slate-700">
                        {item.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-500">
                        {item.count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState
                title="No data yet"
                description="Lead pipeline statistics will populate as leads are created and move through stages."
              />
            )}
          </div>
        </div>

        {/* Operational Ratios: Follow-ups & Site Visits */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Operational Performance
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">Task turnaround and property inspection metrics</p>

            <div className="mt-5 grid grid-cols-2 gap-4">
              {/* Follow-up card */}
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                  <CalendarCheck className="h-4 w-4 text-amber-500" />
                  Follow-ups
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Scheduled:</span>
                    <span className="font-semibold text-slate-900">{data?.followUps.total || 0}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Completed:</span>
                    <span className="font-semibold">{data?.followUps.completed || 0}</span>
                  </div>
                  <div className="flex justify-between text-amber-600">
                    <span>Pending:</span>
                    <span className="font-semibold">{data?.followUps.pending || 0}</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>Overdue:</span>
                    <span className="font-semibold">{data?.followUps.overdue || 0}</span>
                  </div>
                </div>
              </div>

              {/* Site visit card */}
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                  <MapPin className="h-4 w-4 text-purple-500" />
                  Site Visits
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Planned:</span>
                    <span className="font-semibold text-slate-900">{data?.siteVisits.total || 0}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Completed:</span>
                    <span className="font-semibold">{data?.siteVisits.completed || 0}</span>
                  </div>
                  <div className="flex justify-between text-blue-600">
                    <span>Scheduled:</span>
                    <span className="font-semibold">{data?.siteVisits.scheduled || 0}</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>Cancelled/No-show:</span>
                    <span className="font-semibold">
                      {(data?.siteVisits.cancelled || 0) + (data?.siteVisits.noShow || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lead Source Summary */}
          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="text-xs font-semibold text-slate-700 mb-2">Top Lead Channels</div>
            <div className="flex flex-wrap gap-2">
              {data?.leadsBySource && data.leadsBySource.length > 0 ? (
                data.leadsBySource.map((s) => (
                  <span
                    key={s.source}
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 font-medium"
                  >
                    <span className="capitalize">{s.source}</span>
                    <span className="rounded-full bg-white px-1.5 py-0.2 text-[10px] font-bold text-slate-900 shadow-2xs">
                      {s.count}
                    </span>
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">No source attribution recorded yet.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section: Agent Performance Leaderboard */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Agent Performance Leaderboard
            </h2>
            <p className="text-xs text-slate-500">
              Ranked by deal conversions and gross brokerage generated
            </p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          {data?.agentPerformance && data.agentPerformance.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3">Rank</th>
                  <th className="py-3 px-3">Agent Name</th>
                  <th className="py-3 px-3">Designation</th>
                  <th className="py-3 px-3 text-center">Leads Managed</th>
                  <th className="py-3 px-3 text-center">Calls Made</th>
                  <th className="py-3 px-3 text-center">Visits Completed</th>
                  <th className="py-3 px-3 text-center">Deals Closed</th>
                  <th className="py-3 px-3 text-right">Brokerage Brought</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data.agentPerformance.map((agent, index) => {
                  const rankBadge =
                    index === 0 ? (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-300">
                        1
                      </span>
                    ) : index === 1 ? (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-700 font-bold text-[11px] border border-slate-300">
                        2
                      </span>
                    ) : index === 2 ? (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200">
                        3
                      </span>
                    ) : (
                      <span className="text-slate-400 font-semibold pl-2">{index + 1}</span>
                    );

                  return (
                    <tr key={agent.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">{rankBadge}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{agent.name}</td>
                      <td className="py-3 px-3 text-slate-500">{agent.designation}</td>
                      <td className="py-3 px-3 text-center font-medium">{agent.leadsAssigned}</td>
                      <td className="py-3 px-3 text-center font-medium">{agent.callsMade}</td>
                      <td className="py-3 px-3 text-center font-medium">{agent.visitsCompleted}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 border border-emerald-100">
                          {agent.dealsClosed}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {formatCurrencyINR(agent.totalBrokerage)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <EmptyState
              title="No data yet"
              description="No agents or activity recorded yet."
            />
          )}
        </div>
      </div>
    </div>
  );
}
