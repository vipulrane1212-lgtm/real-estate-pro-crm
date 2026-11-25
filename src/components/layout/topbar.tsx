'use client';

import React, { useState } from 'react';
import { Menu, LogOut, ShieldCheck, User, Loader2 } from 'lucide-react';
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
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-amber-900 border border-amber-300 whitespace-nowrap">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-700 shrink-0" />
            <span>Super Admin</span>
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-amber-400 border border-slate-700 whitespace-nowrap">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>Admin</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] sm:text-xs font-medium text-slate-700 border border-slate-300 whitespace-nowrap">
            <User className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span>Employee</span>
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 flex min-h-14 sm:h-16 w-full items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur-xs sm:px-6">
      {/* Left: Mobile Toggle & Context */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onMenuToggle}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 lg:hidden cursor-pointer"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Compact mobile brand title */}
        <div className="flex flex-col sm:hidden min-w-0">
          <span className="text-xs font-bold tracking-tight text-slate-900 truncate">
            Diksha CRM
          </span>
          <span className="text-[10px] font-medium text-amber-700 truncate">
            {userName || 'Agent'}
          </span>
        </div>

        {/* Desktop context title */}
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
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Global Demo Mode Toggle */}
        {userRole !== 'employee' && (
          <label
            className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-full border px-2.5 sm:px-3 min-h-[34px] py-1 text-[11px] sm:text-xs font-semibold cursor-pointer transition-all shadow-2xs select-none whitespace-nowrap ${
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
              className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                showDemoData ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span className="hidden sm:inline">Demo Data:</span>
            <span className="sm:hidden">Demo:</span>
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

        <div className="hidden sm:block h-6 w-px bg-slate-200" />

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-red-700 hover:border-red-200 transition-colors disabled:opacity-50 cursor-pointer"
          title="Sign out of Diksha CRM"
          aria-label="Logout"
        >
          {isLoggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
