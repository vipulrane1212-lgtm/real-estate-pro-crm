'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { SiteVisit, SiteVisitStatus, SiteVisitFeedback } from '@/lib/supabase/types';
import { CheckCircle2, XCircle, AlertCircle, MessageSquare } from 'lucide-react';

interface CompleteVisitModalProps {
  visit: SiteVisit | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CompleteVisitModal({
  visit,
  isOpen,
  onClose,
  onSuccess,
}: CompleteVisitModalProps) {
  const [status, setStatus] = useState<SiteVisitStatus>('completed');
  const [feedback, setFeedback] = useState<SiteVisitFeedback>('interested');
  const [outcomeNote, setOutcomeNote] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !visit) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload: Record<string, unknown> = { status };
      if (status === 'completed') {
        payload.feedback = feedback;
        payload.outcome_note = outcomeNote.trim() || null;
      } else {
        payload.cancellation_reason = cancellationReason.trim() || null;
      }

      const res = await fetch(`/api/site-visits/${visit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update visit status');

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Failed to complete visit');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Site Visit Status"
      description={`Record outcome for ${visit.lead?.full_name || 'Client'} at ${visit.property?.title || 'Property'}.`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Status Selection */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
            Inspection Outcome
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setStatus('completed')}
              className={`rounded-lg border p-2 text-center text-xs font-medium transition cursor-pointer ${
                status === 'completed'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              Completed
            </button>
            <button
              type="button"
              onClick={() => setStatus('no_show')}
              className={`rounded-lg border p-2 text-center text-xs font-medium transition cursor-pointer ${
                status === 'no_show'
                  ? 'border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              No-show
            </button>
            <button
              type="button"
              onClick={() => setStatus('cancelled')}
              className={`rounded-lg border p-2 text-center text-xs font-medium transition cursor-pointer ${
                status === 'cancelled'
                  ? 'border-red-500 bg-red-50 text-red-800 ring-2 ring-red-500/20'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              Cancelled
            </button>
          </div>
        </div>

        {status === 'completed' ? (
          <>
            {/* Feedback Option */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Client Property Feedback
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'interested', label: 'Interested', color: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
                  { id: 'negotiating', label: 'Negotiating', color: 'border-amber-500 bg-amber-50 text-amber-800' },
                  { id: 'not_interested', label: 'Not Interested', color: 'border-slate-400 bg-slate-100 text-slate-800' },
                ].map((fb) => (
                  <button
                    key={fb.id}
                    type="button"
                    onClick={() => setFeedback(fb.id as SiteVisitFeedback)}
                    className={`rounded-lg border py-2 text-center text-xs font-medium transition cursor-pointer ${
                      feedback === fb.id ? fb.color : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {fb.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Outcome Note */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Outcome & Discussion Summary
              </label>
              <textarea
                rows={3}
                required
                value={outcomeNote}
                onChange={(e) => setOutcomeNote(e.target.value)}
                placeholder="e.g. Client loved the master bedroom, requested floor plan and payment plan details..."
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
          </>
        ) : (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Cancellation / No-Show Reason
            </label>
            <textarea
              rows={3}
              required
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="e.g. Client rescheduled due to emergency, car breakdown..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-amber-500 focus:outline-hidden"
            />
          </div>
        )}

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
            Save Outcome
          </Button>
        </div>
      </form>
    </Modal>
  );
}
