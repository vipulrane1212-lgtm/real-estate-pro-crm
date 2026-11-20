'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { FollowUpType } from '@/lib/supabase/types';
import { Calendar, Clock, Phone, MapPin, MessageSquare, Users, Bell } from 'lucide-react';

interface CreateFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialLeadId?: string;
  initialLeadName?: string;
  leads?: Array<{ id: string; full_name: string; phone: string }>;
  employees?: Array<{ id: string; profile?: { full_name: string } }>;
}

const FOLLOW_UP_TYPES: { id: FollowUpType; label: string; icon: React.ElementType }[] = [
  { id: 'call', label: 'Phone Call', icon: Phone },
  { id: 'visit', label: 'Site Visit', icon: MapPin },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { id: 'meeting', label: 'Office Meeting', icon: Users },
];

export function CreateFollowUpModal({
  isOpen,
  onClose,
  onSuccess,
  initialLeadId,
  initialLeadName,
  leads = [],
  employees = [],
}: CreateFollowUpModalProps) {
  const [leadId, setLeadId] = useState(initialLeadId || '');
  const [followUpType, setFollowUpType] = useState<FollowUpType>('call');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('11:00');
  const [remarks, setRemarks] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [setReminder, setSetReminder] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialLeadId) setLeadId(initialLeadId);
      // Default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(tomorrow.toISOString().split('T')[0]);
      setTime('11:00');
      setRemarks('');
      setErrorMessage('');
    }
  }, [isOpen, initialLeadId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId) {
      setErrorMessage('Please select a client lead');
      return;
    }
    if (!date || !time) {
      setErrorMessage('Please specify scheduled date and time');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
      const reminderAt = setReminder
        ? new Date(new Date(`${date}T${time}:00`).getTime() - 15 * 60000).toISOString()
        : null;

      const res = await fetch('/api/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          scheduledAt,
          followUpType,
          remarks,
          assignedTo: assignedTo || null,
          reminderAt,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to schedule follow-up');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error creating follow-up');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialLeadName ? `Schedule Follow-up: ${initialLeadName}` : 'Schedule New Follow-up'}
      description="Set a task, reminder, or meeting for client engagement."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Lead Selection if not preselected */}
        {!initialLeadId && (
          <div>
            <label className="block text-xs font-semibold text-slate-700">Select Client / Lead *</label>
            <select
              required
              value={leadId}
              onChange={e => setLeadId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden bg-white"
            >
              <option value="">-- Choose Lead --</option>
              {leads.map(lead => (
                <option key={lead.id} value={lead.id}>
                  {lead.full_name} ({lead.phone})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Follow-up Type Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Action Type *</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {FOLLOW_UP_TYPES.map(t => {
              const Icon = t.icon;
              const isSelected = followUpType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFollowUpType(t.id)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition-colors ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`h-4 w-4 mb-1 ${isSelected ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scheduled Date & Time */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Scheduled Date *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              Scheduled Time *
            </label>
            <input
              type="time"
              required
              value={time}
              onChange={e => setTime(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Assign To (optional override) */}
        {employees.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-slate-700">Assign To Agent</label>
            <select
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden bg-white"
            >
              <option value="">Default (Lead Owner or Self)</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.profile?.full_name || 'Agent'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Remarks / Agenda */}
        <div>
          <label className="block text-xs font-semibold text-slate-700">Notes / Agenda</label>
          <textarea
            rows={2}
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
            placeholder="e.g. Call to discuss budget flexibility for 2 BHK in Oberoi Springs"
          />
        </div>

        {/* Alarm Reminder Checkbox */}
        <div className="flex items-center gap-2 rounded-lg border border-amber-200/60 bg-amber-50/40 p-2.5">
          <input
            type="checkbox"
            id="setReminder"
            checked={setReminder}
            onChange={e => setSetReminder(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
          />
          <label htmlFor="setReminder" className="text-xs font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer">
            <Bell className="h-3.5 w-3.5 text-amber-600" />
            Set automated notification reminder 15 minutes before
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            Schedule Follow-up
          </Button>
        </div>
      </form>
    </Modal>
  );
}
