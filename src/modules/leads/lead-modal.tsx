'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Lead, LeadType, LeadStatus, LeadSource } from '@/lib/supabase/types';
import { Users, Phone, Mail, MapPin, IndianRupee, Tag, Building2, FileText, AlertCircle } from 'lucide-react';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (lead: Lead) => void;
  initialLead?: Lead | null;
  employees?: Array<{ id: string; designation: string; profile?: { full_name: string } }>;
  isAdmin?: boolean;
}

const LEAD_TYPES: { id: LeadType; label: string }[] = [
  { id: 'buy', label: 'Buy' },
  { id: 'sell', label: 'Sell' },
  { id: 'rent', label: 'Rent' },
  { id: 'commercial', label: 'Commercial' },
];

const LEAD_STATUSES: { id: LeadStatus; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'follow_up', label: 'Follow-up' },
  { id: 'site_visit', label: 'Site Visit' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'closed_won', label: 'Closed Won' },
  { id: 'closed_lost', label: 'Closed Lost' },
];

const LEAD_SOURCES: { id: LeadSource; label: string }[] = [
  { id: 'meta_ads', label: 'Meta Ads (Facebook/Instagram)' },
  { id: 'housing', label: 'Housing.com' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'google', label: 'Google Ads / Search' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'website', label: 'Website' },
  { id: 'walk_in', label: 'Walk-in' },
  { id: 'reference', label: 'Reference' },
  { id: 'manual', label: 'Manual' },
  { id: 'csv', label: 'CSV Import' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'other', label: 'Other' },
];

const COMMON_REQUIREMENTS = [
  '1 BHK Flat',
  '2 BHK Flat',
  '3 BHK Flat',
  '4 BHK Flat',
  'Penthouse / Luxury Villa',
  'Residential Plot',
  'Commercial Shop',
  'Commercial Office Space',
  'Warehouse / Industrial Land',
];

export function LeadModal({
  isOpen,
  onClose,
  onSuccess,
  initialLead,
  employees = [],
  isAdmin = false,
}: LeadModalProps) {
  const isEditing = Boolean(initialLead);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [email, setEmail] = useState('');
  const [leadType, setLeadType] = useState<LeadType>('buy');
  const [status, setStatus] = useState<LeadStatus>('new');
  const [source, setSource] = useState<LeadSource>('website');
  const [sourceDetail, setSourceDetail] = useState('');
  const [location, setLocation] = useState('');
  const [requirement, setRequirement] = useState('');
  const [budgetMin, setBudgetMin] = useState<string>('');
  const [budgetMax, setBudgetMax] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [remarks, setRemarks] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    id: string;
    full_name: string;
    phone: string;
    status: string;
    assigned_name?: string | null;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialLead) {
        setFullName(initialLead.full_name || '');
        setPhone(initialLead.phone || '');
        setAlternatePhone(initialLead.alternate_phone || '');
        setEmail(initialLead.email || '');
        setLeadType(initialLead.lead_type || 'buy');
        setStatus(initialLead.status || 'new');
        setSource(initialLead.source || 'website');
        setSourceDetail(initialLead.source_detail || '');
        setLocation(initialLead.location || initialLead.preferred_location || '');
        setRequirement(initialLead.requirement || '');
        setBudgetMin(initialLead.budget_min ? String(initialLead.budget_min) : '');
        setBudgetMax(initialLead.budget_max ? String(initialLead.budget_max) : '');
        setAssignedTo(initialLead.assigned_to || '');
        setRemarks(initialLead.remarks || '');
      } else {
        // Reset defaults
        setFullName('');
        setPhone('');
        setAlternatePhone('');
        setEmail('');
        setLeadType('buy');
        setStatus('new');
        setSource('website');
        setSourceDetail('');
        setLocation('');
        setRequirement('');
        setBudgetMin('');
        setBudgetMax('');
        setAssignedTo('');
        setRemarks('');
      }
      setErrorMessage('');
      setAllowDuplicate(false);
      setDuplicateWarning(null);
    }
  }, [isOpen, initialLead]);

  const handlePhoneBlur = async () => {
    if (isEditing || !phone.trim() || phone.trim().length < 10) return;
    try {
      const res = await fetch(`/api/leads/check-duplicate?phone=${encodeURIComponent(phone.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data.isDuplicate && data.duplicateLead) {
          setDuplicateWarning(data.duplicateLead);
        } else {
          setDuplicateWarning(null);
        }
      }
    } catch {
      // ignore network errors on blur
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMessage('Client name is required');
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      setErrorMessage('Please provide a valid 10-digit mobile number');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        alternate_phone: alternatePhone.trim() || null,
        email: email.trim() || null,
        lead_type: leadType,
        status,
        source,
        source_detail: sourceDetail.trim() || null,
        location: location.trim() || null,
        requirement: requirement.trim() || null,
        budget_min: budgetMin ? Number(budgetMin) : null,
        budget_max: budgetMax ? Number(budgetMax) : null,
        assigned_to: assignedTo || null,
        remarks: remarks.trim() || null,
        allow_duplicate: allowDuplicate,
      };

      const url = isEditing && initialLead ? `/api/leads/${initialLead.id}` : '/api/leads';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.duplicateLead) {
          setDuplicateWarning(data.duplicateLead);
          setErrorMessage(data.error || 'A lead with this mobile already exists.');
          return;
        }
        throw new Error(data.error || 'Failed to save lead');
      }

      onSuccess(data.lead);
      onClose();
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatLakhsPreview = (val: string) => {
    const num = Number(val);
    if (!num || isNaN(num)) return '';
    if (num >= 10000000) return `(₹${(num / 10000000).toFixed(2)} Cr)`;
    if (num >= 100000) return `(₹${(num / 100000).toFixed(2)} Lakh)`;
    return `(₹${num.toLocaleString('en-IN')})`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Lead Profile' : 'Add New Client Lead'}
      description="Record client details, requirement specs, budget range, and assign to agent."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {duplicateWarning && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 shadow-xs">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900">Lead with this mobile already exists!</h4>
                <p className="mt-1 text-xs text-amber-800">
                  <strong>{duplicateWarning.full_name}</strong> ({duplicateWarning.status.replace('_', ' ')}, assigned to{' '}
                  {duplicateWarning.assigned_name || 'Unassigned'}).
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      window.location.href = `/leads?search=${encodeURIComponent(duplicateWarning.phone)}`;
                    }}
                    className="rounded bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-900 cursor-pointer"
                  >
                    Open Existing Lead
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAllowDuplicate(true);
                      setDuplicateWarning(null);
                      setErrorMessage('');
                    }}
                    className="rounded border border-amber-400 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 cursor-pointer"
                  >
                    Create Anyway (Allow Duplicate)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Client Core Information */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Client Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Users className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ramesh Chandra"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (duplicateWarning) setDuplicateWarning(null);
                }}
                onBlur={handlePhoneBlur}
                placeholder="10-digit mobile number"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Alternate Phone / WhatsApp
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="tel"
                value={alternatePhone}
                onChange={(e) => setAlternatePhone(e.target.value)}
                placeholder="Optional secondary contact"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Email Address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Lead Classification & Pipeline Stage */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Lead Type
            </label>
            <select
              value={leadType}
              onChange={(e) => setLeadType(e.target.value as LeadType)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {LEAD_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Pipeline Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as LeadStatus)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Lead Source
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as LeadSource)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {LEAD_SOURCES.map((src) => (
                <option key={src.id} value={src.id}>
                  {src.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Source Detail / Campaign
            </label>
            <input
              type="text"
              value={sourceDetail}
              onChange={(e) => setSourceDetail(e.target.value)}
              placeholder="e.g. adset: Gomti, ref: Client"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Requirement & Location */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Preferred Location / Area
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Gomti Nagar, Indira Nagar, Amar Shaheed Path"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Requirement / Unit Configuration
            </label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                list="requirements-list"
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                placeholder="e.g. 3 BHK Flat or 2000 sqft Plot"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <datalist id="requirements-list">
                {COMMON_REQUIREMENTS.map((req) => (
                  <option key={req} value={req} />
                ))}
              </datalist>
            </div>
          </div>
        </div>

        {/* Budget Range */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Client Budget Range (INR)
            </span>
            <span className="text-xs text-slate-500">Used for property auto-matching (±15%)</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-600">
                Minimum Budget {budgetMin && <span className="font-semibold text-amber-700">{formatLakhsPreview(budgetMin)}</span>}
              </label>
              <div className="relative">
                <IndianRupee className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  step="50000"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  placeholder="e.g. 5000000 (50 Lakh)"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-600">
                Maximum Budget {budgetMax && <span className="font-semibold text-amber-700">{formatLakhsPreview(budgetMax)}</span>}
              </label>
              <div className="relative">
                <IndianRupee className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  step="50000"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  placeholder="e.g. 8000000 (80 Lakh)"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Agent (Admin Only) */}
        {isAdmin && (
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Assign to Employee / Agent
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">-- Unassigned (Available in Pool) --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.profile?.full_name || 'Agent'} ({emp.designation})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Remarks / Notes */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
            Client Remarks & Specific Preferences
          </label>
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Client needs immediate possession, prefers East facing, needs loan assistance..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            className="bg-slate-900 text-white hover:bg-slate-800"
          >
            {isEditing ? 'Save Changes' : 'Create Lead'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
