'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  BellRing,
  Phone,
  Clock,
  CheckCircle,
  Volume2,
  VolumeX,
  MapPin,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OverdueFollowUp {
  id: string;
  lead_id: string;
  scheduled_at: string;
  follow_up_type: string;
  remarks: string | null;
  overdue_minutes: number;
  lead: {
    id: string;
    full_name: string;
    phone: string;
    status: string;
    location: string | null;
    requirement: string | null;
    lead_type: string | null;
  };
  employee?: {
    profile?: {
      full_name: string;
    };
  };
}

export function FollowUpAlarmOverlay() {
  const [reminders, setReminders] = useState<OverdueFollowUp[]>([]);
  const [activeReminder, setActiveReminder] = useState<OverdueFollowUp | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [outcomeNote, setOutcomeNote] = useState('');
  const [showCompleteForm, setShowCompleteForm] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Play a loud synthetic pulsing alarm chime via Web Audio API (zero external mp3 needed)
  const playAlarmTone = () => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      // Dual-tone urgent alert pattern (800Hz / 1000Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.setValueAtTime(660, now + 0.15);
      osc1.frequency.setValueAtTime(880, now + 0.3);

      osc2.frequency.setValueAtTime(990, now);
      osc2.frequency.setValueAtTime(770, now + 0.15);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);
    } catch (e) {
      console.warn('Audio playback not permitted yet (user interaction required):', e);
    }
  };

  const checkReminders = async () => {
    try {
      const res = await fetch('/api/follow-ups/reminders');
      if (res.ok) {
        const json = await res.json();
        const list: OverdueFollowUp[] = json.reminders || [];
        setReminders(list);
        if (list.length > 0) {
          setActiveReminder(list[0]);
        } else {
          setActiveReminder(null);
        }
      }
    } catch (err) {
      console.error('Error polling follow-up reminders:', err);
    }
  };

  // Poll for reminders every 20 seconds
  useEffect(() => {
    checkReminders();
    const interval = setInterval(checkReminders, 20000);
    return () => clearInterval(interval);
  }, []);

  // Alarm sound interval when active reminder is visible
  useEffect(() => {
    if (activeReminder && !isMuted) {
      playAlarmTone();
      audioIntervalRef.current = setInterval(playAlarmTone, 4000);
    } else {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
        audioIntervalRef.current = null;
      }
    }

    return () => {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
        audioIntervalRef.current = null;
      }
    };
  }, [activeReminder, isMuted]);

  const handleSnooze = async (minutes: number) => {
    if (!activeReminder) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/follow-ups/${activeReminder.id}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes }),
      });
      if (res.ok) {
        setActiveReminder(null);
        checkReminders();
      }
    } catch (err) {
      console.error('Failed to snooze:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!activeReminder) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/follow-ups/${activeReminder.id}/acknowledge`, {
        method: 'POST',
      });
      if (res.ok) {
        setActiveReminder(null);
        checkReminders();
      }
    } catch (err) {
      console.error('Failed to acknowledge:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!activeReminder) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/follow-ups/${activeReminder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          outcome: outcomeNote.trim() || 'Completed via follow-up alarm',
        }),
      });
      if (res.ok) {
        setActiveReminder(null);
        setShowCompleteForm(false);
        setOutcomeNote('');
        checkReminders();
      }
    } catch (err) {
      console.error('Failed to mark complete:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  if (!activeReminder) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-white border-2 border-amber-500 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Urgent Flashing Header */}
        <div className="bg-gradient-to-r from-red-600 via-amber-600 to-amber-700 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-full animate-bounce">
              <BellRing className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider bg-white/25 px-2 py-0.5 rounded-full">
                  OVERDUE REMINDER
                </span>
                <span className="text-xs text-amber-100">
                  {reminders.length > 1 ? `1 of ${reminders.length} overdue` : 'Immediate Attention'}
                </span>
              </div>
              <h2 className="text-lg font-bold mt-0.5 leading-snug">
                Follow-up with {activeReminder.lead?.full_name || 'Client'}
              </h2>
            </div>
          </div>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer"
            title={isMuted ? 'Unmute Alarm' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5 animate-pulse" />}
          </button>
        </div>

        {/* Client & Overdue Details */}
        <div className="p-6 space-y-4">
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-medium">Scheduled Time:</span>
              <span className="font-bold text-slate-900">
                {new Date(activeReminder.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(activeReminder.scheduled_at).toLocaleDateString()})
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-medium">Overdue By:</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                <Clock className="h-3 w-3 mr-1" />
                {activeReminder.overdue_minutes} minutes
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-medium">Client Mobile:</span>
              <a
                href={`tel:${activeReminder.lead?.phone}`}
                className="font-bold text-amber-700 hover:underline inline-flex items-center gap-1"
              >
                <Phone className="h-3.5 w-3.5" />
                {activeReminder.lead?.phone}
              </a>
            </div>

            {activeReminder.lead?.location && (
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Location:</span>
                <span className="text-slate-700 font-medium">{activeReminder.lead.location}</span>
              </div>
            )}

            {activeReminder.remarks && (
              <div className="pt-2 border-t border-amber-200/60 text-xs">
                <span className="font-semibold text-slate-700">Remark / Notes:</span>
                <p className="text-slate-600 italic mt-0.5">"{activeReminder.remarks}"</p>
              </div>
            )}
          </div>

          {/* Complete form toggle */}
          {showCompleteForm ? (
            <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-semibold text-slate-700">
                Call Outcome / Notes:
              </label>
              <textarea
                rows={2}
                value={outcomeNote}
                onChange={(e) => setOutcomeNote(e.target.value)}
                placeholder="Spoke with client, site visit scheduled for tomorrow..."
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCompleteForm(false)}
                  disabled={isActionLoading}
                >
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={handleComplete}
                  disabled={isActionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Confirm Complete
                </Button>
              </div>
            </div>
          ) : null}

          {/* Action Buttons Grid */}
          {!showCompleteForm && (
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`tel:${activeReminder.lead?.phone}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-3 text-sm font-semibold transition-colors shadow-sm"
                >
                  <Phone className="h-4 w-4 text-emerald-400" />
                  Call Now
                </a>

                <Button
                  onClick={() => setShowCompleteForm(true)}
                  disabled={isActionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-semibold text-sm shadow-sm"
                >
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  Mark Complete
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => handleSnooze(5)}
                  disabled={isActionLoading}
                  className="text-xs border-slate-300 hover:bg-amber-50 text-slate-700"
                >
                  Snooze 5m
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSnooze(10)}
                  disabled={isActionLoading}
                  className="text-xs border-slate-300 hover:bg-amber-50 text-slate-700"
                >
                  Snooze 10m
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleAcknowledge}
                  disabled={isActionLoading}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Dismiss / Ack
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
