'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarClock,
  MapPin,
  FileText,
  PhoneCall,
  MessageSquare,
  UserCheck,
  Percent,
  Receipt,
  BarChart3,
  Settings,
  X,
  Building,
} from 'lucide-react';
import { UserRole } from '@/lib/supabase/types';

interface SidebarProps {
  userRole?: UserRole;
  isOpen: boolean;
  onClose: () => void;
  companyName?: string;
  logoUrl?: string | null;
}

export function Sidebar({
  userRole = 'employee',
  isOpen,
  onClose,
  companyName = 'Diksha Real Estate',
  logoUrl,
}: SidebarProps) {
  const pathname = usePathname();

  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Leads', href: '/leads', icon: Users, badge: 'Phase 2' },
    { name: 'Properties', href: '/properties', icon: Building2, badge: 'Phase 2' },
    { name: 'Follow-ups', href: '/follow-ups', icon: CalendarClock, badge: 'Phase 2' },
    { name: 'Site Visits', href: '/site-visits', icon: MapPin, badge: 'Phase 2' },
    { name: 'Documents', href: '/documents', icon: FileText, badge: 'Phase 2' },
    { name: 'Calls', href: '/calls', icon: PhoneCall, badge: 'Phase 2' },
    { name: 'WhatsApp', href: '/whatsapp', icon: MessageSquare, badge: 'Phase 2' },
    { name: 'Employees', href: '/employees', icon: UserCheck, adminOnly: true },
    { name: 'Brokerage', href: '/brokerage', icon: Percent, badge: 'Phase 2' },
    { name: 'Accounts', href: '/accounts', icon: Receipt, badge: 'Phase 2' },
    { name: 'Reports', href: '/reports', icon: BarChart3, badge: 'Phase 2' },
    { name: 'Settings', href: '/settings', icon: Settings, adminOnly: true },
  ];

  const filteredNav = navigationItems.filter(item => {
    if (item.adminOnly && userRole === 'employee') {
      return false;
    }
    return true;
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-6 bg-[#0f172a]">
          <Link href="/dashboard" className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={companyName}
                className="h-8 w-8 rounded object-contain bg-white p-0.5"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40">
                <Building className="h-5 w-5" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-white line-clamp-1">
                {companyName}
              </span>
              <span className="text-[10px] font-medium tracking-wider text-amber-400 uppercase">
                Real Estate CRM
              </span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="px-2 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Main Menu
          </div>
          <nav className="space-y-1">
            {filteredNav.map(item => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => onClose()}
                  className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#0f172a] text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-[#0f172a]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-amber-400'
                          : 'text-slate-400 group-hover:text-[#0f172a]'
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        isActive
                          ? 'bg-amber-400/20 text-amber-300'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* System & Brand Footer */}
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <div className="rounded-lg border border-amber-200/80 bg-amber-50/60 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Phase 1 Active
            </div>
            <p className="mt-1 text-[11px] text-amber-800/80 leading-relaxed">
              Auth, Security, RBAC & Core Architecture. Phase 2 modules are mapped.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
