'use client';

import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  Clock,
  Search,
  Filter,
  Play,
  Volume2,
  Trash2,
  RefreshCw,
  Plus,
  Users,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { CallRecord, CallOutcome } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LogCallModal } from './log-call-modal';

const OUTCOME_TAGS: Record<CallOutcome, { label: string; color: string }> = {
  connected: { label: 'Connected', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  not_answered: { label: 'Not Answered', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  busy: { label: 'Busy', color: 'bg-blue-50 text-blue-800 border-blue-200' },
  wrong_number: { label: 'Wrong Number', color: 'bg-red-50 text-red-800 border-red-200' },
};

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

export function CallsManagement() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [leads, setLeads] = useState<Array<{ id: string; full_name: string; phone: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('all');

  // Modal
  const [isLogCallModalOpen, setIsLogCallModalOpen] = useState(false);
  const [selectedLeadForCall, setSelectedLeadForCall] = useState<{
    id: string;
    name: string;
    phone: string;
  } | null>(null);

  const fetchCalls = async () => {
    try {
      const params = new URLSearchParams();
      if (outcomeFilter !== 'all') params.set('outcome', outcomeFilter);

      const res = await fetch(`/api/calls?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCalls(data.calls || []);
      }
    } catch (e) {
      console.error('Failed to load call logs', e);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads');
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (e) {
      console.error('Failed to load leads list', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchCalls(), fetchLeads()]);
      setIsLoading(false);
    };
    init();
  }, [outcomeFilter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchCalls();
    setIsRefreshing(false);
  };

  const handleDeleteCall = async (id: string) => {
    if (!confirm('Are you sure you want to delete this call log?')) return;
    try {
      const res = await fetch(`/api/calls/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCalls((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (e) {
      console.error('Delete call log error', e);
    }
  };

  const filteredCalls = calls.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.lead?.full_name?.toLowerCase().includes(q) ||
      c.client_phone?.toLowerCase().includes(q) ||
      c.notes?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Telephony & Call Logs
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {calls.length} Logged
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Click-to-call history, audio recordings, and client phone conversation outcomes
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

          {leads.length > 0 && (
            <Button
              size="sm"
              onClick={() => {
                setSelectedLeadForCall({
                  id: leads[0].id,
                  name: leads[0].full_name,
                  phone: leads[0].phone,
                });
                setIsLogCallModalOpen(true);
              }}
              className="bg-amber-600 text-white hover:bg-amber-700 gap-1.5"
            >
              <Plus className="h-4 w-4" /> Log Call
            </Button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client name, phone number, discussion notes..."
            className="w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-3 text-xs focus:border-amber-500 focus:outline-hidden"
          />
        </div>

        <div className="sm:w-48">
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-amber-500 focus:outline-hidden"
          >
            <option value="all">All Outcomes</option>
            <option value="connected">Connected</option>
            <option value="not_answered">Not Answered</option>
            <option value="busy">Busy</option>
            <option value="wrong_number">Wrong Number</option>
          </select>
        </div>
      </div>

      {/* Calls Table */}
      {isLoading ? (
        <div className="py-20 text-center text-sm text-slate-500">
          Loading call logs and recordings...
        </div>
      ) : filteredCalls.length === 0 ? (
        <EmptyState
          title="No data yet"
          description={
            search || outcomeFilter !== 'all'
              ? 'No call logs match your search filters.'
              : 'Call logs will appear here when agents dial clients or save call notes from lead profiles.'
          }
          icon={Phone}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 pl-4 pr-2">Date & Time</th>
                  <th className="px-3 py-3">Client</th>
                  <th className="px-3 py-3">Contact</th>
                  <th className="px-3 py-3">Agent</th>
                  <th className="px-3 py-3">Outcome</th>
                  <th className="px-3 py-3">Duration</th>
                  <th className="px-3 py-3">Recording</th>
                  <th className="px-3 py-3">Notes</th>
                  <th className="py-3 pl-2 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCalls.map((call) => {
                  const outcomeInfo = OUTCOME_TAGS[call.outcome] || {
                    label: call.outcome,
                    color: 'bg-slate-100 text-slate-700',
                  };

                  return (
                    <tr key={call.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 pl-4 pr-2 text-slate-600 whitespace-nowrap">
                        {new Date(call.call_time).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-900">
                        {call.lead?.full_name || 'Client'}
                      </td>
                      <td className="px-3 py-3 font-mono text-slate-600">
                        <a
                          href={`tel:${call.client_phone || call.lead?.phone}`}
                          className="hover:text-amber-700 inline-flex items-center gap-1"
                        >
                          <Phone className="h-3 w-3 text-emerald-600" />
                          {call.client_phone || call.lead?.phone || '—'}
                        </a>
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {call.employee?.profile?.full_name || 'Agent'}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${outcomeInfo.color}`}
                        >
                          {outcomeInfo.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-slate-600">
                        {formatDuration(call.duration_seconds)}
                      </td>
                      <td className="px-3 py-3">
                        {call.recording_url ? (
                          <audio controls src={call.recording_url} className="h-7 w-36" />
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No audio</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-600 max-w-xs truncate" title={call.notes || ''}>
                        {call.notes || '—'}
                      </td>
                      <td className="py-3 pl-2 pr-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCall(call.id)}
                          className="h-7 px-2 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedLeadForCall && (
        <LogCallModal
          isOpen={isLogCallModalOpen}
          onClose={() => {
            setIsLogCallModalOpen(false);
            setSelectedLeadForCall(null);
          }}
          onSuccess={() => {
            fetchCalls();
          }}
          leadId={selectedLeadForCall.id}
          clientName={selectedLeadForCall.name}
          clientPhone={selectedLeadForCall.phone}
        />
      )}
    </div>
  );
}
