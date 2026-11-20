'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Volume2, VolumeX, ShieldAlert, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { ExpiryAlertItem } from '@/app/api/alerts/expiries/route';

export function VoiceAlertAnnouncer() {
  const [activeAlerts, setActiveAlerts] = useState<ExpiryAlertItem[]>([]);
  const [currentBannerAlert, setCurrentBannerAlert] = useState<ExpiryAlertItem | null>(null);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const spokenIdsRef = useRef<Set<string>>(new Set());

  const speakText = (text: string) => {
    if (isVoiceMuted) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel(); // Cancel any lingering speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis failed or blocked by autoplay policy:', e);
      }
    }
  };

  const checkAlerts = async () => {
    try {
      const res = await fetch('/api/alerts/expiries');
      if (res.ok) {
        const json = await res.json();
        const voiceItems: ExpiryAlertItem[] = json.voiceAlerts || [];
        setActiveAlerts(voiceItems);

        // Speak any alert that has not been spoken yet in this session
        for (const item of voiceItems) {
          const alertKey = `${item.id}-${item.days_remaining}`;
          if (!spokenIdsRef.current.has(alertKey)) {
            spokenIdsRef.current.add(alertKey);
            setCurrentBannerAlert(item);
            speakText(item.spoken_text);
            break; // Speak one at a time
          }
        }
      }
    } catch (err) {
      console.error('Error checking agreement expiry alerts:', err);
    }
  };

  useEffect(() => {
    // Initial check after 3 seconds to allow user interaction
    const initialTimer = setTimeout(checkAlerts, 3000);
    // Recurring check every 60 seconds
    const interval = setInterval(checkAlerts, 60000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [isVoiceMuted]);

  if (!currentBannerAlert) return null;

  return (
    <div className="bg-amber-600 text-white px-4 py-2 text-xs flex items-center justify-between shadow-md relative z-40">
      <div className="flex items-center gap-2 max-w-3xl truncate">
        <ShieldAlert className="h-4 w-4 shrink-0 text-amber-100 animate-pulse" />
        <span className="font-bold uppercase tracking-wider bg-amber-700/60 px-1.5 py-0.5 rounded text-[10px]">
          Renewal Alert
        </span>
        <span className="truncate">
          {currentBannerAlert.spoken_text}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/documents"
          className="text-white hover:underline font-semibold inline-flex items-center gap-0.5 ml-2"
        >
          View Expiries <ArrowRight className="h-3 w-3" />
        </Link>

        <button
          onClick={() => setIsVoiceMuted(!isVoiceMuted)}
          className="p-1 hover:bg-amber-700 rounded text-amber-100 hover:text-white"
          title={isVoiceMuted ? 'Unmute voice alerts' : 'Mute voice alerts'}
        >
          {isVoiceMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </button>

        <button
          onClick={() => setCurrentBannerAlert(null)}
          className="p-1 hover:bg-amber-700 rounded text-amber-100 hover:text-white"
          title="Dismiss banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
