'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Phone,
  MessageSquare,
  MapPin,
  Mail,
  Globe,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { CompanySettings } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/modules/auth/auth-context';

export function CompanySettingsForm() {
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [formData, setFormData] = useState({
    companyName: 'Diksha Real Estate',
    logoUrl: '',
    phone: '',
    whatsappNumber: '',
    address: '',
    email: '',
    website: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings/company');
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setSettings(data.settings);
            setFormData({
              companyName: data.settings.company_name || 'Diksha Real Estate',
              logoUrl: data.settings.logo_url || '',
              phone: data.settings.phone || '',
              whatsappNumber: data.settings.whatsapp_number || '',
              address: data.settings.address || '',
              email: data.settings.email || '',
              website: data.settings.website || '',
            });
          }
        }
      } catch (err) {
        console.error('Failed to load company profile:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('bucket', 'company-assets');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload logo image');
      }

      setFormData(prev => ({
        ...prev,
        logoUrl: data.publicUrl || data.filePath,
      }));

      setStatusMessage({
        type: 'success',
        text: 'Logo uploaded successfully. Click Save Changes to apply.',
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Logo upload failed',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      setIsSaving(true);
      setStatusMessage(null);

      const res = await fetch('/api/settings/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save changes');
      }

      setSettings(data.settings);
      setStatusMessage({
        type: 'success',
        text: 'Diksha Real Estate profile updated successfully.',
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save settings',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-500">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Company Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Official company branding, communications, and registered address for Diksha Real Estate
        </p>
      </div>

      {!isAdmin && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-xs font-medium text-amber-900">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            You are viewing this page in read-only mode. Only Administrators have permission to modify company profile details.
          </span>
        </div>
      )}

      {statusMessage && (
        <div
          className={`flex items-center gap-2 rounded-lg border p-4 text-sm font-medium ${
            statusMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Branding & Logo */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Agency Identity</CardTitle>
              <CardDescription>
                Company branding, official trade name, and portal logo
              </CardDescription>
            </div>
          </CardHeader>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Company Name *
              </label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                value={formData.companyName}
                onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="Diksha Real Estate"
              />
            </div>

            {/* Logo Upload Section */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">
                Company Logo (Stored in Supabase Storage)
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                  {formData.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={formData.logoUrl}
                      alt="Company Logo Preview"
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <Building2 className="h-8 w-8 text-slate-400" />
                  )}
                </div>

                {isAdmin && (
                  <div className="flex-1">
                    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer">
                      <Upload className="h-3.5 w-3.5 text-slate-500" />
                      <span>{isUploading ? 'Uploading...' : 'Upload New Logo'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      Recommended: PNG, SVG, or WEBP with transparent background. Max 5MB.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Contact Coordinates */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Contact & Official Channels</CardTitle>
              <CardDescription>
                Primary telephone lines and official customer touchpoints
              </CardDescription>
            </div>
          </CardHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Official Phone Number
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Phone className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="tel"
                  disabled={!isAdmin}
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                WhatsApp Business Number
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                </div>
                <input
                  type="tel"
                  disabled={!isAdmin}
                  value={formData.whatsappNumber}
                  onChange={e => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Official Email
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  disabled={!isAdmin}
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="info@diksharealestate.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Website
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Globe className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="url"
                  disabled={!isAdmin}
                  value={formData.website}
                  onChange={e => setFormData({ ...formData, website: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="https://diksharealestate.com"
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-slate-700">
              Registered Office Address
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute top-3 left-3 flex items-center">
                <MapPin className="h-4 w-4 text-slate-400" />
              </div>
              <textarea
                rows={3}
                disabled={!isAdmin}
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="Level 8, Supreme Chambers, Andheri West, Mumbai, Maharashtra 400053"
              />
            </div>
          </div>
        </Card>

        {isAdmin && (
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="submit"
              variant="gold"
              isLoading={isSaving}
            >
              Save Company Settings
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
