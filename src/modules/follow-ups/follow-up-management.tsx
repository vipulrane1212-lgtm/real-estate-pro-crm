'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Phone,
  MessageSquare,
  MapPin,
  Users,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Check,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { FollowUp, FollowUpType } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { CreateFollowUpModal } from './create-follow-up-modal';

const TYPE_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  visit: MapPin,
  whatsapp: MessageSquare,
  meeting: Users,
};

const TYPE_LABELS: Record<string, string> = {
  call: 'Phone Call',
  visit: 'Site Visit',
  whatsapp: 'WhatsApp',
  meeting: 'Meeting',
};

export function FollowUpManagement() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [leads, setLeads] = useState<Array<{ id: string; full_name: string; phone: string }>>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; profile?: { full_name: string } }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter tab
  const [activeTab, setActiveTab] = useState<'today' | 'overdue' | 'upcoming' | 'all' | 'completed'>('today');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [completingFollowUp, setCompletingFollowUp] = useState<FollowUp | null>(null);
  const [outcomeNote, setOutcomeNote] = useState('');
  const [isSubmittingOutcome, setIsSubmittingOutcome] = useState(false);

  const fetchFollowUps = async () => {
    try {
      setIsRefreshing(true);
      const params = new URLSearchParams();
      if (activeTab === 'today') params.set('filter', 'today');
      else if (activeTab === 'overdue') params.set('filter', 'overdue');
      else if (activeTab === 'upcoming') params.set('filter', 'upcoming');
      else if (activeTab === 'completed') params.set('status', 'completed');

      const res = await fetch(`/api/follow-ups?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFollowUps(data.followUps || []);
      }
    } catch (err) {
      console.error('Failed to load follow-ups:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchLeadsAndEmployees = async () => {
    try {
      const [leadsRes, empRes] = await Promise.all([
        fetch('/api/leads'),
        fetch('/api/employees'),
      ]);
      if (leadsRes.ok) {
        const data = await leadsRes.json();
        setLeads(data.leads || []);
      }
      if (empRes.ok) {
        const data = await empRes.json();
        setEmployees(data.employees || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchFollowUps();
    const handleToggle = () => {
      fetchFollowUps();
      fetchLeadsAndEmployees();
    };
    window.addEventListener('diksha_demo_toggle', handleToggle);
    return () => window.removeEventListener('diksha_demo_toggle', handleToggle);
  }, [activeTab]);

  useEffect(() => {
    fetchLeadsAndEmployees();
  }, []);

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingFollowUp) return;

    try {
      setIsSubmittingOutcome(true);
      const res = await fetch(`/api/follow-ups/${completingFollowUp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          outcome: outcomeNote.trim() || 'Follow-up completed',
        }),
      });

      if (res.ok) {
        setCompletingFollowUp(null);
        setOutcomeNote('');
        fetchFollowUps();
      }
    } catch (err) {
      console.error('Error completing follow-up:', err);
    } finally {
      setIsSubmittingOutcome(false);
    }
  };

  const overdueList = followUps.filter(f => f.status === 'pending' && new Date(f.scheduled_at) < new Date());
  const overdueCount = activeTab === 'overdue' ? followUps.length : overdueList.length;

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Follow-ups & Reminders
            </h1>
            <Badge variant="navy" className="text-xs">
              {followUps.length} Tasks
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Daily call queues, client reminders, and scheduled inspection visits
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFollowUps}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Schedule Follow-up
          </Button>
        </div>
      </div>

      {/* Missed / Overdue Alerts Banner */}
      {overdueCount > 0 && activeTab !== 'completed' && (
        <div className="flex items-center justify-between rounded-xl border border-red-300 bg-red-50 p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-white shadow-xs">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-900">
                Action Required: {overdueCount} Overdue Follow-up{overdueCount > 1 ? 's' : ''}
              </h4>
              <p className="text-xs text-red-700 mt-0.5">
                These callbacks or visits were scheduled for earlier and require immediate action to prevent lead drop-off.
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setActiveTab('overdue')}
          >
            View Overdue Tasks
          </Button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('today')}
          className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'today'
              ? 'border-[#0f172a] text-[#0f172a]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Today&apos;s Follow-ups
        </button>
        <button
          onClick={() => setActiveTab('overdue')}
          className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'overdue'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Overdue / Missed
        </button>
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'upcoming'
              ? 'border-[#0f172a] text-[#0f172a]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'all'
              ? 'border-[#0f172a] text-[#0f172a]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          All Pending
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'completed'
              ? 'border-[#0f172a] text-[#0f172a]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Completed
        </button>
      </div>

      {/* Follow-up List */}
      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
          <span className="ml-2 text-sm text-slate-500">Loading follow-ups...</span>
        </div>
      ) : followUps.length === 0 ? (
        <EmptyState
          title="No data yet"
          description={`No ${activeTab} follow-ups scheduled at this time. Click 'Schedule Follow-up' to register client callback appointments.`}
          icon={CalendarClock}
          actionText="Schedule Follow-up"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {followUps.map(f => {
            const isCompleted = f.status === 'completed';
            const isOverdue = !isCompleted && new Date(f.scheduled_at) < new Date();
            const Icon = TYPE_ICONS[f.follow_up_type] || Phone;
            const scheduledDate = new Date(f.scheduled_at);

            return (
              <Card
                key={f.id}
                className={`p-4 transition-all hover:border-slate-300 ${
                  isOverdue
                    ? 'border-red-300 bg-red-50/20'
                    : isCompleted
                    ? 'border-slate-200 bg-slate-50/50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Client & Details */}
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        isOverdue
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : isCompleted
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-slate-900">
                          {f.lead?.full_name || 'Client Lead'}
                        </h4>
                        <span className="text-xs text-slate-500">
                          ({f.lead?.phone || 'No phone'})
                        </span>
                        {isOverdue && (
                          <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">
                            OVERDUE
                          </span>
                        )}
                        {isCompleted && (
                          <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            COMPLETED
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">
                          {TYPE_LABELS[f.follow_up_type] || f.follow_up_type}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {scheduledDate.toLocaleDateString()} at {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {f.lead?.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            {f.lead.location}
                          </span>
                        )}
                      </div>

                      {f.remarks && (
                        <p className="mt-2 text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                          <span className="font-medium text-slate-700">Agenda:</span> {f.remarks}
                        </p>
                      )}

                      {f.outcome && (
                        <p className="mt-2 text-xs text-emerald-800 bg-emerald-50/70 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                          <span className="font-semibold">Outcome:</span> {f.outcome}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {f.lead?.phone && (
                      <>
                        <a
                          href={`tel:${f.lead.phone}`}
                          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                          title="Call Client"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                        <a
                          href={`https://wa.me/${f.lead.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100 transition-colors"
                          title="Chat on WhatsApp"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </a>
                      </>
                    )}

                    {!isCompleted && (
                      <Button
                        variant="gold"
                        size="sm"
                        onClick={() => {
                          setCompletingFollowUp(f);
                          setOutcomeNote('');
                        }}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <CreateFollowUpModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchFollowUps}
        leads={leads}
        employees={employees}
      />

      {/* Outcome Note Modal */}
      <Modal
        isOpen={!!completingFollowUp}
        onClose={() => setCompletingFollowUp(null)}
        title="Complete Follow-up Task"
        description={`Record outcome of interaction with ${completingFollowUp?.lead?.full_name || 'client'}.`}
        maxWidth="md"
      >
        <form onSubmit={handleCompleteSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Outcome Notes *</label>
            <textarea
              required
              rows={3}
              value={outcomeNote}
              onChange={e => setOutcomeNote(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
              placeholder="e.g. Spoke with client. Very interested in 2 BHK in Andheri West. Scheduled site visit for Saturday at 4 PM."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCompletingFollowUp(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmittingOutcome}
            >
              Save Outcome & Mark Done
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
