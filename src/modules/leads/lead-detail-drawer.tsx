'use client';

import React, { useState, useEffect } from 'react';
import { Lead, LeadHistoryItem, LeadStatus, Property } from '@/lib/supabase/types';
import { MatchedPropertyResult } from '@/app/api/properties/matched/route';
import { CreateFollowUpModal } from '@/modules/follow-ups/create-follow-up-modal';
import { LogCallModal } from '@/modules/calls/log-call-modal';
import { WhatsAppModal } from '@/modules/whatsapp/whatsapp-modal';
import { SiteVisitModal } from '@/modules/site-visits/site-visit-modal';
import { DealModal } from '@/modules/deals/deal-modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  IndianRupee,
  Calendar,
  Clock,
  Sparkles,
  Send,
  Plus,
  CheckCircle2,
  Share2,
  Building2,
  User,
  History,
  FileText,
  AlertCircle,
  ExternalLink,
  Edit,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface LeadDetailDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdated: (updatedLead: Lead) => void;
  onEditLead: (lead: Lead) => void;
  employees?: Array<{ id: string; profile?: { full_name: string } }>;
  isAdmin?: boolean;
}

const STATUS_OPTIONS: { id: LeadStatus; label: string; color: string }[] = [
  { id: 'new', label: 'New', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'contacted', label: 'Contacted', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'follow_up', label: 'Follow-up', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'site_visit', label: 'Site Visit', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { id: 'closed_won', label: 'Closed Won', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'closed_lost', label: 'Closed Lost', color: 'bg-slate-100 text-slate-700 border-slate-200' },
];

function formatCurrencyINR(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} Lakh`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

function cleanPhoneForWhatsApp(phone: string): string {
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.length === 10) {
    clean = '91' + clean;
  }
  return clean;
}

export function LeadDetailDrawer({
  lead,
  isOpen,
  onClose,
  onLeadUpdated,
  onEditLead,
  employees = [],
  isAdmin = false,
}: LeadDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'matches' | 'timeline' | 'details'>('matches');
  const [history, setHistory] = useState<LeadHistoryItem[]>([]);
  const [matchedProperties, setMatchedProperties] = useState<MatchedPropertyResult[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);

  // New Note
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Follow-up modal
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);

  // Phase 3 modals
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isSiteVisitModalOpen, setIsSiteVisitModalOpen] = useState(false);
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);

  // Status updating
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    if (isOpen && lead) {
      loadHistory(lead.id);
      loadMatches(lead.id);
    }
  }, [isOpen, lead?.id]);

  const loadHistory = async (leadId: string) => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (e) {
      console.error('Failed to load lead history', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadMatches = async (leadId: string) => {
    setIsLoadingMatches(true);
    try {
      const res = await fetch(`/api/properties/matched?lead_id=${leadId}`);
      if (res.ok) {
        const data = await res.json();
        setMatchedProperties(data.matches || []);
      }
    } catch (e) {
      console.error('Failed to load matched properties', e);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!lead || isUpdatingStatus || lead.status === newStatus) return;
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        onLeadUpdated(data.lead);
        loadHistory(lead.id);
      }
    } catch (e) {
      console.error('Failed to update status', e);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !noteContent.trim() || isSubmittingNote) return;

    setIsSubmittingNote(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'note',
          title: noteTitle.trim() || 'Client Interaction Note',
          description: noteContent.trim(),
        }),
      });
      if (res.ok) {
        setNoteTitle('');
        setNoteContent('');
        loadHistory(lead.id);
      }
    } catch (e) {
      console.error('Failed to save note', e);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  if (!isOpen || !lead) return null;

  const waClientUrl = `https://wa.me/${cleanPhoneForWhatsApp(lead.phone)}?text=${encodeURIComponent(
    `Hello ${lead.full_name}, this is regarding your enquiry with Diksha Real Estate.`
  )}`;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-white shadow-2xl transition-transform">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-bold text-base border border-amber-500/30">
              {lead.full_name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white leading-tight">{lead.full_name}</h2>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-300">
                  #{lead.lead_number || '101'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Created on {new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditLead(lead)}
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
            >
              <Edit className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Quick Contact & Action Ribbon */}
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Contact Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <a
                href={`tel:${lead.phone}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700 shadow-xs hover:border-amber-400 hover:text-amber-700 transition"
              >
                <Phone className="h-3.5 w-3.5 text-emerald-600" />
                {lead.phone}
              </a>

              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600 shadow-xs hover:text-slate-900"
                >
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {lead.email}
                </a>
              )}
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCallModalOpen(true)}
                className="border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 text-slate-700 gap-1 text-xs"
              >
                <Phone className="h-3.5 w-3.5 text-blue-600" />
                Call & Log
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsWhatsAppModalOpen(true)}
                className="border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 text-slate-700 gap-1 text-xs"
              >
                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                WhatsApp
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSiteVisitModalOpen(true)}
                className="border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/50 text-slate-700 gap-1 text-xs"
              >
                <MapPin className="h-3.5 w-3.5 text-purple-600" />
                Site Visit
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFollowUpModalOpen(true)}
                className="border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/50 text-slate-700 gap-1 text-xs"
              >
                <Calendar className="h-3.5 w-3.5 text-amber-600" />
                Follow-up
              </Button>

              <Button
                size="sm"
                onClick={() => setIsDealModalOpen(true)}
                className="bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs gap-1 text-xs font-semibold"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Close Deal
              </Button>
            </div>
          </div>
        </div>

        {/* Status Stepper / Selector */}
        <div className="border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pipeline Stage:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {STATUS_OPTIONS.map((st) => (
                <button
                  key={st.id}
                  disabled={isUpdatingStatus}
                  onClick={() => handleStatusChange(st.id)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    lead.status === st.id
                      ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Requirement Summary Cards */}
        <div className="grid grid-cols-2 gap-3 border-b border-slate-200 bg-slate-50/50 p-4 sm:grid-cols-4 text-xs">
          <div className="rounded-lg border border-slate-200 bg-white p-2.5">
            <span className="text-[10px] font-semibold uppercase text-slate-400">Requirement</span>
            <p className="mt-1 font-semibold text-slate-800 truncate">
              {lead.requirement || 'Not specified'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-2.5">
            <span className="text-[10px] font-semibold uppercase text-slate-400">Location</span>
            <p className="mt-1 font-semibold text-slate-800 truncate">
              {lead.location || lead.preferred_location || 'Any location'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-2.5">
            <span className="text-[10px] font-semibold uppercase text-slate-400">Budget Range</span>
            <p className="mt-1 font-semibold text-amber-700 truncate">
              {lead.budget_min || lead.budget_max
                ? `${lead.budget_min ? formatCurrencyINR(Number(lead.budget_min)) : '₹0'} - ${lead.budget_max ? formatCurrencyINR(Number(lead.budget_max)) : 'Open'}`
                : 'Flexible'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-2.5">
            <span className="text-[10px] font-semibold uppercase text-slate-400">Assigned Agent</span>
            <p className="mt-1 font-semibold text-slate-800 truncate">
              {lead.assigned_employee?.profile?.full_name || 'Unassigned'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            onClick={() => setActiveTab('matches')}
            className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition ${
              activeTab === 'matches'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Auto-Matched Properties
            {matchedProperties.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                {matchedProperties.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition ${
              activeTab === 'timeline'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="h-4 w-4" />
            Timeline & Activity Log
            {history.length > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                {history.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('details')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition ${
              activeTab === 'details'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="h-4 w-4" />
            Lead Specs
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: AUTO MATCHED PROPERTIES */}
          {activeTab === 'matches' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Smart Inventory Matches
                  </h3>
                  <p className="text-xs text-slate-500">
                    Automatically matched by Location, Category ({lead.lead_type.toUpperCase()}), Budget (±15%), and BHK.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadMatches(lead.id)}
                  isLoading={isLoadingMatches}
                >
                  Refresh Matches
                </Button>
              </div>

              {isLoadingMatches ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  Finding best matched inventory...
                </div>
              ) : matchedProperties.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                  <Building2 className="mx-auto h-8 w-8 text-slate-400" />
                  <h4 className="mt-2 text-sm font-semibold text-slate-800">No properties matched yet</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    No active property matches {lead.location || 'this location'} within{' '}
                    {lead.budget_min || lead.budget_max
                      ? `budget range (±15%)`
                      : 'budget'}.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {matchedProperties.map((item, idx) => (
                    <div
                      key={item.property.id || idx}
                      className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-400 hover:shadow-md"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        {/* Property Details */}
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                item.score >= 80
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.score >= 50
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {item.score}% Match
                            </span>
                            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                              {item.property.property_type.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-slate-300">•</span>
                            <span className="text-xs font-semibold text-slate-700">
                              {item.property.bhk || (item.property.size_sqft ? `${item.property.size_sqft} sqft` : '')}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition">
                            {item.property.title}
                          </h4>

                          <div className="flex items-center gap-3 text-xs text-slate-600">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              {item.property.location || item.property.city}
                            </span>
                            <span className="font-bold text-amber-700">
                              {formatCurrencyINR(Number(item.property.price))}
                            </span>
                          </div>

                          {/* Match Criteria Reasons */}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {item.reasons.map((r, rIdx) => (
                              <span
                                key={rIdx}
                                className="inline-flex items-center gap-1 rounded bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 border border-slate-200"
                              >
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* WhatsApp Share Button */}
                        <div className="shrink-0 flex items-center sm:flex-col sm:items-end gap-2">
                          <a
                            href={item.whatsAppShareUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 transition"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                            Share to WhatsApp
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TIMELINE & ACTIVITY LOG */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                  Add Interaction Note / Activity
                </h4>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Subject (e.g. Discussed budget, Client requested site visit...)"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                  />
                  <textarea
                    rows={2}
                    required
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Enter notes from the call, meeting, or client requirements..."
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      isLoading={isSubmittingNote}
                      className="bg-slate-900 text-white hover:bg-slate-800 text-xs"
                    >
                      <Send className="mr-1 h-3 w-3" /> Post Note
                    </Button>
                  </div>
                </div>
              </form>

              {/* Timeline Items */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Activity Timeline ({history.length})
                </h4>

                {isLoadingHistory ? (
                  <div className="py-6 text-center text-xs text-slate-500">Loading timeline...</div>
                ) : history.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No notes or activities recorded yet.</p>
                ) : (
                  <div className="relative border-l border-slate-200 pl-4 space-y-4 ml-2">
                    {history.map((item) => (
                      <div key={item.id} className="relative">
                        {/* Dot */}
                        <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-500 ring-2 ring-slate-100" />
                        <div className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span className="font-semibold text-slate-800">{item.title}</span>
                            <span>
                              {new Date(item.created_at).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>
                          {item.description && (
                            <p className="mt-1 text-xs text-slate-600 whitespace-pre-wrap">
                              {item.description}
                            </p>
                          )}
                          <div className="mt-1 text-[10px] text-slate-400">
                            By {item.actor_name || 'System Agent'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: FULL LEAD DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-4 text-xs">
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                  Client Profile
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 block">Full Name</span>
                    <span className="font-semibold text-slate-800">{lead.full_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Primary Mobile</span>
                    <span className="font-mono text-slate-800">{lead.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Alternate Contact</span>
                    <span className="font-mono text-slate-800">{lead.alternate_phone || 'None'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Email</span>
                    <span className="text-slate-800">{lead.email || 'None'}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                  Property Preferences
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 block">Lead Category</span>
                    <span className="font-semibold uppercase text-slate-800">{lead.lead_type}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Lead Source</span>
                    <span className="font-semibold uppercase text-slate-800">{lead.source}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Requirement</span>
                    <span className="text-slate-800">{lead.requirement || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Preferred Area</span>
                    <span className="text-slate-800">{lead.location || lead.preferred_location || 'Open'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Minimum Budget</span>
                    <span className="font-semibold text-amber-700">
                      {lead.budget_min ? formatCurrencyINR(Number(lead.budget_min)) : 'Not set'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Maximum Budget</span>
                    <span className="font-semibold text-amber-700">
                      {lead.budget_max ? formatCurrencyINR(Number(lead.budget_max)) : 'Open'}
                    </span>
                  </div>
                </div>
              </div>

              {lead.remarks && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm">Agent Remarks</h4>
                  <p className="text-slate-600 whitespace-pre-wrap">{lead.remarks}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Follow-up modal mounted */}
      <CreateFollowUpModal
        isOpen={isFollowUpModalOpen}
        onClose={() => setIsFollowUpModalOpen(false)}
        onSuccess={() => {
          setIsFollowUpModalOpen(false);
          loadHistory(lead.id);
        }}
        initialLeadId={lead.id}
        initialLeadName={lead.full_name}
        leads={[{ id: lead.id, full_name: lead.full_name, phone: lead.phone }]}
        employees={employees}
      />

      {/* Call modal mounted */}
      <LogCallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        onSuccess={() => {
          setIsCallModalOpen(false);
          loadHistory(lead.id);
        }}
        leadId={lead.id}
        clientName={lead.full_name}
        clientPhone={lead.phone}
      />

      {/* WhatsApp modal mounted */}
      <WhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        onSuccess={() => {
          setIsWhatsAppModalOpen(false);
          loadHistory(lead.id);
        }}
        leadId={lead.id}
        clientName={lead.full_name}
        clientPhone={lead.phone}
        clientLocation={lead.location || lead.preferred_location || undefined}
        clientRequirement={lead.requirement || undefined}
      />

      {/* Site visit modal mounted */}
      <SiteVisitModal
        isOpen={isSiteVisitModalOpen}
        onClose={() => setIsSiteVisitModalOpen(false)}
        onSuccess={() => {
          setIsSiteVisitModalOpen(false);
          loadHistory(lead.id);
        }}
        initialLeadId={lead.id}
        leads={[{ id: lead.id, full_name: lead.full_name, phone: lead.phone }]}
      />

      {/* Deal modal mounted */}
      <DealModal
        isOpen={isDealModalOpen}
        onClose={() => setIsDealModalOpen(false)}
        onSuccess={() => {
          setIsDealModalOpen(false);
          loadHistory(lead.id);
          onLeadUpdated({ ...lead, status: 'closed_won' });
        }}
        initialLeadId={lead.id}
        leads={[{ id: lead.id, full_name: lead.full_name, phone: lead.phone }]}
      />
    </>
  );
}
