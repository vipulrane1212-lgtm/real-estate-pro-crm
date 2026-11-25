'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Network,
  Activity,
  Flame,
  AlertTriangle,
  Zap,
  TrendingUp,
  RefreshCw,
  Users,
  ShieldCheck,
  PhoneCall,
  MapPin,
  Calendar,
  Maximize2,
  Minimize2,
  Radio,
} from 'lucide-react';
import { NeuralNode, NeuralLink } from '@/app/api/neural/graph/route';
import { NeuralTreeGraph } from './neural-tree-graph';
import { EmployeeLiveTracker } from './employee-live-tracker';
import { Button } from '@/components/ui/button';

export function NeuralMonitorView() {
  const [nodes, setNodes] = useState<NeuralNode[]>([]);
  const [links, setLinks] = useState<NeuralLink[]>([]);
  const [summary, setSummary] = useState<{
    onlineAgents: number;
    totalAgents: number;
    todayCalls: number;
    todayVisits: number;
    overdueAlerts: number;
    pipelineValue: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<'live' | 'pipeline' | 'bottlenecks'>('live');
  const [fullTeam, setFullTeam] = useState(true);
  const [selectedNode, setSelectedNode] = useState<NeuralNode | null>(null);
  const [filterHealth, setFilterHealth] = useState<'all' | 'thriving' | 'critical'>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fetchGraphData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/neural/graph?mode=${mode}&full_team=${fullTeam}`);
      if (res.ok) {
        const data = await res.json();
        const loadedNodes: NeuralNode[] = data.nodes || [];
        setNodes(loadedNodes);
        setLinks(data.links || []);
        setSummary(data.summary || null);

        // Auto-select Deepak Yadav or first agent if nothing selected yet
        if (!selectedNode && loadedNodes.length > 0) {
          const agents = loadedNodes.filter((n) => n.type === 'agent');
          const deepak = agents.find((a) => a.label.toLowerCase().includes('deepak'));
          setSelectedNode(deepak || agents[0] || null);
        }
      }
    } catch (err) {
      console.error('Failed to load neural graph data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
    const handleToggle = () => fetchGraphData();
    window.addEventListener('diksha_demo_toggle', handleToggle);
    return () => window.removeEventListener('diksha_demo_toggle', handleToggle);
  }, [mode, fullTeam]);

  // Filter nodes if user clicked Thriving or Critical filter
  const displayedNodes = useMemo(() => {
    if (filterHealth === 'all') return nodes;
    return nodes.filter(
      (n) => n.type === 'hub' || n.healthStatus === filterHealth || n.parentId
    );
  }, [nodes, filterHealth]);

  // List of all agent nodes for quick switcher
  const agentNodes = useMemo(() => {
    return nodes.filter((n) => n.type === 'agent');
  }, [nodes]);

  // The active agent node for the tracker
  const currentActiveAgent = useMemo(() => {
    if (selectedNode && selectedNode.type === 'agent') {
      return selectedNode;
    }
    if (selectedNode && selectedNode.parentId) {
      return agentNodes.find((a) => a.id === selectedNode.parentId) || agentNodes[0] || null;
    }
    const deepak = agentNodes.find((a) => a.label.toLowerCase().includes('deepak'));
    return deepak || agentNodes[0] || null;
  }, [selectedNode, agentNodes]);

  // Format currency
  const formatINR = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div
      className={`space-y-4 sm:space-y-6 flex flex-col min-w-0 ${
        isFullscreen ? 'fixed inset-0 z-50 bg-slate-50 p-3 sm:p-6 overflow-y-auto' : 'w-full'
      }`}
    >
      {/* ========================================================= */}
      {/* TOP EXECUTIVE RADAR BANNER (Clean White & Slate)          */}
      {/* ========================================================= */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-sm text-slate-900 min-w-0">
        <div className="flex items-start sm:items-center gap-3 sm:gap-3.5 min-w-0">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200 shadow-2xs">
            <Network className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-2xl">
                Neural Operations Monitor
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 uppercase tracking-wider whitespace-nowrap shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Radar
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time executive tracking of employee calls, field site visits, active pipeline deals, and attendance
            </p>
          </div>
        </div>

        {/* Live Executive KPI Chips */}
        {summary && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs shadow-2xs whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-slate-500">Staff:</span>
              <strong className="text-slate-900 font-bold">
                {summary.onlineAgents} / {summary.totalAgents}
              </strong>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 shadow-2xs whitespace-nowrap">
              <PhoneCall className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span className="text-sky-700">Calls:</span>
              <strong className="text-sky-900 font-bold">{summary.todayCalls}</strong>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 shadow-2xs whitespace-nowrap">
              <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span className="text-teal-700">Visits:</span>
              <strong className="text-teal-900 font-bold">{summary.todayVisits}</strong>
            </div>

            {summary.overdueAlerts > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 shadow-2xs whitespace-nowrap">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-bounce shrink-0" />
                <span>Overdue:</span>
                <strong className="text-red-800 font-extrabold">{summary.overdueAlerts}</strong>
              </div>
            )}

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 shadow-2xs whitespace-nowrap">
              <TrendingUp className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-amber-700">Pipeline:</span>
              <strong className="text-amber-900 font-bold">{formatINR(summary.pipelineValue)}</strong>
            </div>

            <Link
              href="/attendance?tab=radar"
              className="inline-flex min-h-[34px] items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors whitespace-nowrap"
              title="Open 24/7 Field Fleet Radar Map"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-200 shrink-0" />
              <span>Live GPS Radar</span>
            </Link>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* CONTROL TOOLBAR (White & Clean, Zero Horizontal Overflow) */}
      {/* ========================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-xl text-xs text-slate-800 shadow-sm min-w-0">
        {/* Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 overflow-x-auto no-scrollbar max-w-full">
          <button
            onClick={() => setMode('live')}
            className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              mode === 'live'
                ? 'bg-amber-500 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5 shrink-0" />
            Live Activity Energy
          </button>
          <button
            onClick={() => setMode('pipeline')}
            className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              mode === 'pipeline'
                ? 'bg-amber-500 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
            Pipeline & Deal Size
          </button>
          <button
            onClick={() => setMode('bottlenecks')}
            className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              mode === 'bottlenecks'
                ? 'bg-red-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Bottleneck Radar
          </button>
        </div>

        {/* Filter Badges & View Options */}
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {/* Full Team Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] max-w-full">
            <button
              onClick={() => setFullTeam(true)}
              className={`whitespace-nowrap px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-md transition-colors cursor-pointer ${
                fullTeam ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Full Team (11)
            </button>
            <button
              onClick={() => setFullTeam(false)}
              className={`whitespace-nowrap px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-md transition-colors cursor-pointer ${
                !fullTeam ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Organic (2)
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterHealth('all')}
              className={`whitespace-nowrap min-h-[32px] px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                filterHealth === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterHealth('thriving')}
              className={`whitespace-nowrap min-h-[32px] px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                filterHealth === 'thriving'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              🟢 Thriving
            </button>
            <button
              onClick={() => setFilterHealth('critical')}
              className={`whitespace-nowrap min-h-[32px] px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                filterHealth === 'critical'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'bg-red-50 text-red-800 border border-red-200 hover:bg-red-100'
              }`}
            >
              🔴 Overdue
            </button>
          </div>

          <div className="flex items-center gap-1.5 ml-auto lg:ml-0">
            {/* Refresh Button */}
            <button
              onClick={fetchGraphData}
              disabled={isLoading}
              className="flex h-8 w-8 items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200"
              title="Refresh Radar"
              aria-label="Refresh Radar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="flex h-8 w-8 items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* 1. Main Hierarchy Circuit Flowchart (Clean White Theme) */}
      <NeuralTreeGraph
        nodes={displayedNodes}
        selectedNodeId={currentActiveAgent?.id || null}
        onSelectNode={(node) => setSelectedNode(node)}
        filterHealth={filterHealth}
      />

      {/* 2. Full-Width Inline Employee Daily Tracking Board (Clean White Theme) */}
      <EmployeeLiveTracker
        node={currentActiveAgent}
        onSelectNode={(node) => setSelectedNode(node)}
        allAgentNodes={agentNodes}
      />
    </div>
  );
}