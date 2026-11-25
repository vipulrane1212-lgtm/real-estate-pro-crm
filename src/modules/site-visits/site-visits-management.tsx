'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  Building2,
  User,
  Phone,
  Check,
  Filter,
} from 'lucide-react';
import { SiteVisit, SiteVisitStatus } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SiteVisitModal } from './site-visit-modal';
import { CompleteVisitModal } from './complete-visit-modal';

const STATUS_CONFIG: Record<SiteVisitStatus, { label: string; color: string }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-50 text-blue-800 border-blue-200' },
  completed: { label: 'Completed', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  cancelled: { label: 'Cancelled', color: 'bg-red-50 text-red-800 border-red-200' },
  no_show: { label: 'No-Show', color: 'bg-amber-50 text-amber-800 border-amber-200' },
};

export function SiteVisitsManagement() {
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [leads, setLeads] = useState<Array<{ id: string; full_name: string; phone: string }>>([]);
  const [properties, setProperties] = useState<Array<{ id: string; title: string; location?: string; bhk?: string }>>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; designation: string; profile?: { full_name: string } }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Tab filter: 'today' | 'upcoming' | 'completed' | 'all'
  const [filterTab, setFilterTab] = useState<'today' | 'upcoming' | 'completed' | 'all'>('today');
  const [search, setSearch] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [completingVisit, setCompletingVisit] = useState<SiteVisit | null>(null);

  const fetchVisits = async () => {
    try {
      const params = new URLSearchParams();
      if (filterTab !== 'all' && filterTab !== 'completed') {
        params.set('filter', filterTab);
      }
      if (filterTab === 'completed') {
        params.set('status', 'completed');
      }

      const res = await fetch(`/api/site-visits?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setVisits(data.visits || []);
      }
    } catch (e) {
      console.error('Failed to load site visits', e);
    }
  };

  const fetchPrerequisites = async () => {
    try {
      const [leadsRes, propsRes, empsRes] = await Promise.all([
        fetch('/api/leads'),
        fetch('/api/properties'),
        fetch('/api/employees'),
      ]);

      if (leadsRes.ok) {
        const ld = await leadsRes.json();
        setLeads(ld.leads || []);
      }
      if (propsRes.ok) {
        const pd = await propsRes.json();
        setProperties(pd.properties || []);
      }
      if (empsRes.ok) {
        const ed = await empsRes.json();
        setEmployees(ed.employees || []);
      }
    } catch (e) {
      console.error('Failed to fetch modal prerequisites', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchVisits(), fetchPrerequisites()]);
      setIsLoading(false);
    };
    init();
    const handleToggle = () => {
      fetchVisits();
      fetchPrerequisites();
    };
    window.addEventListener('diksha_demo_toggle', handleToggle);
    return () => window.removeEventListener('diksha_demo_toggle', handleToggle);
  }, [filterTab]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchVisits();
    setIsRefreshing(false);
  };

  const handleDeleteVisit = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled site visit?')) return;
    try {
      const res = await fetch(`/api/site-visits/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setVisits((prev) => prev.filter((v) => v.id !== id));
      }
    } catch (e) {
      console.error('Delete error', e);
    }
  };

  const filteredVisits = visits.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.lead?.full_name?.toLowerCase().includes(q) ||
      v.property?.title?.toLowerCase().includes(q) ||
      v.assigned_employee?.profile?.full_name?.toLowerCase().includes(q) ||
      v.outcome_note?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Site Visits Management
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {visits.length} Listed
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Daily inspection itineraries, client feedback, and property viewing outcomes
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={isRefreshing}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-amber-600 text-white hover:bg-amber-700 gap-1.5 shadow-xs"
          >
            <Plus className="h-4 w-4" /> Schedule Visit
          </Button>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterTab('today')}
            className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 transition cursor-pointer ${
              filterTab === 'today' ? 'bg-white font-bold text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Today&apos;s Visits
          </button>
          <button
            onClick={() => setFilterTab('upcoming')}
            className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 transition cursor-pointer ${
              filterTab === 'upcoming' ? 'bg-white font-bold text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilterTab('completed')}
            className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 transition cursor-pointer ${
              filterTab === 'completed' ? 'bg-white font-bold text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setFilterTab('all')}
            className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 transition cursor-pointer ${
              filterTab === 'all' ? 'bg-white font-bold text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Visits
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client, property, or agent..."
            className="w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-3 text-xs focus:border-amber-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Visits List */}
      {isLoading ? (
        <div className="py-20 text-center text-sm text-slate-500">
          Loading site visits and itineraries...
        </div>
      ) : filteredVisits.length === 0 ? (
        <EmptyState
          title="No data yet"
          description={
            filterTab === 'today'
              ? 'No site visits scheduled for today.'
              : search
              ? 'No visits match your filter query.'
              : 'Schedule an inspection to register upcoming client visits.'
          }
          icon={MapPin}
          actionText="Schedule Site Visit"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredVisits.map((v) => {
            const statusConfig = STATUS_CONFIG[v.status] || {
              label: v.status,
              color: 'bg-slate-100 text-slate-700',
            };

            return (
              <div
                key={v.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:border-amber-400"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                      {v.client_interest_level && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
                          {v.client_interest_level} interest
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 pt-1">
                      {v.property?.title || 'Property'}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {v.property?.location || 'Location open'}
                    </p>
                  </div>

                  {/* Date & Time Badge */}
                  <div className="text-right">
                    <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 border border-amber-200 inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(v.visit_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {new Date(v.visit_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {/* Lead & Agent Grid */}
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-slate-400">Client</span>
                    <p className="font-semibold text-slate-800">{v.lead?.full_name || 'Client'}</p>
                    <a href={`tel:${v.lead?.phone}`} className="font-mono text-slate-500 hover:text-amber-700 flex items-center gap-1">
                      <Phone className="h-3 w-3 text-emerald-600" />
                      {v.lead?.phone || '—'}
                    </a>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold uppercase text-slate-400">Assigned Agent</span>
                    <p className="font-semibold text-slate-800">
                      {v.assigned_employee?.profile?.full_name || 'Agent'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {v.assigned_employee?.designation || 'Executive'}
                    </p>
                  </div>
                </div>

                {/* Outcome notes / Feedback */}
                {(v.outcome_note || v.feedback || v.cancellation_reason) && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-700 border border-slate-100">
                    <span className="font-semibold text-slate-800">Note: </span>
                    {v.outcome_note || v.feedback || v.cancellation_reason}
                  </div>
                )}

                {/* Bottom Actions */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="text-[11px] text-slate-400">
                    {v.status === 'scheduled' ? 'Awaiting inspection' : `Completed on ${new Date(v.completed_at || v.updated_at).toLocaleDateString('en-IN')}`}
                  </div>

                  <div className="flex items-center gap-2">
                    {v.status === 'scheduled' && (
                      <Button
                        size="sm"
                        onClick={() => setCompletingVisit(v)}
                        className="h-7 text-xs bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        <Check className="h-3 w-3 mr-1" /> Update Status
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteVisit(v.id)}
                      className="h-7 text-xs text-slate-400 hover:text-red-600"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Modal */}
      <SiteVisitModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchVisits();
        }}
        leads={leads}
        properties={properties}
        employees={employees}
      />

      {/* Complete Modal */}
      <CompleteVisitModal
        visit={completingVisit}
        isOpen={Boolean(completingVisit)}
        onClose={() => setCompletingVisit(null)}
        onSuccess={() => {
          fetchVisits();
        }}
      />
    </div>
  );
}
