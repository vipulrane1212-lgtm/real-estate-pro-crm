'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarClock,
  Menu,
} from 'lucide-react';

interface MobileBottomNavProps {
  onOpenMenu: () => void;
}

/**
 * Sticky thumb-friendly mobile navigation bar visible on < lg screens
 * for both Admin and Employee panels.
 */
export function MobileBottomNav({ onOpenMenu }: MobileBottomNavProps) {
  const pathname = usePathname();

  const items = [
    { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Leads', href: '/leads', icon: Users },
    { name: 'Properties', href: '/properties', icon: Building2 },
    { name: 'Follow-ups', href: '/follow-ups', icon: CalendarClock },
  ];

  return (
    <nav
      aria-label="Mobile primary navigation"
      className="fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md shadow-[0_-4px_16px_rgba(15,23,42,0.06)] lg:hidden pb-safe"
    >
      <div className="grid grid-cols-5 h-15">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold transition-colors ${
                isActive
                  ? 'text-[#0f172a]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div
                className={`flex items-center justify-center rounded-full px-3 py-1 transition-colors ${
                  isActive ? 'bg-amber-100 text-amber-800' : ''
                }`}
              >
                <Icon
                  className={`h-4.5 w-4.5 ${
                    isActive ? 'text-amber-700' : 'text-slate-500'
                  }`}
                />
              </div>
              <span className="truncate max-w-full">{item.name}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
          aria-label="Open full navigation menu"
        >
          <div className="flex items-center justify-center rounded-full px-3 py-1">
            <Menu className="h-4.5 w-4.5 text-slate-600" />
          </div>
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
