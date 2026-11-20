'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { WhatsAppTemplateName } from '@/lib/supabase/types';
import { MessageSquare, Send, Sparkles, AlertCircle, Info, ExternalLink } from 'lucide-react';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  leadId: string;
  clientName: string;
  clientPhone: string;
  clientLocation?: string;
  clientRequirement?: string;
}

const TEMPLATES: {
  id: WhatsAppTemplateName;
  title: string;
  description: string;
  generateText: (name: string, location?: string, req?: string) => string;
}[] = [
  {
    id: 'intro',
    title: 'Initial Introduction',
    description: 'Welcome new lead and introduce Diksha Real Estate services',
    generateText: (name) =>
      `Namaste ${name},\n\nThank you for reaching out to *Diksha Real Estate*. I am your dedicated relationship manager. I would love to understand your property requirements and assist you in finding the ideal property.\n\nWhen would be a convenient time for a quick call?\n\nWarm regards,\n*Diksha Real Estate*`,
  },
  {
    id: 'property_share',
    title: 'Property Recommendation',
    description: 'Share a matched property listing and specs',
    generateText: (name, loc, req) =>
      `Dear ${name},\n\nBased on your requirement for *${req || 'a verified property'}* in *${loc || 'prime areas'}*, we have shortlisted a premium verified listing matching your budget.\n\nWould you like me to share the brochure, floor plan, and walkthrough video?\n\nBest regards,\n*Diksha Real Estate*`,
  },
  {
    id: 'site_visit_reminder',
    title: 'Site Visit Confirmation',
    description: 'Confirm and remind client about scheduled inspection',
    generateText: (name, loc) =>
      `Hello ${name},\n\nThis is a friendly reminder regarding your scheduled site visit with *Diksha Real Estate* for tomorrow. Our executive will be on site to show you the property and answer any questions.\n\nPlease feel free to let us know if you need location directions or any timing adjustment.\n\nLooking forward to seeing you!`,
  },
  {
    id: 'follow_up',
    title: 'Quick Follow-up',
    description: 'Follow-up on previous discussion or quotation',
    generateText: (name, loc) =>
      `Hello ${name},\n\nFollowing up on our recent discussion regarding your property requirements in *${loc || 'the city'}*. Have you had a chance to review the details we discussed?\n\nHappy to answer any questions or arrange a property visit at your convenience.\n\nRegards,\n*Diksha Real Estate*`,
  },
  {
    id: 'festival_greeting',
    title: 'Festive Greeting',
    description: 'Warm wishes on festivals and special occasions',
    generateText: (name) =>
      `Dear ${name},\n\nWishing you and your family abundant joy, prosperity, and success from the entire team at *Diksha Real Estate*! May this season bring new beginnings and happiness to your home.`,
  },
  {
    id: 'custom',
    title: 'Custom Message',
    description: 'Write an open custom WhatsApp message',
    generateText: (name) => `Hello ${name},\n\n`,
  },
];

export function WhatsAppModal({
  isOpen,
  onClose,
  onSuccess,
  leadId,
  clientName,
  clientPhone,
  clientLocation,
  clientRequirement,
}: WhatsAppModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplateName>('intro');
  const [messageText, setMessageText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      const tpl = TEMPLATES.find((t) => t.id === 'intro') || TEMPLATES[0];
      setSelectedTemplate('intro');
      setMessageText(tpl.generateText(clientName, clientLocation, clientRequirement));
      setErrorMessage('');
    }
  }, [isOpen, clientName, clientLocation, clientRequirement]);

  const handleTemplateSelect = (tId: WhatsAppTemplateName) => {
    setSelectedTemplate(tId);
    const tpl = TEMPLATES.find((t) => t.id === tId);
    if (tpl) {
      setMessageText(tpl.generateText(clientName, clientLocation, clientRequirement));
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) {
      setErrorMessage('Message text cannot be empty');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          template_name: selectedTemplate,
          message_text: messageText.trim(),
          recipient_phone: clientPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record WhatsApp message');

      // Open WhatsApp chat in a new browser tab
      if (data.waMeUrl) {
        window.open(data.waMeUrl, '_blank', 'noopener,noreferrer');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Failed to process WhatsApp message');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Direct WhatsApp Messaging"
      description={`Send customized messages to ${clientName} (${clientPhone}) and log to client timeline.`}
      maxWidth="lg"
    >
      <form onSubmit={handleSend} className="space-y-4">
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Templates Picker */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            Select Message Template
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTemplateSelect(t.id)}
                className={`rounded-lg border p-2 text-left transition cursor-pointer ${
                  selectedTemplate === t.id
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20 font-medium'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-semibold">{t.title}</div>
                <div className="text-[10px] text-slate-500 line-clamp-1">{t.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Message Editor */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Message Preview & Customization
          </label>
          <textarea
            rows={7}
            required
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-3 text-xs font-sans text-slate-900 focus:border-emerald-500 focus:outline-hidden"
            placeholder="Type your message here..."
          />
        </div>

        {/* Transparent Capability Notice */}
        <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-600">
          <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
          <span>
            This opens an active WhatsApp conversation with pre-filled text and permanently logs the message to the client profile. Automated background sending requires Meta WhatsApp Business Cloud API keys.
          </span>
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
            className="bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5 shadow-xs"
          >
            <Send className="h-3.5 w-3.5" /> Open & Send in WhatsApp
          </Button>
        </div>
      </form>
    </Modal>
  );
}
