'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { CallOutcome } from '@/lib/supabase/types';
import { Phone, PhoneCall, Clock, CheckCircle2, AlertCircle, Upload, Play, Mic, Info } from 'lucide-react';

interface LogCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  leadId: string;
  clientName: string;
  clientPhone: string;
}

const OUTCOMES: { id: CallOutcome; label: string; color: string }[] = [
  { id: 'connected', label: 'Connected / Answered', color: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
  { id: 'not_answered', label: 'Not Answered / Ringing', color: 'border-amber-300 bg-amber-50 text-amber-800' },
  { id: 'busy', label: 'Busy / Line In Use', color: 'border-blue-300 bg-blue-50 text-blue-800' },
  { id: 'wrong_number', label: 'Wrong Number / Invalid', color: 'border-red-300 bg-red-50 text-red-800' },
];

export function LogCallModal({
  isOpen,
  onClose,
  onSuccess,
  leadId,
  clientName,
  clientPhone,
}: LogCallModalProps) {
  const [outcome, setOutcome] = useState<CallOutcome>('connected');
  const [durationMinutes, setDurationMinutes] = useState('2');
  const [durationSeconds, setDurationSeconds] = useState('30');
  const [notes, setNotes] = useState('');
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
  const [uploadedRecordingUrl, setUploadedRecordingUrl] = useState<string | null>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setOutcome('connected');
      setDurationMinutes('2');
      setDurationSeconds('30');
      setNotes('');
      setRecordingFile(null);
      setUploadedRecordingUrl(null);
      setErrorMessage('');
    }
  }, [isOpen]);

  const handleAudioUpload = async (file: File) => {
    setIsUploadingAudio(true);
    setErrorMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'call-recordings');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload audio recording');

      setUploadedRecordingUrl(data.publicUrl);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Failed to upload audio recording');
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const totalSeconds =
        outcome === 'connected'
          ? (parseInt(durationMinutes, 10) || 0) * 60 + (parseInt(durationSeconds, 10) || 0)
          : 0;

      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          outcome,
          duration_seconds: totalSeconds,
          client_phone: clientPhone,
          notes: notes.trim(),
          recording_url: uploadedRecordingUrl || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save call log');

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Client Phone Call"
      description={`Record call details and notes for ${clientName}.`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Quick Click-to-Dial Banner */}
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white">
              <PhoneCall className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-950">{clientName}</p>
              <p className="font-mono text-xs text-emerald-700">{clientPhone}</p>
            </div>
          </div>

          <a
            href={`tel:${clientPhone}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-emerald-700 transition"
          >
            <Phone className="h-3.5 w-3.5" /> Dial Client
          </a>
        </div>

        {/* Telephony Notice (Honest limit explanation) */}
        <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-600">
          <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
          <span>
            Clicking <strong>Dial Client</strong> initiates a mobile/browser call. Live in-app VoIP auto-recording requires Twilio or Exotel provider API keys.
          </span>
        </div>

        {/* Call Outcome Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
            Call Outcome <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {OUTCOMES.map((oc) => (
              <button
                key={oc.id}
                type="button"
                onClick={() => setOutcome(oc.id)}
                className={`rounded-lg border p-2.5 text-left text-xs font-medium transition cursor-pointer ${
                  outcome === oc.id
                    ? `${oc.color} ring-2 ring-slate-900/10 shadow-xs`
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {oc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Duration (if connected) */}
        {outcome === 'connected' && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              Call Duration
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="w-16 rounded border border-slate-300 bg-white px-2 py-1 text-center text-xs focus:outline-hidden"
                />
                <span className="text-xs text-slate-500">mins</span>
              </div>
              <span className="text-slate-400">:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(e.target.value)}
                  className="w-16 rounded border border-slate-300 bg-white px-2 py-1 text-center text-xs focus:outline-hidden"
                />
                <span className="text-xs text-slate-500">secs</span>
              </div>
            </div>
          </div>
        )}

        {/* Call Notes */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Call Discussion Notes
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Key discussion points, budget updates, property requirements..."
            className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
          />
        </div>

        {/* Audio Recording Attachment (Stored Locally) */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
            <span>Call Audio Recording (Optional)</span>
            <span className="text-[10px] text-slate-400 font-normal">Stored locally</span>
          </label>

          {uploadedRecordingUrl ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5 text-xs">
              <span className="text-emerald-800 font-medium">Recording attached</span>
              <audio controls src={uploadedRecordingUrl} className="h-8 sm:h-7 w-full sm:w-48" />
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-600 hover:border-amber-500 hover:bg-amber-50/20 transition">
              <Upload className="h-4 w-4 text-slate-400" />
              <span>{isUploadingAudio ? 'Uploading audio...' : 'Attach call recording (.mp3, .wav, .m4a)'}</span>
              <input
                type="file"
                accept="audio/*"
                disabled={isUploadingAudio}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setRecordingFile(f);
                    handleAudioUpload(f);
                  }
                }}
                className="hidden"
              />
            </label>
          )}
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
            Save Call Log
          </Button>
        </div>
      </form>
    </Modal>
  );
}
