'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  RefreshCw,
  Send,
  Sparkles,
  Phone,
  User,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { WhatsAppMessage } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { WhatsAppModal } from './whatsapp-modal';

export function WhatsAppManagement() {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [leads, setLeads] = useState<Array<{ id: string; full_name: string; phone: string; location?: string; requirement?: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Modal
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [selectedLeadForWhatsApp, setSelectedLeadForWhatsApp] = useState<{
    id: string;
    name: string;
    phone: string;
    location?: string;
    requirement?: string;
  } | null>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/whatsapp');
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error('Failed to load WhatsApp messages', e);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads');
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (e) {
      console.error('Failed to load leads list', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchMessages(), fetchLeads()]);
      setIsLoading(false);
    };
    init();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchMessages();
    setIsRefreshing(false);
  };

  const filteredMessages = messages.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.lead?.full_name?.toLowerCase().includes(q) ||
      m.recipient_phone?.toLowerCase().includes(q) ||
      m.message_text?.toLowerCase().includes(q) ||
      m.template_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              WhatsApp Direct Hub
            </h1>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              {messages.length} Messages
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Client message history, template communication, and direct wa.me dispatch
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={isRefreshing}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          {leads.length > 0 && (
            <Button
              size="sm"
              onClick={() => {
                setSelectedLeadForWhatsApp({
                  id: leads[0].id,
                  name: leads[0].full_name,
                  phone: leads[0].phone,
                  location: leads[0].location,
                  requirement: leads[0].requirement,
                });
                setIsWhatsAppModalOpen(true);
              }}
              className="bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5 shadow-xs"
            >
              <Send className="h-4 w-4" /> Send WhatsApp
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by client name, recipient phone, message text..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs shadow-2xs focus:border-emerald-500 focus:outline-hidden"
        />
      </div>

      {/* Messages List */}
      {isLoading ? (
        <div className="py-20 text-center text-sm text-slate-500">
          Loading message history...
        </div>
      ) : filteredMessages.length === 0 ? (
        <EmptyState
          title="No data yet"
          description={
            search
              ? 'No WhatsApp messages match your search filter.'
              : 'WhatsApp messages sent to clients will be logged here and on client profile timelines.'
          }
          icon={MessageSquare}
        />
      ) : (
        <div className="space-y-3">
          {filteredMessages.map((msg) => (
            <div
              key={msg.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:border-emerald-400"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-slate-900">{msg.lead?.full_name || 'Client'}</span>
                    <span className="font-mono text-slate-500">({msg.recipient_phone})</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700 border border-slate-200">
                      {msg.template_name?.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 whitespace-pre-wrap rounded-lg bg-slate-50 p-2.5 border border-slate-100 font-sans">
                    {msg.message_text}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                    <span>Sent by {msg.employee?.profile?.full_name || 'Agent'}</span>
                    <span>•</span>
                    <span>
                      {new Date(msg.created_at).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                </div>

                <a
                  href={`https://wa.me/${msg.recipient_phone}?text=${encodeURIComponent(msg.message_text)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 shrink-0 self-start"
                >
                  <ExternalLink className="h-3 w-3" /> Re-open in WhatsApp
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedLeadForWhatsApp && (
        <WhatsAppModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => {
            setIsWhatsAppModalOpen(false);
            setSelectedLeadForWhatsApp(null);
          }}
          onSuccess={() => {
            fetchMessages();
          }}
          leadId={selectedLeadForWhatsApp.id}
          clientName={selectedLeadForWhatsApp.name}
          clientPhone={selectedLeadForWhatsApp.phone}
          clientLocation={selectedLeadForWhatsApp.location}
          clientRequirement={selectedLeadForWhatsApp.requirement}
        />
      )}
    </div>
  );
}
