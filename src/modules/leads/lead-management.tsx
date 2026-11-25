'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  LayoutGrid,
  List,
  Phone,
  MapPin,
  IndianRupee,
  Building2,
  Trash2,
  Edit,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { Lead, LeadStatus, LeadType, LeadSource } from '@/lib/supabase/types';
import { useDemoData } from '@/modules/demo/demo-data-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { LeadModal } from './lead-modal';
import { LeadDetailDrawer } from './lead-detail-drawer';
import { LeadImportModal } from './lead-import-modal';
import { useAuth } from '@/modules/auth/auth-context';

const STATUS_COLUMNS: { id: LeadStatus; label: string; headerColor: string; dotColor: string }[] = [
  { id: 'new', label: 'New Enquiries', headerColor: 'bg-blue-50 text-blue-800 border-blue-200', dotColor: 'bg-blue-500' },
  { id: 'contacted', label: 'Contacted', headerColor: 'bg-amber-50 text-amber-800 border-amber-200', dotColor: 'bg-amber-500' },
  { id: 'follow_up', label: 'Follow-up', headerColor: 'bg-purple-50 text-purple-800 border-purple-200', dotColor: 'bg-purple-500' },
  { id: 'site_visit', label: 'Site Visit', headerColor: 'bg-indigo-50 text-indigo-800 border-indigo-200', dotColor: 'bg-indigo-500' },
  { id: 'negotiation', label: 'Negotiation', headerColor: 'bg-orange-50 text-orange-800 border-orange-200', dotColor: 'bg-orange-500' },
  { id: 'closed_won', label: 'Closed Won', headerColor: 'bg-emerald-50 text-emerald-800 border-emerald-200', dotColor: 'bg-emerald-500' },
  { id: 'closed_lost', label: 'Closed Lost', headerColor: 'bg-slate-100 text-slate-700 border-slate-200', dotColor: 'bg-slate-400' },
];

const SOURCE_CHIPS = [
  { id: 'all', label: 'All Inflow' },
  { id: 'meta_ads', label: 'Meta Ads' },
  { id: 'housing', label: 'Housing' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'google', label: 'Google' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'website', label: 'Website' },
  { id: 'manual', label: 'Manual' },
  { id: 'csv', label: 'CSV' },
  { id: 'unassigned', label: 'Unassigned' },
];

function formatCurrencyINR(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} Lakh`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatSourceName(src?: string): string {
  if (!src) return 'Website';
  switch (src) {
    case 'meta_ads': return 'Meta Ads';
    case 'housing': return 'Housing.com';
    case 'whatsapp': return 'WhatsApp';
    case 'google': return 'Google';
    case 'instagram': return 'Instagram';
    case 'website': return 'Website';
    case 'walk_in': return 'Walk-in';
    case 'reference': return 'Reference';
    case 'manual': return 'Manual';
    case 'csv': return 'CSV';
    default: return src.charAt(0).toUpperCase() + src.slice(1);
  }
}

function getSourceBadgeClass(src?: string): string {
  switch (src) {
    case 'meta_ads': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'housing': return 'bg-red-50 text-red-700 border-red-200';
    case 'whatsapp': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'google': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'instagram': return 'bg-pink-50 text-pink-700 border-pink-200';
    case 'website': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'csv': return 'bg-teal-50 text-teal-700 border-teal-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export function LeadManagement() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; designation: string; profile?: { full_name: string } }>>([]);
  const { isAdmin: contextIsAdmin } = useAuth();
  const [assignedCounts, setAssignedCounts] = useState<{ unassigned: number; [id: string]: number }>({ unassigned: 0 });
  const [isAdmin, setIsAdmin] = useState(false);
  const effectiveIsAdmin = isAdmin || Boolean(contextIsAdmin);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // View switch: kanban vs list
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  const { showDemoData } = useDemoData();

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Bulk Selection
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  // Drag and drop state for kanban
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const kanbanRef = React.useRef<HTMLDivElement>(null);

  const scrollKanban = (direction: 'left' | 'right') => {
    if (kanbanRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      kanbanRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (locationFilter) params.set('location', locationFilter);
      if (sortBy) params.set('sort_by', sortBy);
      params.set('include_demo', String(showDemoData));

      // Handle source and unassigned chip
      if (sourceFilter === 'unassigned') {
        params.set('assigned_to', 'unassigned');
      } else {
        if (sourceFilter !== 'all') params.set('source', sourceFilter);
        if (employeeFilter !== 'all') params.set('assigned_to', employeeFilter);
      }

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        if (data.assignedCounts) {
          setAssignedCounts(data.assignedCounts);
        }
      }
    } catch (e) {
      console.error('Failed to fetch leads', e);
    }
  };

  const fetchEmployeesAndAuth = async () => {
    try {
      const [authRes, empRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/employees'),
      ]);

      if (authRes.ok) {
        const authData = await authRes.json();
        const role = authData.role || authData.profile?.role;
        setIsAdmin(role === 'admin' || role === 'super_admin' || Boolean(authData.isAdmin));
      }

      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(empData.employees || []);
      }
    } catch (e) {
      console.error('Failed to load employees', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchEmployeesAndAuth(), fetchLeads()]);
      setIsLoading(false);
    };
    init();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLeads();
    setIsRefreshing(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
    }, 250);
    const handleToggle = () => fetchLeads();
    window.addEventListener('diksha_demo_toggle', handleToggle);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('diksha_demo_toggle', handleToggle);
    };
  }, [search, statusFilter, typeFilter, employeeFilter, sourceFilter, locationFilter, sortBy, showDemoData]);

  const handleLeadStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        await fetchLeads();
      } else {
        const data = await res.json();
        if (selectedLead?.id === leadId) {
          setSelectedLead(data.lead);
        }
      }
    } catch (e) {
      console.error('Failed to update lead status', e);
      await fetchLeads();
    }
  };

  const handleDeleteLead = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete lead "${name}"? This action is permanent.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setLeads((prev) => prev.filter((l) => l.id !== id));
        if (selectedLead?.id === id) setSelectedLead(null);
        setSelectedLeadIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        alert('Failed to delete lead');
      }
    } catch (e) {
      console.error('Delete error', e);
    }
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (locationFilter) params.set('location', locationFilter);
    window.open(`/api/leads/export?${params.toString()}`, '_blank');
  };

  // Bulk Selection Handlers
  const toggleSelectLead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedLeadIds.size === leads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(leads.map((l) => l.id)));
    }
  };

  const handleBulkAssign = async (employeeId: string) => {
    if (selectedLeadIds.size === 0) return;
    setIsBulkLoading(true);
    try {
      const res = await fetch('/api/leads/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign',
          lead_ids: Array.from(selectedLeadIds),
          assigned_to: employeeId === 'unassigned' ? null : employeeId,
        }),
      });
      if (res.ok) {
        setSelectedLeadIds(new Set());
        await fetchLeads();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to bulk assign leads');
      }
    } catch (e) {
      console.error('Bulk assign failed', e);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleSingleAssign = async (leadId: string, employeeId: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: employeeId || null }),
      });
      if (res.ok) {
        await fetchLeads();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to assign lead');
      }
    } catch (e) {
      console.error('Single assign error', e);
    }
  };

  const handleBulkStatus = async (status: LeadStatus) => {
    if (selectedLeadIds.size === 0) return;
    setIsBulkLoading(true);
    try {
      const res = await fetch('/api/leads/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'status',
          lead_ids: Array.from(selectedLeadIds),
          status,
        }),
      });
      if (res.ok) {
        setSelectedLeadIds(new Set());
        await fetchLeads();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update lead statuses');
      }
    } catch (e) {
      console.error('Bulk status failed', e);
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedLeadId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: LeadStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (id) {
      handleLeadStatusChange(id, targetStatus);
    }
    setDraggedLeadId(null);
  };

  return (
    <div className="space-y-5 w-full min-w-0">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Unified Lead Inbox
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 whitespace-nowrap">
              {leads.length} Leads
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Source tracking, pipeline Kanban, quick assignment, and client conversions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={isRefreshing}
            className="text-slate-600 min-w-[38px]"
            aria-label="Refresh leads"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          {/* Import CSV */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            className="gap-1.5"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden xs:inline sm:inline">Import CSV</span>
            <span className="xs:hidden sm:hidden">Import</span>
          </Button>

          {/* Export CSV */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" />
            <span className="hidden xs:inline sm:inline">Export CSV</span>
            <span className="xs:hidden sm:hidden">Export</span>
          </Button>

          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-slate-300 bg-white p-0.5">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex h-8 w-8 sm:h-7 sm:w-7 items-center justify-center rounded-md transition cursor-pointer ${
                viewMode === 'kanban' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Kanban Board View"
              aria-label="Kanban Board View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex h-8 w-8 sm:h-7 sm:w-7 items-center justify-center rounded-md transition cursor-pointer ${
                viewMode === 'list' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="List Table View"
              aria-label="List Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Kanban horizontal navigation scroll buttons (desktop/tablet) */}
          {viewMode === 'kanban' && (
            <div className="hidden sm:flex items-center rounded-lg border border-slate-300 bg-white p-0.5">
              <button
                type="button"
                onClick={() => scrollKanban('left')}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                title="Scroll Stages Left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollKanban('right')}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                title="Scroll Stages Right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Add Lead */}
          <Button
            onClick={() => {
              setEditingLead(null);
              setIsCreateModalOpen(true);
            }}
            className="bg-amber-600 text-white hover:bg-amber-700 gap-1.5 shadow-sm flex-1 sm:flex-none"
          >
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Quick Channel Inflow Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 pt-0.5 text-xs">
        <span className="text-slate-400 font-medium shrink-0 mr-1">Inflow:</span>
        {SOURCE_CHIPS.map((chip) => {
          const isActive = sourceFilter === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setSourceFilter(chip.id)}
              className={`rounded-full px-3 py-1.5 font-semibold transition shrink-0 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Per-Employee Workload Bar */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 sm:px-4 py-2.5 text-xs">
        <span className="font-semibold text-slate-700 shrink-0">Team Workload:</span>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar sm:flex-wrap">
          <button
            onClick={() => setEmployeeFilter(employeeFilter === 'unassigned' ? 'all' : 'unassigned')}
            className={`rounded-md px-2.5 py-1 font-medium transition cursor-pointer shrink-0 whitespace-nowrap ${
              employeeFilter === 'unassigned'
                ? 'bg-amber-600 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Unassigned: <strong className="ml-1">{assignedCounts.unassigned || 0}</strong>
          </button>
          {employees.map((emp) => {
            const count = assignedCounts[emp.id] || 0;
            const isEmpActive = employeeFilter === emp.id;
            return (
              <button
                key={emp.id}
                onClick={() => setEmployeeFilter(isEmpActive ? 'all' : emp.id)}
                className={`rounded-md px-2.5 py-1 font-medium transition cursor-pointer shrink-0 whitespace-nowrap ${
                  isEmpActive
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {emp.profile?.full_name || 'Agent'}: <strong className="ml-1">{count}</strong>
              </button>
            );
          })}
          {employeeFilter !== 'all' && (
            <button
              onClick={() => setEmployeeFilter('all')}
              className="text-slate-500 hover:text-slate-800 text-[11px] underline ml-1 shrink-0 whitespace-nowrap cursor-pointer"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-12">
        {/* Search */}
        <div className="relative sm:col-span-3">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, area..."
            className="w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-3 text-xs focus:border-amber-500 focus:outline-none"
          />
        </div>

        {/* Lead Type */}
        <div className="sm:col-span-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-amber-500 focus:outline-none"
          >
            <option value="all">All Types (Buy/Rent)</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
            <option value="rent">Rent</option>
            <option value="commercial">Commercial</option>
          </select>
        </div>

        {/* Status */}
        <div className="sm:col-span-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-amber-500 focus:outline-none"
          >
            <option value="all">All Pipeline Stages</option>
            {STATUS_COLUMNS.map((col) => (
              <option key={col.id} value={col.id}>
                {col.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort By */}
        <div className="sm:col-span-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-amber-500 focus:outline-none"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="source">Sort: Source (A-Z)</option>
            <option value="name">Sort: Client Name (A-Z)</option>
            <option value="budget_desc">Sort: Budget (High to Low)</option>
          </select>
        </div>
      </div>

      {/* Select All on Page Banner */}
      {leads.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="inline-flex items-center gap-1.5 font-semibold text-slate-800 hover:text-amber-700 cursor-pointer"
            >
              {selectedLeadIds.size === leads.length && leads.length > 0 ? (
                <CheckSquare className="h-4 w-4 text-amber-600" />
              ) : (
                <Square className="h-4 w-4 text-slate-400" />
              )}
              <span>
                {selectedLeadIds.size === leads.length
                  ? `All ${leads.length} leads selected`
                  : `Select all on page (${leads.length})`}
              </span>
            </button>
            {selectedLeadIds.size > 0 && (
              <span className="text-slate-400">({selectedLeadIds.size} currently checked)</span>
            )}
          </div>
          {selectedLeadIds.size > 0 && (
            <button
              onClick={() => setSelectedLeadIds(new Set())}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Clear selection
            </button>
          )}
        </div>
      )}

      {/* Main View Area */}
      {isLoading ? (
        <div className="py-20 text-center text-sm text-slate-500">
          Loading leads and pipeline stages...
        </div>
      ) : leads.length === 0 ? (
        <EmptyState
          title="No data yet"
          description={
            search || statusFilter !== 'all' || typeFilter !== 'all' || sourceFilter !== 'all'
              ? 'No leads match the selected filter criteria. Try clearing search filters.'
              : 'Start building your sales pipeline by recording client enquiries or importing CSV.'
          }
          icon={Users}
          actionText="Add First Lead"
          onAction={() => {
            setEditingLead(null);
            setIsCreateModalOpen(true);
          }}
        />
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD */
        <div className="space-y-2.5">
          {/* Mobile Stage Quick-Jump Strip */}
          <div className="flex md:hidden items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
            {STATUS_COLUMNS.map((col) => {
              const count = leads.filter((l) => l.status === col.id).length;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(`kanban-col-${col.id}`);
                    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 shadow-2xs active:bg-slate-100 whitespace-nowrap cursor-pointer"
                >
                  <span className={`h-2 w-2 rounded-full ${col.dotColor}`} />
                  <span>{col.label}</span>
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-600">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            ref={kanbanRef}
            className="flex gap-3 sm:gap-4 overflow-x-auto pb-6 pt-1 w-full min-w-0 scroll-smooth snap-x snap-mandatory md:snap-none"
          >
            {STATUS_COLUMNS.map((col) => {
              const columnLeads = leads.filter((l) => l.status === col.id);

              return (
                <div
                  key={col.id}
                  id={`kanban-col-${col.id}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                  className="flex w-[86vw] max-w-[330px] sm:w-[295px] shrink-0 snap-center flex-col rounded-xl border border-slate-200 bg-slate-100/60 shadow-sm"
                >
                {/* Column Header */}
                <div className={`flex items-center justify-between rounded-t-xl border-b p-3 ${col.headerColor}`}>
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${col.dotColor}`} />
                    <h3 className="text-xs font-bold uppercase tracking-wider">{col.label}</h3>
                  </div>
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold shadow-xs">
                    {columnLeads.length}
                  </span>
                </div>

                {/* Column Cards Container */}
                <div className="flex-1 space-y-3 p-3 min-h-[400px]">
                  {columnLeads.length === 0 ? (
                    <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-400">
                      Drag leads here
                    </div>
                  ) : (
                    columnLeads.map((lead) => {
                      const isSelected = selectedLeadIds.has(lead.id);

                      return (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onClick={() => setSelectedLead(lead)}
                          className={`group cursor-pointer rounded-xl border bg-white p-3.5 shadow-xs transition hover:border-amber-400 hover:shadow-md active:scale-98 relative ${
                            isSelected ? 'border-amber-500 ring-2 ring-amber-400/40' : 'border-slate-200'
                          }`}
                        >
                          {/* Selection Checkbox & DEMO / Source Badges */}
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <div className="flex items-center gap-1.5" onClick={(e) => toggleSelectLead(lead.id, e)}>
                              <button
                                type="button"
                                className="text-slate-400 hover:text-amber-600 cursor-pointer"
                              >
                                {isSelected ? (
                                  <CheckSquare className="h-4 w-4 text-amber-600" />
                                ) : (
                                  <Square className="h-4 w-4" />
                                )}
                              </button>
                              <span className="text-[10px] font-mono font-semibold text-slate-400">
                                #{lead.lead_number}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <span
                                className={`rounded border px-1.5 py-0.2 text-[10px] font-semibold ${getSourceBadgeClass(
                                  lead.source
                                )}`}
                              >
                                {formatSourceName(lead.source)}
                              </span>
                            </div>
                          </div>

                          {/* Client Name & Type */}
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-slate-900 group-hover:text-amber-700 transition leading-snug">
                              {lead.full_name}
                            </h4>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-700 shrink-0">
                              {lead.lead_type}
                            </span>
                          </div>

                          {/* Requirement & Location */}
                          <div className="mt-2 space-y-1 text-xs text-slate-600">
                            {lead.requirement && (
                              <div className="flex items-center gap-1.5 font-medium text-slate-800">
                                <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{lead.requirement}</span>
                              </div>
                            )}

                            {(lead.location || lead.preferred_location) && (
                              <div className="flex items-center gap-1.5 text-slate-500">
                                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{lead.location || lead.preferred_location}</span>
                              </div>
                            )}

                            {(lead.budget_min || lead.budget_max) && (
                              <div className="flex items-center gap-1 font-semibold text-amber-700">
                                <IndianRupee className="h-3.5 w-3.5 shrink-0" />
                                <span>
                                  {lead.budget_min ? formatCurrencyINR(Number(lead.budget_min)) : '₹0'} -{' '}
                                  {lead.budget_max ? formatCurrencyINR(Number(lead.budget_max)) : 'Open'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Bottom: Contact & Agent */}
                          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                            <span className="font-mono">{lead.phone}</span>
                            {effectiveIsAdmin ? (
                              <select
                                value={lead.assigned_to || ''}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleSingleAssign(lead.id, e.target.value)}
                                className={`rounded px-1.5 py-0.5 text-[11px] font-semibold cursor-pointer max-w-[140px] truncate ${
                                  !lead.assigned_to
                                    ? 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 font-bold'
                                    : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                }`}
                              >
                                <option value="">+ Assign Agent</option>
                                {employees.map((emp) => (
                                  <option key={emp.id} value={emp.id}>
                                    {emp.profile?.full_name || 'Agent'}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="font-medium text-slate-600 truncate max-w-[120px]">
                                {lead.assigned_employee?.profile?.full_name || 'Unassigned'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      ) : (
        /* LIST VIEW: Mobile Cards (< md) + Desktop Table (>= md) */
        <>
          <div className="space-y-3 md:hidden">
            {leads.map((lead) => {
              const isSelected = selectedLeadIds.has(lead.id);
              return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`rounded-xl border bg-white p-3.5 shadow-2xs transition cursor-pointer ${
                    isSelected ? 'border-amber-500 ring-2 ring-amber-400/40' : 'border-slate-200'
                  }`}
                >
                  {/* Top row: Checkbox, ID, Source & Type */}
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2 min-w-0" onClick={(e) => toggleSelectLead(lead.id, e)}>
                      <button type="button" className="p-1 -ml-1 text-slate-400 hover:text-amber-600 cursor-pointer">
                        {isSelected ? (
                          <CheckSquare className="h-4.5 w-4.5 text-amber-600" />
                        ) : (
                          <Square className="h-4.5 w-4.5" />
                        )}
                      </button>
                      <span className="font-mono text-[11px] font-semibold text-slate-400">
                        #{lead.lead_number}
                      </span>
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${getSourceBadgeClass(
                          lead.source
                        )}`}
                      >
                        {formatSourceName(lead.source)}
                      </span>
                    </div>

                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700 shrink-0">
                      {lead.lead_type}
                    </span>
                  </div>

                  {/* Client Info & Quick Call */}
                  <div className="mt-2.5 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{lead.full_name}</h4>
                      {(lead.requirement || lead.location || lead.preferred_location) && (
                        <p className="mt-0.5 text-xs text-slate-600 truncate">
                          {lead.requirement || 'Requirement open'}
                          {lead.location || lead.preferred_location
                            ? ` • ${lead.location || lead.preferred_location}`
                            : ''}
                        </p>
                      )}
                      {(lead.budget_min || lead.budget_max) && (
                        <p className="mt-1 text-xs font-semibold text-amber-700">
                          {lead.budget_min ? formatCurrencyINR(Number(lead.budget_min)) : '₹0'} –{' '}
                          {lead.budget_max ? formatCurrencyINR(Number(lead.budget_max)) : 'Open'}
                        </p>
                      )}
                    </div>

                    <a
                      href={`tel:${lead.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                      <Phone className="h-3.5 w-3.5 text-emerald-600" />
                      Call
                    </a>
                  </div>

                  {/* Interactive Controls: Status, Assign & Actions */}
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={lead.status}
                      onChange={(e) => handleLeadStatusChange(lead.id, e.target.value as LeadStatus)}
                      className="min-h-[36px] w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 focus:outline-none"
                    >
                      {STATUS_COLUMNS.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.label}
                        </option>
                      ))}
                    </select>

                    {effectiveIsAdmin ? (
                      <select
                        value={lead.assigned_to || ''}
                        onChange={(e) => handleSingleAssign(lead.id, e.target.value)}
                        className={`min-h-[36px] w-full rounded-lg px-2 py-1 text-xs font-semibold cursor-pointer ${
                          !lead.assigned_to
                            ? 'border border-amber-300 bg-amber-50 text-amber-900'
                            : 'border border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        <option value="">+ Assign Agent</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.profile?.full_name || 'Agent'}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingLead(lead);
                            setIsCreateModalOpen(true);
                          }}
                          className="flex-1 text-slate-700"
                        >
                          <Edit className="h-3.5 w-3.5" /> Edit
                        </Button>
                      </div>
                    )}
                  </div>

                  {effectiveIsAdmin && (
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
                      <span className="font-mono text-[11px] text-slate-400">{lead.phone}</span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingLead(lead);
                            setIsCreateModalOpen(true);
                          }}
                          className="text-slate-600"
                        >
                          <Edit className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteLead(lead.id, lead.full_name)}
                          className="text-red-600 hover:bg-red-50"
                          aria-label="Delete lead"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 pl-4 pr-2 w-10">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="cursor-pointer"
                    >
                      {selectedLeadIds.size === leads.length && leads.length > 0 ? (
                        <CheckSquare className="h-4 w-4 text-amber-600" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-3">Client</th>
                  <th className="px-3 py-3">Source</th>
                  <th className="px-3 py-3">Contact</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Requirement</th>
                  <th className="px-3 py-3">Location</th>
                  <th className="px-3 py-3">Budget</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Assigned To</th>
                  <th className="py-3 pl-2 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => {
                  const isSelected = selectedLeadIds.has(lead.id);

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className={`cursor-pointer transition hover:bg-slate-50 ${
                        isSelected ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="py-3 pl-4 pr-2" onClick={(e) => toggleSelectLead(lead.id, e)}>
                        <button type="button" className="cursor-pointer">
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-amber-600" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{lead.full_name}</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">
                          #{lead.lead_number}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${getSourceBadgeClass(
                            lead.source
                          )}`}
                        >
                          {formatSourceName(lead.source)}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-slate-600">
                        {lead.phone}
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
                          {lead.lead_type}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {lead.requirement || '—'}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {lead.location || lead.preferred_location || '—'}
                      </td>
                      <td className="px-3 py-3 font-medium text-amber-700">
                        {lead.budget_min || lead.budget_max
                          ? `${lead.budget_min ? formatCurrencyINR(Number(lead.budget_min)) : '₹0'} - ${
                              lead.budget_max ? formatCurrencyINR(Number(lead.budget_max)) : 'Open'
                            }`
                          : '—'}
                      </td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={lead.status}
                          onChange={(e) => handleLeadStatusChange(lead.id, e.target.value as LeadStatus)}
                          className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 focus:outline-none"
                        >
                          {STATUS_COLUMNS.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        {effectiveIsAdmin ? (
                          <select
                            value={lead.assigned_to || ''}
                            onChange={(e) => handleSingleAssign(lead.id, e.target.value)}
                            className={`rounded px-2 py-1 text-[11px] font-semibold cursor-pointer ${
                              !lead.assigned_to
                                ? 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 font-bold'
                                : 'border border-slate-200 bg-white text-slate-700'
                            }`}
                          >
                            <option value="">-- Unassigned (Assign) --</option>
                            {employees.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.profile?.full_name || 'Agent'}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-600">
                            {lead.assigned_employee?.profile?.full_name || 'Unassigned'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pl-2 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingLead(lead);
                              setIsCreateModalOpen(true);
                            }}
                            className="h-7 px-2 text-slate-600 hover:text-slate-900"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          {effectiveIsAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteLead(lead.id, lead.full_name)}
                              className="h-7 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedLeadIds.size > 0 && (
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 z-40 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-2xl flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 rounded-2xl border border-slate-700 bg-slate-900 px-3.5 sm:px-5 py-3 text-white shadow-2xl animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-slate-950">
              {selectedLeadIds.size}
            </span>
            <span className="text-xs font-semibold">Leads Selected</span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Bulk Assign */}
          {effectiveIsAdmin && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Assign:</span>
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) handleBulkAssign(e.target.value);
                }}
                disabled={isBulkLoading}
                className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="" disabled>
                  Choose Agent...
                </option>
                <option value="unassigned">-- Unassigned (Pool) --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.profile?.full_name || 'Agent'} ({emp.designation})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Bulk Status */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400">Status:</span>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) handleBulkStatus(e.target.value as LeadStatus);
              }}
              disabled={isBulkLoading}
              className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="" disabled>
                Change Stage...
              </option>
              {STATUS_COLUMNS.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setSelectedLeadIds(new Set())}
            disabled={isBulkLoading}
            className="rounded-lg px-2.5 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* Lead Create/Edit Modal */}
      <LeadModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingLead(null);
        }}
        onSuccess={() => {
          fetchLeads();
        }}
        initialLead={editingLead}
        employees={employees}
        isAdmin={effectiveIsAdmin}
      />

      {/* CSV Import Modal */}
      <LeadImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          fetchLeads();
        }}
      />

      {/* Lead Detail Drawer with Auto-Matching & Timeline */}
      <LeadDetailDrawer
        lead={selectedLead}
        isOpen={Boolean(selectedLead)}
        onClose={() => setSelectedLead(null)}
        onLeadUpdated={(updated) => {
          setSelectedLead(updated);
          fetchLeads();
        }}
        onEditLead={(leadToEdit) => {
          setEditingLead(leadToEdit);
          setIsCreateModalOpen(true);
        }}
        employees={employees}
        isAdmin={effectiveIsAdmin}
      />
    </div>
  );
}