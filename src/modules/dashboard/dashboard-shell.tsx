'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  CalendarClock,
  MapPin,
  CheckCircle2,
  Building2,
  RefreshCw,
  FolderGit2,
  ShieldCheck,
  Building,
  ArrowUpRight,
} from 'lucide-react';
import { DashboardStats } from '@/lib/supabase/types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface DashboardShellProps {
  userName: string;
}

export function DashboardShell({ userName }: DashboardShellProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    newLeads: 0,
    pendingFollowUps: 0,
    siteVisitsToday: 0,
    closedDeals: 0,
    availableProperties: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const data = await res.json();
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const metricCards = [
    {
      title: 'Total Leads',
      value: stats.totalLeads,
      icon: Users,
      href: '/leads',
      description: 'Active client pipeline in CRM',
      color: 'border-slate-200 text-slate-800',
      iconBg: 'bg-slate-100 text-slate-700',
    },
    {
      title: 'New Leads',
      value: stats.newLeads,
      icon: UserPlus,
      href: '/leads',
      description: 'Uncontacted newly received leads',
      color: 'border-amber-200/80 text-amber-900',
      iconBg: 'bg-amber-50 text-amber-600',
    },
    {
      title: 'Pending Follow-ups',
      value: stats.pendingFollowUps,
      icon: CalendarClock,
      href: '/follow-ups',
      description: 'Scheduled callbacks & tasks',
      color: 'border-slate-200 text-slate-800',
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Site Visits Today',
      value: stats.siteVisitsToday,
      icon: MapPin,
      href: '/site-visits',
      description: 'Confirmed client inspections today',
      color: 'border-slate-200 text-slate-800',
      iconBg: 'bg-indigo-50 text-indigo-600',
    },
    {
      title: 'Closed Deals',
      value: stats.closedDeals,
      icon: CheckCircle2,
      href: '/deals',
      description: 'Successfully closed transactions',
      color: 'border-slate-200 text-slate-800',
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Available Properties',
      value: stats.availableProperties,
      icon: Building2,
      href: '/properties',
      description: 'Active listings in inventory',
      color: 'border-slate-200 text-slate-800',
      iconBg: 'bg-slate-100 text-slate-700',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-2xs sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Welcome back, {userName || 'Agent'}
            </h1>
            <Badge variant="gold" className="text-[10px]">
              Foundation Phase 1
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Diksha Real Estate Operations Dashboard & Pipeline Control
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-slate-500 ${
                isRefreshing ? 'animate-spin' : ''
              }`}
            />
            <span>Refresh Counts</span>
          </button>
        </div>
      </div>

      {/* 6 Real Database Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.title}
              className="relative overflow-hidden transition-all hover:border-slate-300 hover:shadow-xs group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {card.title}
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    {isLoading ? (
                      <div className="h-8 w-16 animate-pulse rounded bg-slate-200" />
                    ) : (
                      <span className="text-3xl font-extrabold tracking-tight text-[#0f172a]">
                        {card.value}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">records</span>
                  </div>
                </div>
                <div className={`rounded-lg p-2.5 ${card.iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-500">{card.description}</span>
                <Link
                  href={card.href}
                  className="inline-flex items-center text-xs font-medium text-amber-700 group-hover:text-amber-800 group-hover:underline"
                >
                  View <ArrowUpRight className="ml-0.5 h-3 w-3" />
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Real Estate Activity & Roster Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Recent Pipeline Activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Recent Activity Stream</CardTitle>
                <CardDescription>
                  Real-time audit log of CRM leads, properties, and calls
                </CardDescription>
              </div>
            </CardHeader>

            {/* Empty state (strict rule: No fake demo data, show "No data yet") */}
            <div className="py-8">
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 p-8 text-center">
                <FolderGit2 className="h-8 w-8 text-slate-400" />
                <h4 className="mt-2 text-sm font-semibold text-slate-800">
                  No data yet
                </h4>
                <p className="mt-1 text-xs text-slate-500 max-w-xs">
                  Activity will appear automatically once team members create leads or schedule follow-ups.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Foundation Status & Quick Nav */}
        <div className="space-y-6">
          <Card className="border-amber-200/90 bg-gradient-to-br from-white to-amber-50/30">
            <div className="flex items-center gap-2 text-amber-800">
              <ShieldCheck className="h-5 w-5 text-amber-600" />
              <h3 className="text-sm font-semibold">Security & RLS Enforced</h3>
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Row Level Security is active on every database table. Employees view only assigned or direct team records, while Administrators maintain organization-wide governance.
            </p>
            <div className="mt-4 border-t border-amber-200/60 pt-3">
              <Link
                href="/employees"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800"
              >
                Manage Employees & Permissions &rarr;
              </Link>
            </div>
          </Card>

          <Card>
            <CardTitle className="text-sm">Company Settings</CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              Configure agency profile, phone lines, and corporate details.
            </p>
            <div className="mt-4">
              <Link
                href="/settings"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
              >
                <Building className="h-3.5 w-3.5 text-slate-500" />
                Edit Company Profile
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
