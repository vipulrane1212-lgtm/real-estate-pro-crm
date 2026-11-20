'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify credentials.');
      }

      // Successfully authenticated: navigate directly to dashboard
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Unable to connect to CRM authentication service.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
      {/* Brand Header */}
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0f172a] text-amber-400 shadow-md ring-4 ring-amber-500/10">
          <Building className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Diksha Real Estate
        </h2>
        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-amber-700">
          Enterprise CRM & Operations Portal
        </p>
      </div>

      {/* Login Card */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h3 className="text-base font-semibold text-slate-900">Sign in to your account</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter your agent credentials to access client pipelines and inventory.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Corporate Email Address
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] focus:outline-hidden"
                placeholder="agent@diksharealestate.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Password
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] focus:outline-hidden"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full justify-center bg-[#0f172a] hover:bg-[#1e293b]"
              isLoading={isLoading}
            >
              Sign In <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-4 text-center">
          <p className="text-[11px] text-slate-500">
            Protected by Supabase Auth with Row Level Security (RLS).
          </p>
        </div>
      </div>
    </div>
  );
}
