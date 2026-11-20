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
  Calendar,
  Building2,
  Trash2,
  Edit,
  ExternalLink,
  RefreshCw,
  MoreVertical,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Lead, LeadStatus, LeadType } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { LeadModal } from './lead-modal';
import { LeadDetailDrawer } from './lead-detail-drawer';
import { LeadImportModal } from './lead-import-modal';

const STATUS_COLUMNS: { id: LeadStatus; label: string; headerColor: string; dotColor: string }[] = [
  { id: 'new', label: 'New Enquiries', headerColor: 'bg-blue-50 text-blue-800 border-blue-200', dotColor: 'bg-blue-500' },
  { id: 'contacted', label: 'Contacted', headerColor: 'bg-amber-50 text-amber-800 border-amber-200', dotColor: 'bg-amber-500' },
  { id: 'follow_up', label: 'Follow-up', headerColor: 'bg-purple-50 text-purple-800 border-purple-200', dotColor: 'bg-purple-500' },
  { id: 'site_visit', label: 'Site Visit', headerColor: 'bg-indigo-50 text-indigo-800 border-indigo-200', dotColor: 'bg-indigo-500' },
  { id: 'negotiation', label: 'Negotiation', headerColor: 'bg-orange-50 text-orange-800 border-orange-200', dotColor: 'bg-orange-500' },
  { id: 'closed_won', label: 'Closed Won', headerColor: 'bg-emerald-50 text-emerald-800 border-emerald-200', dotColor: 'bg-emerald-500' },
  { id: 'closed_lost', label: 'Closed Lost', headerColor: 'bg-slate-100 text-slate-700 border-slate-200', dotColor: 'bg-slate-400' },
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

export function LeadManagement() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; designation: string; profile?: { full_name: string } }>>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // View switch: kanban vs list
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('');

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Drag and drop state for kanban
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (employeeFilter !== 'all') params.set('assigned_to', employeeFilter);
      if (locationFilter) params.set('location', locationFilter);

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
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
        setIsAdmin(authData.role === 'admin' || authData.role === 'super_admin');
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

  const handleFilterChange = async () => {
    await fetchLeads();
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter, typeFilter, employeeFilter, locationFilter]);

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
        // Revert on error
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Lead Management
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {leads.length} Active
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Pipeline board, requirement matching, and inbound client enquiries
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={isRefreshing}
            className="text-slate-600"
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
            Import CSV
          </Button>

          {/* Export CSV */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>

          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-slate-300 bg-white p-0.5">
            <button
              onClick={() => setViewMode('kanban')}
              className={`rounded-md p-1.5 transition ${
                viewMode === 'kanban' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`rounded-md p-1.5 transition ${
                viewMode === 'list' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="List Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Add Lead */}
          <Button
            onClick={() => {
              setEditingLead(null);
              setIsCreateModalOpen(true);
            }}
            className="bg-amber-600 text-white hover:bg-amber-700 gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-12">
        {/* Search */}
        <div className="relative sm:col-span-4">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client name, phone, location, BHK..."
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

        {/* Location search */}
        <div className="sm:col-span-2">
          <input
            type="text"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            placeholder="Filter location/area..."
            className="w-full rounded-lg border border-slate-200 py-1.5 px-2.5 text-xs focus:border-amber-500 focus:outline-none"
          />
        </div>

        {/* Assigned Employee (Admin) */}
        {isAdmin && (
          <div className="sm:col-span-2">
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-amber-500 focus:outline-none"
            >
              <option value="all">All Agents</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.profile?.full_name || 'Agent'}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main View Area */}
      {isLoading ? (
        <div className="py-20 text-center text-sm text-slate-500">
          Loading leads and pipeline stages...
        </div>
      ) : leads.length === 0 ? (
        <EmptyState
          title="No data yet"
          description={
            search || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'No leads match the selected filter criteria. Try clearing search filters.'
              : 'Start building your sales pipeline by recording client enquiries or importing a CSV spreadsheet.'
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
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1">
          {STATUS_COLUMNS.map((col) => {
            const columnLeads = leads.filter((l) => l.status === col.id);

            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className="flex w-80 shrink-0 flex-col rounded-xl border border-slate-200 bg-slate-100/60 shadow-sm"
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
                    columnLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onClick={() => setSelectedLead(lead)}
                        className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition hover:border-amber-400 hover:shadow-md active:scale-98"
                      >
                        {/* Top: Name & Number */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-mono font-semibold text-slate-400">
                              #{lead.lead_number}
                            </span>
                            <h4 className="font-bold text-slate-900 group-hover:text-amber-700 transition leading-snug">
                              {lead.full_name}
                            </h4>
                          </div>

                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-700">
                            {lead.lead_type}
                          </span>
                        </div>

                        {/* Middle: Requirement & Location */}
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
                          <span className="font-medium text-slate-600 truncate max-w-[120px]">
                            {lead.assigned_employee?.profile?.full_name || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST TABLE VIEW */
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 pl-4 pr-2">#</th>
                  <th className="px-3 py-3">Client</th>
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
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="cursor-pointer transition hover:bg-slate-50"
                  >
                    <td className="py-3 pl-4 pr-2 font-mono text-slate-400">
                      #{lead.lead_number}
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-900">
                      {lead.full_name}
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
                    <td className="px-3 py-3 text-slate-600">
                      {lead.assigned_employee?.profile?.full_name || 'Unassigned'}
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
                        {isAdmin && (
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
                ))}
              </tbody>
            </table>
          </div>
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
        isAdmin={isAdmin}
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
        isAdmin={isAdmin}
      />
    </div>
  );
}
