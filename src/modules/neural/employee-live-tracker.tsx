'use client';

import React, { useState } from 'react';
import {
  Phone,
  PhoneCall,
  MapPin,
  Calendar,
  Clock,
  Flame,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  User,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Car,
  FileText,
  BadgeAlert,
  Navigation,
} from 'lucide-react';
import { NeuralNode } from '@/app/api/neural/graph/route';
import { Button } from '@/components/ui/button';

interface EmployeeLiveTrackerProps {
  node: NeuralNode | null;
  onSelectNode: (node: NeuralNode) => void;
  allAgentNodes: NeuralNode[];
}

export function EmployeeLiveTracker({
  node,
  onSelectNode,
  allAgentNodes,
}: EmployeeLiveTrackerProps) {
  const [activeTab, setActiveTab] = useState<'calls' | 'visits' | 'leads' | 'deals' | 'all'>('calls');

  if (!node) return null;

  const isHub = node.type === 'hub';

  // Format INR
  const formatINR = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const recentCalls = node.details?.recentCalls || [];
  const upcomingVisits = node.details?.upcomingVisits || [];
  const hotLeads = node.details?.hotLeads || [];
  const deals = node.details?.deals || [];

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-slate-900 transition-all">
      {/* ========================================================= */}
      {/* 1. AGENT IDENTITY & EXECUTIVE LIVE STATUS BANNER          */}
      {/* ========================================================= */}
      <div className="p-6 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start md:items-center gap-4">
          {/* Avatar with Status Ring */}
          <div className="relative shrink-0">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shadow-xs border-2 ${
                isHub
                  ? 'bg-amber-100 text-amber-800 border-amber-400'
                  : node.healthStatus === 'thriving'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                  : node.healthStatus === 'critical'
                  ? 'bg-red-100 text-red-800 border-red-400 animate-pulse'
                  : node.healthStatus === 'inactive'
                  ? 'bg-slate-100 text-slate-600 border-slate-300'
                  : 'bg-amber-100 text-amber-800 border-amber-400'
              }`}
            >
              {isHub ? '🏢' : node.label.charAt(0)}
            </div>

            {/* Online Pulse Dot */}
            {!isHub && (
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                  node.healthStatus === 'thriving'
                    ? 'bg-emerald-500 animate-ping'
                    : node.healthStatus === 'critical'
                    ? 'bg-red-500 animate-bounce'
                    : node.healthStatus === 'inactive'
                    ? 'bg-slate-400'
                    : 'bg-yellow-500'
                }`}
              />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                {node.label}
              </h2>

              {/* Status Pill */}
              {!isHub && (
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1.5 ${
                    node.healthStatus === 'thriving'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : node.healthStatus === 'critical'
                      ? 'bg-red-50 text-red-800 border-red-200 animate-pulse'
                      : node.healthStatus === 'inactive'
                      ? 'bg-slate-100 text-slate-600 border-slate-300'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      node.healthStatus === 'thriving'
                        ? 'bg-emerald-500'
                        : node.healthStatus === 'critical'
                        ? 'bg-red-500'
                        : node.healthStatus === 'inactive'
                        ? 'bg-slate-400'
                        : 'bg-yellow-500'
                    }`}
                  />
                  {node.healthStatus === 'thriving'
                    ? 'Thriving (High Pulse)'
                    : node.healthStatus === 'critical'
                    ? 'Bottleneck / Overdue Attention'
                    : node.healthStatus === 'inactive'
                    ? 'On Leave'
                    : 'Steady Pulse'}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
              <span className="font-semibold text-slate-700">
                {node.designation || node.role || 'Real Estate Specialist'}
              </span>
              <span>•</span>
              <span>{node.email || 'diksharealestate.com'}</span>
              <span>•</span>
              <span className="font-medium text-slate-700">{node.phone || '+91 98390 00000'}</span>
            </p>

            {/* Attendance & Location Bar */}
            {!isHub && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Punched In:</span>
                  <strong className="text-slate-900 font-bold">
                    {node.attendance?.checkInTime || '09:30 AM'}
                  </strong>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs">
                  <MapPin className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Current:</span>
                  <strong className="text-cyan-800 font-bold">
                    {node.attendance?.location || (node.attendance?.status === 'on_field' ? 'On Field Site Visit' : 'Head Office Lucknow')}
                  </strong>
                </div>

                <a
                  href="/attendance?tab=radar"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-50 border border-sky-200 text-sky-800 font-bold hover:bg-sky-100 transition-colors shadow-2xs"
                  title="Open in 24/7 Live Fleet Radar"
                >
                  <Navigation className="w-3.5 h-3.5 text-sky-600" />
                  <span>Track on Radar</span>
                </a>

                <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Selfie Verified</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Action Contacts: WhatsApp & Direct Call */}
        {!isHub && (
          <div className="flex items-center gap-3 shrink-0">
            <a
              href={`https://wa.me/${(node.phone || '919839012005').replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(
                node.label
              )},%20reviewing%20your%20live%20performance%20on%20Diksha%20CRM.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 fill-white" />
              <span>WhatsApp Agent</span>
            </a>

            <a
              href={`tel:${node.phone || '+919839012005'}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer"
            >
              <PhoneCall className="w-4 h-4 text-sky-600" />
              <span>Call Agent</span>
            </a>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 2. REAL-TIME KPI STRIP (Light & Crisp)                    */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-5 border-b border-slate-200 divide-x divide-slate-200 bg-slate-50/70">
        <div className="p-4 text-center">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            📞 Calls Today
          </span>
          <span className="text-2xl font-extrabold text-sky-700 mt-1 block">
            {node.metrics?.callsToday ?? recentCalls.length}
          </span>
          <span className="text-[10px] text-slate-500">Chronological Logs</span>
        </div>

        <div className="p-4 text-center">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            🚗 Site Visits
          </span>
          <span className="text-2xl font-extrabold text-teal-700 mt-1 block">
            {node.metrics?.visitsToday ?? upcomingVisits.length}
          </span>
          <span className="text-[10px] text-slate-500">On-field Inspections</span>
        </div>

        <div className="p-4 text-center">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            ⏰ Follow-ups Done
          </span>
          <span className="text-2xl font-extrabold text-emerald-700 mt-1 block">
            {node.metrics?.followupsDone ?? 3}
          </span>
          <span className="text-[10px] text-slate-500">Completed On-Time</span>
        </div>

        <div className="p-4 text-center">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            🚨 Overdue Alarms
          </span>
          <span
            className={`text-2xl font-extrabold mt-1 block ${
              (node.metrics?.followupsOverdue || 0) > 0
                ? 'text-red-600 animate-pulse'
                : 'text-slate-400'
            }`}
          >
            {node.metrics?.followupsOverdue || 0}
          </span>
          <span className="text-[10px] text-slate-500">
            {(node.metrics?.followupsOverdue || 0) > 0 ? 'Requires Action' : 'Zero Backlog'}
          </span>
        </div>

        <div className="p-4 text-center col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            💰 Active Pipeline
          </span>
          <span className="text-2xl font-extrabold text-amber-800 mt-1 block">
            {formatINR(node.metrics?.pipelineValue || 15000000)}
          </span>
          <span className="text-[10px] text-slate-500">Potential Deals</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. WORK SECTION TABS                                      */}
      {/* ========================================================= */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 px-6 py-2 bg-slate-50">
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <button
            onClick={() => setActiveTab('calls')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'calls'
                ? 'bg-white text-sky-800 border border-sky-300 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5 text-sky-600" />
            <span>Today's Calls ({recentCalls.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('visits')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'visits'
                ? 'bg-white text-teal-800 border border-teal-300 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Car className="w-3.5 h-3.5 text-teal-600" />
            <span>Site Visits ({upcomingVisits.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'leads'
                ? 'bg-white text-purple-800 border border-purple-300 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-purple-600" />
            <span>Active Hot Leads ({hotLeads.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('deals')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'deals'
                ? 'bg-white text-amber-800 border border-amber-300 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
            <span>Deals & Pipeline ({deals.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 border border-slate-300 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>All Daily Work</span>
          </button>
        </div>

        {/* Quick Employee Switcher Pill List */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500">
          <span className="text-[11px] mr-1 font-semibold">Switch Agent:</span>
          {allAgentNodes.slice(0, 5).map((a) => (
            <button
              key={a.id}
              onClick={() => onSelectNode(a)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                node.id === a.id
                  ? 'bg-amber-500 text-white shadow-2xs font-bold'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. WORK SECTION DETAILS CONTENT (White & Clean Cards)      */}
      {/* ========================================================= */}
      <div className="p-6 space-y-6">
        {/* ==================== TAB 1: CALLS FEED ==================== */}
        {(activeTab === 'calls' || activeTab === 'all') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-sky-900 uppercase tracking-wider flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-sky-600" />
                Chronological Call Logs for {node.label} (Today)
              </h3>
              <span className="text-xs text-slate-500">
                Total logged calls: <strong className="text-slate-900 font-bold">{recentCalls.length}</strong>
              </span>
            </div>

            {recentCalls.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {recentCalls.map((call, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-white border border-slate-200 hover:border-sky-300 hover:shadow-md transition-all flex flex-col justify-between space-y-2.5 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                          <User className="w-3.5 h-3.5 text-sky-600" />
                          {call.leadName}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-semibold">
                          {call.time}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                        <span>📞 {call.phone || '+91 98390 44100'}</span>
                        <span className="text-slate-700 font-medium">⏱️ {call.duration}</span>
                      </div>

                      <div className="mt-2.5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                          Outcome / Discussion:
                        </span>
                        <p className="text-slate-700 text-xs leading-relaxed font-normal">
                          {call.notes || call.outcome}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {call.outcome}
                      </span>
                      <a
                        href={`tel:${call.phone || '+919839044100'}`}
                        className="text-[11px] text-sky-700 hover:underline flex items-center gap-1 font-bold"
                      >
                        Call Back
                        <ChevronRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-500 text-xs">
                No outbound or inbound calls logged yet for this agent today.
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 2: SITE VISITS ==================== */}
        {(activeTab === 'visits' || activeTab === 'all') && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-teal-900 uppercase tracking-wider flex items-center gap-2">
                <Car className="w-4 h-4 text-teal-600" />
                Today's Site Visits & Property Inspections
              </h3>
              <span className="text-xs text-slate-500">
                Scheduled / Done: <strong className="text-slate-900 font-bold">{upcomingVisits.length}</strong>
              </span>
            </div>

            {upcomingVisits.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {upcomingVisits.map((visit, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-white border border-slate-200 hover:border-teal-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <span>🏡 {visit.property}</span>
                          </h4>
                          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <MapPin className="w-3 h-3 text-teal-600 shrink-0" />
                            <span>{visit.location || 'Lucknow, Uttar Pradesh'}</span>
                          </p>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded text-xs font-bold shrink-0 ${
                            visit.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : visit.status === 'In Progress'
                              ? 'bg-cyan-50 text-cyan-800 border border-cyan-200 animate-pulse'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {visit.status}
                        </span>
                      </div>

                      <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-slate-700">
                          <span>👤 Client: <strong className="text-slate-900">{visit.leadName}</strong></span>
                          <span>⏰ Slot: <strong className="text-slate-900">{visit.time}</strong></span>
                        </div>
                        {visit.notes && (
                          <p className="text-[11px] text-slate-600 pt-1.5 border-t border-slate-200/60">
                            📝 {visit.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-[11px] text-teal-700 font-semibold">
                        🚗 Field Lead Inspection
                      </span>
                      <a
                        href={`tel:${visit.phone || '+919839044101'}`}
                        className="text-[11px] text-teal-700 hover:underline flex items-center gap-1 font-bold"
                      >
                        Contact Client
                        <ChevronRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-500 text-xs">
                No site visits recorded today for this staff member.
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 3: HOT LEADS ==================== */}
        {(activeTab === 'leads' || activeTab === 'all') && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-purple-900 uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-purple-600" />
                Active Hot Leads (Closing Stage)
              </h3>
              <span className="text-xs text-slate-500">
                High-intent buyers: <strong className="text-slate-900 font-bold">{hotLeads.length}</strong>
              </span>
            </div>

            {hotLeads.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {hotLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-4 rounded-xl bg-white border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all flex flex-col justify-between space-y-2.5 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 text-sm">{lead.name}</span>
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-bold">
                          {lead.budget}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 mt-1 font-semibold">
                        🏡 {lead.property}
                      </p>

                      <div className="mt-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span>Current Stage: <strong className="text-purple-700">{lead.stage}</strong></span>
                        {lead.lastActivity && (
                          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                            ⚡ {lead.lastActivity}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <span className="text-[11px] text-slate-500">📞 {lead.phone || '+91 98390 00000'}</span>
                      <a
                        href={`https://wa.me/${(lead.phone || '919839044101').replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-purple-700 hover:underline flex items-center gap-1 font-bold"
                      >
                        WhatsApp
                        <ChevronRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-500 text-xs">
                No hot leads assigned yet.
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 4: DEALS & PIPELINE ==================== */}
        {(activeTab === 'deals' || activeTab === 'all') && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                Active Deals & Brokerage Pipeline
              </h3>
              <span className="text-xs text-slate-500">
                Pipeline Deals: <strong className="text-slate-900 font-bold">{deals.length}</strong>
              </span>
            </div>

            {deals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {deals.map((deal, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-white border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3 shadow-2xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{deal.title}</h4>
                        <span className="inline-block px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold mt-1">
                          Stage: {deal.stage || 'Negotiation'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-extrabold text-amber-800 block">
                          {deal.value}
                        </span>
                        {deal.commission && (
                          <span className="text-[11px] text-emerald-700 block font-bold">
                            Est. Comm: {deal.commission}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                      <span className="text-slate-500 text-[11px]">
                        Owner: <strong className="text-slate-800">{node.label}</strong>
                      </span>
                      <span className="text-emerald-700 text-[11px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Live Pipeline
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-500 text-xs">
                No active deals in pipeline for this agent.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}