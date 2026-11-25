'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, LogOut, ShieldCheck, User, Loader2, Database } from 'lucide-react';
import { UserRole } from '@/lib/supabase/types';
import { createClient } from '@/lib/supabase/client';
import { useDemoData } from '@/modules/demo/demo-data-context';

interface TopbarProps {
  userName: string;
  userEmail?: string;
  userRole: UserRole;
  onMenuToggle: () => void;
}

export function Topbar({
  userName,
  userEmail,
  userRole,
  onMenuToggle,
}: TopbarProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { showDemoData, setShowDemoData } = useDemoData();

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {}
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout error:', err);
      window.location.href = '/login';
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 border border-amber-300">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-700" />
            Super Admin
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-slate-700">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
            Admin
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 border border-slate-300">
            <User className="h-3.5 w-3.5 text-slate-500" />
            Employee
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xs sm:px-6">
      {/* Left: Mobile Toggle & Context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden sm:flex sm:flex-col">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Diksha Real Estate
          </span>
          <span className="text-sm font-medium text-slate-600">
            Operations & Management Portal
          </span>
        </div>
      </div>

      {/* Right: User identity, Role badge, Demo Switch & Logout action */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Global Demo Mode Toggle */}
        {userRole !== 'employee' && (
          <label
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer transition-all shadow-2xs select-none ${
              showDemoData
                ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100/70'
                : 'border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            }`}
            title={
              showDemoData
                ? 'Demo Showcase Active: displaying full Lucknow demonstration dataset across all modules'
                : 'Live Testing Mode: all demo records hidden, displaying real database data only'
            }
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                showDemoData ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span className="hidden sm:inline">Demo Data:</span>
            <span className={`font-bold ${showDemoData ? 'text-amber-800' : 'text-slate-700'}`}>
              {showDemoData ? 'ON' : 'OFF'}
            </span>
            <input
              type="checkbox"
              checked={showDemoData}
              onChange={(e) => setShowDemoData(e.target.checked)}
              className="sr-only"
            />
          </label>
        )}

        <div className="flex items-center gap-2.5 text-right">
          <div className="hidden text-right md:block">
            <p className="text-sm font-semibold text-slate-900 leading-tight">
              {userName || 'User'}
            </p>
            {userEmail && (
              <p className="text-xs text-slate-500 line-clamp-1">{userEmail}</p>
            )}
          </div>
          {getRoleBadge(userRole)}
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-red-700 hover:border-red-200 transition-colors disabled:opacity-50"
          title="Sign out of Diksha CRM"
        >
          {isLoggingOut ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
