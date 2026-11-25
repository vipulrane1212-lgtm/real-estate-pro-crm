'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Building2, User, AlertCircle } from 'lucide-react';

interface SiteVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialLeadId?: string;
  initialPropertyId?: string;
  leads?: Array<{ id: string; full_name: string; phone: string }>;
  properties?: Array<{ id: string; title: string; location?: string; bhk?: string }>;
  employees?: Array<{ id: string; designation: string; profile?: { full_name: string } }>;
}

export function SiteVisitModal({
  isOpen,
  onClose,
  onSuccess,
  initialLeadId,
  initialPropertyId,
  leads = [],
  properties = [],
  employees = [],
}: SiteVisitModalProps) {
  const [leadId, setLeadId] = useState(initialLeadId || '');
  const [propertyId, setPropertyId] = useState(initialPropertyId || '');
  const [assignedTo, setAssignedTo] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('11:00');
  const [interestLevel, setInterestLevel] = useState<'hot' | 'warm' | 'cold'>('warm');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [availableProperties, setAvailableProperties] = useState(properties);
  const [availableEmployees, setAvailableEmployees] = useState(employees);

  useEffect(() => {
    if (properties.length > 0) setAvailableProperties(properties);
    if (employees.length > 0) setAvailableEmployees(employees);
  }, [properties, employees]);

  useEffect(() => {
    if (isOpen) {
      if (initialLeadId) setLeadId(initialLeadId);
      if (initialPropertyId) setPropertyId(initialPropertyId);

      // Default to tomorrow 11:00 AM
      const tmrw = new Date();
      tmrw.setDate(tmrw.getDate() + 1);
      setVisitDate(tmrw.toISOString().split('T')[0]);
      setVisitTime('11:00');
      setInterestLevel('warm');
      setNotes('');
      setErrorMessage('');

      if (availableProperties.length === 0) {
        fetch('/api/properties')
          .then((res) => res.json())
          .then((data) => {
            if (data.properties) setAvailableProperties(data.properties);
          })
          .catch((e) => console.error(e));
      }

      if (availableEmployees.length === 0) {
        fetch('/api/employees')
          .then((res) => res.json())
          .then((data) => {
            if (data.employees) setAvailableEmployees(data.employees);
          })
          .catch((e) => console.error(e));
      }
    }
  }, [isOpen, initialLeadId, initialPropertyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId) {
      setErrorMessage('Please select a client lead');
      return;
    }
    if (!propertyId) {
      setErrorMessage('Please select a property listing');
      return;
    }
    if (!visitDate) {
      setErrorMessage('Please select visit date');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/site-visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          property_id: propertyId,
          assigned_to: assignedTo || null,
          visit_date: visitDate,
          time: visitTime,
          client_interest_level: interestLevel,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule site visit');

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Failed to schedule visit');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule Client Site Visit"
      description="Assign an inspection for a property listing and register it on daily schedules."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Lead Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Client / Lead <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
          >
            <option value="">-- Select Client Lead --</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.full_name} ({l.phone})
              </option>
            ))}
          </select>
        </div>

        {/* Property Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Property Listing <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
          >
            <option value="">-- Select Property --</option>
            {availableProperties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} {p.bhk ? `(${p.bhk})` : ''} — {p.location || ''}
              </option>
            ))}
          </select>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" /> Visit Date
            </label>
            <input
              type="date"
              required
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" /> Visit Time
            </label>
            <input
              type="time"
              required
              value={visitTime}
              onChange={(e) => setVisitTime(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-amber-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Assigned Agent */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Assigned Agent / Executive
          </label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
          >
            <option value="">-- Lead Default Assigned Agent --</option>
            {availableEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.profile?.full_name || 'Agent'} ({emp.designation})
              </option>
            ))}
          </select>
        </div>

        {/* Interest Level */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Expected Client Interest Level
          </label>
          <div className="flex gap-2">
            {(['hot', 'warm', 'cold'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setInterestLevel(lvl)}
                className={`flex-1 rounded-lg border py-1.5 text-xs font-medium uppercase transition cursor-pointer ${
                  interestLevel === lvl
                    ? lvl === 'hot'
                      ? 'border-red-500 bg-red-50 text-red-800'
                      : lvl === 'warm'
                      ? 'border-amber-500 bg-amber-50 text-amber-800'
                      : 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Instructions / Notes */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Visit Notes & Pick-up Instructions
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Client requested key from society guard, meeting at main gate..."
            className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-amber-500 focus:outline-hidden"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={isSubmitting}
            className="bg-slate-900 text-white hover:bg-slate-800"
          >
            Confirm Site Visit
          </Button>
        </div>
      </form>
    </Modal>
  );
}
