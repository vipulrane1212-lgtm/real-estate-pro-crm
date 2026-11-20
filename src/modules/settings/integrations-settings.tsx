'use client';

import React, { useState, useEffect } from 'react';
import {
  Share2,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Key,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface IntegrationInfo {
  provider: string;
  name: string;
  connected: boolean;
  status: 'connected' | 'not_configured';
  webhookUrl: string;
  requiredEnv: string[];
  verifyTokenEnv?: string;
  instructions: string;
  lastSyncedAt?: string;
}

export function IntegrationsSettings() {
  const [integrations, setIntegrations] = useState<IntegrationInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [housingSyncing, setHousingSyncing] = useState(false);
  const [housingSyncResult, setHousingSyncResult] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/integrations/status');
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations || []);
      }
    } catch (e) {
      console.error('Failed to load integrations status', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleHousingSync = async () => {
    setHousingSyncing(true);
    setHousingSyncResult(null);
    try {
      const res = await fetch('/api/integrations/housing/sync', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setHousingSyncResult(`Synced ${data.syncedCount || 0} leads successfully.`);
      } else {
        setHousingSyncResult(`Notice: ${data.message || data.error || 'Housing API not configured'}`);
      }
    } catch {
      setHousingSyncResult('Error connecting to sync service');
    } finally {
      setHousingSyncing(false);
      await fetchStatus();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Lead Channel Integrations
            </h1>
            <Badge variant="gold" className="text-[10px]">
              Phase 7 Inflow
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Automate lead capture from Meta Ads, Housing.com, Google Ads, WhatsApp, and Instagram
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchStatus}
          isLoading={isRefreshing}
          className="gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Status
        </Button>
      </div>

      {/* Info Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-950">Webhook Signatures & Credentials Security</h4>
            <p className="mt-1 leading-relaxed text-amber-900">
              All inbound webhooks enforce SHA256 HMAC verification to prevent spoofed payloads. Set credentials in your <code>.env.local</code> file. When running locally, use a tunnel like <code>ngrok</code> or test endpoints with sample payloads.
            </p>
          </div>
        </div>
      </div>

      {/* Integrations List */}
      {isLoading ? (
        <div className="py-20 text-center text-sm text-slate-500">
          Checking integration channels...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {integrations.map((item) => (
            <Card key={item.provider} className="overflow-hidden">
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold text-slate-900">{item.name}</h3>
                    {item.connected ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        <XCircle className="h-3 w-3 text-slate-400" /> Not Configured
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{item.instructions}</p>
                </div>

                {item.provider === 'housing' && (
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      onClick={handleHousingSync}
                      isLoading={housingSyncing}
                      className="bg-slate-900 text-white hover:bg-slate-800 text-xs"
                    >
                      Trigger Housing Sync
                    </Button>
                    {housingSyncResult && (
                      <span className="text-[11px] font-medium text-slate-600">
                        {housingSyncResult}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Webhook Endpoint Box */}
              <div className="border-t border-slate-100 bg-slate-50/70 p-5 space-y-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Webhook Endpoint URL
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 overflow-x-auto select-all">
                      {item.webhookUrl}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy(item.webhookUrl, item.provider + '-url')}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                    >
                      {copiedKey === item.provider + '-url' ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-slate-500" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Required Environment Variables */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Required Environment Variables
                  </label>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {item.requiredEnv.map((envVar) => (
                      <span
                        key={envVar}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-700 shadow-2xs"
                      >
                        {envVar}
                      </span>
                    ))}
                    {item.verifyTokenEnv && (
                      <span className="rounded-md border border-amber-200 bg-amber-50/80 px-2 py-1 font-mono text-xs text-amber-800 shadow-2xs">
                        {item.verifyTokenEnv}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}