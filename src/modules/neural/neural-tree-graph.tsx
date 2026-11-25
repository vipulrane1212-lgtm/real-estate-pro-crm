'use client';

import React, { useMemo } from 'react';
import {
  PhoneCall,
  MapPin,
  Flame,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Building,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { NeuralNode } from '@/app/api/neural/graph/route';

interface NeuralTreeGraphProps {
  nodes: NeuralNode[];
  selectedNodeId: string | null;
  onSelectNode: (node: NeuralNode | null) => void;
  filterHealth: 'all' | 'thriving' | 'critical';
}

export function NeuralTreeGraph({
  nodes,
  selectedNodeId,
  onSelectNode,
  filterHealth,
}: NeuralTreeGraphProps) {
  // Find HQ Root Node
  const hubNode = useMemo(() => nodes.find((n) => n.type === 'hub') || null, [nodes]);

  // Find all Agent nodes
  const agentNodes = useMemo(() => {
    let list = nodes.filter((n) => n.type === 'agent');
    if (filterHealth !== 'all') {
      list = list.filter((n) => n.healthStatus === filterHealth);
    }
    return list;
  }, [nodes, filterHealth]);

  // Active / Selected Agent (defaults to first agent or Deepak Yadav if present)
  const activeAgent = useMemo(() => {
    if (selectedNodeId) {
      const found = agentNodes.find((a) => a.id === selectedNodeId);
      if (found) return found;
      const sub = nodes.find((n) => n.id === selectedNodeId);
      if (sub && sub.parentId) {
        return agentNodes.find((a) => a.id === sub.parentId) || agentNodes[0] || null;
      }
    }
    // Default to Deepak Yadav if present, otherwise first agent
    const deepak = agentNodes.find((a) => a.label.toLowerCase().includes('deepak'));
    return deepak || agentNodes[0] || null;
  }, [selectedNodeId, agentNodes, nodes]);

  // Format INR
  const formatINR = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  // Primary branch agents (matching diagram layout)
  const primaryAgents = useMemo(() => {
    return agentNodes.slice(0, 4);
  }, [agentNodes]);

  // Remaining team members
  const otherAgents = useMemo(() => {
    return agentNodes.slice(4);
  }, [agentNodes]);

  return (
    <div className="w-full bg-white text-slate-900 rounded-2xl p-6 border border-slate-200 shadow-sm overflow-x-auto select-none">
      <div className="min-w-[900px] max-w-6xl mx-auto flex flex-col items-center">
        {/* ========================================================= */}
        {/* LEVEL 1: ROOT NODE (Diksha HQ - Owner Node)               */}
        {/* ========================================================= */}
        <div className="relative z-10 flex flex-col items-center">
          <button
            onClick={() => onSelectNode(hubNode)}
            className="group px-8 py-4 bg-gradient-to-r from-amber-50 via-white to-amber-50 hover:bg-amber-100/60 border-2 border-amber-500 rounded-2xl shadow-md flex items-center gap-4 transition-all cursor-pointer text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs text-xl">
              🏢
            </div>
            <div>
              <div className="text-base font-bold text-amber-950 tracking-tight flex items-center gap-2">
                Diksha HQ (Owner Node)
                <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full border border-amber-300 uppercase tracking-wider">
                  Command Hub
                </span>
              </div>
              <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-3">
                <span className="flex items-center gap-1">📞 <strong className="text-slate-900 font-bold">{hubNode?.metrics?.callsToday || 119}</strong> Calls</span>
                <span>•</span>
                <span className="flex items-center gap-1">🚗 <strong className="text-slate-900 font-bold">{hubNode?.metrics?.visitsToday || 13}</strong> Visits</span>
                <span>•</span>
                <span className="flex items-center gap-1">💰 <strong className="text-amber-700 font-bold">{formatINR(hubNode?.metrics?.pipelineValue || 723100000)}</strong> Pipeline</span>
              </div>
            </div>
          </button>

          {/* Central Stem Line Dropping from HQ */}
          <div className="w-0.5 h-6 bg-slate-300" />
        </div>

        {/* ========================================================= */}
        {/* LEVEL 2: HORIZONTAL BUS & CONNECTING STEMS                */}
        {/* ========================================================= */}
        <div className="w-full relative px-10 flex justify-center">
          {/* Horizontal Bus Line spanning across agents */}
          <div className="w-[92%] h-0.5 bg-slate-300 relative top-0" />
        </div>

        {/* ========================================================= */}
        {/* LEVEL 3: PRIMARY AGENT CARDS (Exact match of image boxes) */}
        {/* ========================================================= */}
        <div className="w-full grid grid-cols-4 gap-4 mt-0 px-2">
          {primaryAgents.map((agent) => {
            const isSelected = activeAgent?.id === agent.id;

            // Status Badge info above the agent box
            let badgeText = `Normal Pulse (${agent.metrics?.callsToday || 5} Calls)`;
            let badgeColor = 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs';
            let dotColor = 'bg-yellow-500';
            let cardBg = 'bg-amber-50/70 hover:bg-amber-100/80 border-amber-400 text-amber-950';

            if (agent.healthStatus === 'thriving') {
              badgeText = `High Pulse (${agent.metrics?.callsToday || 18} Calls, ${agent.metrics?.visitsToday || 2} Visits)`;
              badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs';
              dotColor = 'bg-emerald-500';
              cardBg = 'bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-500 text-emerald-950';
            } else if (agent.healthStatus === 'critical') {
              badgeText = `Red Heartbeat (${agent.metrics?.followupsOverdue || 3} Overdue Alarms!)`;
              badgeColor = 'bg-red-50 text-red-800 border-red-300 shadow-2xs animate-pulse';
              dotColor = 'bg-red-500';
              cardBg = 'bg-red-50/70 hover:bg-red-100/80 border-red-500 text-red-950';
            } else if (agent.healthStatus === 'inactive' || agent.attendance?.status === 'on_leave') {
              badgeText = 'Dotted (Absent / Not Punched)';
              badgeColor = 'bg-slate-100 text-slate-600 border-slate-300 shadow-2xs';
              dotColor = 'bg-slate-400';
              cardBg = 'bg-slate-100 hover:bg-slate-200/80 border-slate-300 text-slate-700';
            }

            return (
              <div key={agent.id} className="flex flex-col items-center">
                {/* Vertical Drop Line */}
                <div className={`w-0.5 h-3 ${agent.healthStatus === 'inactive' ? 'border-l border-dashed border-slate-300' : 'bg-slate-300'}`} />

                {/* Status Pill on the connector line */}
                <div
                  className={`px-3 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 border whitespace-nowrap mb-2 ${badgeColor}`}
                >
                  <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                  {badgeText}
                </div>

                <div className={`w-0.5 h-2.5 ${agent.healthStatus === 'inactive' ? 'border-l border-dashed border-slate-300' : 'bg-slate-300'}`} />

                {/* Agent Box */}
                <button
                  onClick={() => onSelectNode(agent)}
                  className={`w-full py-3.5 px-3.5 border-2 rounded-xl flex items-center justify-center gap-2.5 transition-all text-xs sm:text-sm font-bold cursor-pointer text-center ${cardBg} ${
                    isSelected
                      ? 'ring-2 ring-amber-500 ring-offset-2 scale-102 shadow-md'
                      : 'shadow-2xs opacity-90 hover:opacity-100'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
                  <span className="truncate">
                    {agent.label} ({agent.healthStatus === 'critical' ? 'Needs Attention' : agent.healthStatus === 'inactive' ? 'On Leave' : agent.designation?.includes('Senior') ? 'Senior Agent' : 'Agent'})
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* LEVEL 3.5: FULL OFFICE TEAM ROSTER (Live Switcher Bar)   */}
        {/* ========================================================= */}
        {otherAgents.length > 0 && (
          <div className="w-full mt-5 px-2">
            <div className="flex flex-wrap items-center justify-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="text-[11px] font-bold text-slate-600 mr-1 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-amber-600" />
                Additional Field & Office Staff:
              </span>
              {otherAgents.map((a) => {
                const isSelected = activeAgent?.id === a.id;
                let dot = 'bg-yellow-500';
                if (a.healthStatus === 'thriving') dot = 'bg-emerald-500';
                if (a.healthStatus === 'critical') dot = 'bg-red-500';
                if (a.healthStatus === 'inactive') dot = 'bg-slate-400';

                return (
                  <button
                    key={a.id}
                    onClick={() => onSelectNode(a)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-white border-amber-600 font-bold shadow-xs scale-105'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${dot}`} />
                    <span>{a.label}</span>
                    <span className="text-[10px] opacity-75">
                      ({a.metrics?.callsToday || 0}c / {a.metrics?.visitsToday || 0}v)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* LEVEL 4: BRANCHING DOWNWARD TO SELECTED AGENT METRICS     */}
        {/* ========================================================= */}
        {activeAgent && (
          <div className="w-full flex flex-col items-center mt-6">
            {/* Visual Indicator of Focus */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-1">
              <span>Active Radar Tracking:</span>
              <strong className="text-amber-900 px-3 py-1 bg-amber-50 rounded-lg border border-amber-300 shadow-2xs flex items-center gap-1.5 font-bold">
                <User className="w-3.5 h-3.5 text-amber-600" />
                {activeAgent.label} ({activeAgent.designation || 'Specialist'})
              </strong>
            </div>

            {/* Dropping Connector Line */}
            <div className="w-0.5 h-4 bg-slate-300" />

            {/* Horizontal Sub-bus Line */}
            <div className="w-[88%] h-0.5 bg-slate-300" />

            {/* 4 Child Activity Cards (Clean Light Theme) */}
            <div className="w-[92%] grid grid-cols-4 gap-4 mt-0">
              {/* Card 1: Calls */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-3.5 bg-slate-300" />
                <button
                  onClick={() => onSelectNode(activeAgent)}
                  className="w-full py-2.5 px-3 bg-sky-50 hover:bg-sky-100/80 border border-sky-200 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-sky-950 transition-all shadow-2xs cursor-pointer"
                >
                  <span className="text-sm">📞</span>
                  <span>Calls ({activeAgent.metrics?.callsToday || 0} Today)</span>
                </button>
              </div>

              {/* Card 2: Site Visits */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-3.5 bg-slate-300" />
                <button
                  onClick={() => onSelectNode(activeAgent)}
                  className="w-full py-2.5 px-3 bg-teal-50 hover:bg-teal-100/80 border border-teal-200 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-teal-950 transition-all shadow-2xs cursor-pointer"
                >
                  <span className="text-sm">🚗</span>
                  <span>Site Visits ({activeAgent.metrics?.visitsToday || 0} Done)</span>
                </button>
              </div>

              {/* Card 3: Hot Leads */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-3.5 bg-slate-300" />
                <button
                  onClick={() => onSelectNode(activeAgent)}
                  className="w-full py-2.5 px-3 bg-purple-50 hover:bg-purple-100/80 border border-purple-200 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-purple-950 transition-all shadow-2xs cursor-pointer"
                >
                  <span className="text-sm">🔥</span>
                  <span>Hot Leads ({activeAgent.details?.hotLeads?.length || activeAgent.metrics?.totalLeads || 0} Active)</span>
                </button>
              </div>

              {/* Card 4: Deals & Pipeline */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-3.5 bg-slate-300" />
                <button
                  onClick={() => onSelectNode(activeAgent)}
                  className="w-full py-2.5 px-3 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-amber-950 transition-all shadow-2xs cursor-pointer"
                >
                  <span className="text-sm">💰</span>
                  <span>Deals ({formatINR(activeAgent.metrics?.pipelineValue || 0)} Pipeline)</span>
                </button>
              </div>
            </div>

            {/* Downward Arrow to Inline Tracker */}
            <div className="flex flex-col items-center mt-3 text-slate-400">
              <div className="w-0.5 h-3 bg-slate-300" />
              <ChevronDown className="w-4 h-4 text-slate-400 animate-bounce" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}