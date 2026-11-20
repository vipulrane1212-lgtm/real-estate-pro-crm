'use client';

import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Shield,
  CheckCircle,
  XCircle,
  Settings2,
  Calendar,
  Phone,
  Mail,
  RefreshCw,
  Loader2,
  UserCheck,
  PhoneCall,
  MapPin,
  CalendarCheck,
  TrendingUp,
  Award,
  Users,
} from 'lucide-react';
import { Employee, EmployeePermissions, EmployeeDailyReport, UserRole } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';

const MODULES = [
  { id: 'leads', label: 'Leads' },
  { id: 'properties', label: 'Properties' },
  { id: 'follow_ups', label: 'Follow-ups' },
  { id: 'site_visits', label: 'Site Visits' },
  { id: 'documents', label: 'Documents' },
  { id: 'calls', label: 'Calls' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'reports', label: 'Reports' },
] as const;

interface PerformancePayload {
  performance: EmployeeDailyReport[];
  todayTotals: {
    leadsAssigned: number;
    callsLogged: number;
    visitsCompleted: number;
    followupsCompleted: number;
  };
  leaderboard: Array<{
    rank: number;
    employee_id: string;
    name: string;
    designation: string;
    deals_closed: number;
    brokerage_earned: number;
    active_leads: number;
  }>;
}

export function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [perfData, setPerfData] = useState<PerformancePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'roster' | 'performance' | 'leaderboard'>('roster');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditPermsModalOpen, setIsEditPermsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Create form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    designation: '',
    joiningDate: '',
    role: 'employee' as UserRole,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Editing permissions state
  const [editingPermissions, setEditingPermissions] = useState<EmployeePermissions>({});

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      const [empRes, perfRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/employees/performance'),
      ]);

      if (empRes.ok) {
        const empJson = await empRes.json();
        setEmployees(empJson.employees || []);
      }

      if (perfRes.ok) {
        const perfJson = await perfRes.json();
        setPerfData(perfJson);
      }
    } catch (err) {
      console.error('Failed to load employee data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create employee');
      }

      setSuccessMessage('Employee account successfully created');
      setIsCreateModalOpen(false);
      setFormData({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        designation: '',
        joiningDate: '',
        role: 'employee',
      });
      fetchData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Creation error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (employee: Employee) => {
    try {
      const newStatus = !employee.is_active;
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (res.ok) {
        setEmployees(prev =>
          prev.map(e =>
            e.id === employee.id
              ? {
                  ...e,
                  is_active: newStatus,
                  profile: e.profile ? { ...e.profile, is_active: newStatus } : undefined,
                }
              : e
          )
        );
        fetchData();
      }
    } catch (err) {
      console.error('Failed to toggle employee status:', err);
    }
  };

  const openCreateModal = () => {
    setFormData(prev => ({
      ...prev,
      joiningDate: prev.joiningDate || new Date().toISOString().split('T')[0],
    }));
    setIsCreateModalOpen(true);
  };

  const openPermissionsModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setEditingPermissions(emp.permissions || {});
    setIsEditPermsModalOpen(true);
  };

  const handlePermissionChange = (
    moduleKey: string,
    action: 'view' | 'create' | 'edit' | 'delete',
    value: boolean
  ) => {
    setEditingPermissions(prev => {
      const currentMod = prev[moduleKey] || { view: false, create: false, edit: false, delete: false };
      return {
        ...prev,
        [moduleKey]: {
          ...currentMod,
          [action]: value,
        },
      };
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedEmployee) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: editingPermissions }),
      });

      if (res.ok) {
        setEmployees(prev =>
          prev.map(e =>
            e.id === selectedEmployee.id ? { ...e, permissions: editingPermissions } : e
          )
        );
        setIsEditPermsModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to update permissions:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const todayTotals = perfData?.todayTotals || {
    leadsAssigned: 0,
    callsLogged: 0,
    visitsCompleted: 0,
    followupsCompleted: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Employee & Performance Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time daily activity telemetry, agent leaderboard, team roster, and access control
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={openCreateModal}
          >
            <UserPlus className="h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          {successMessage}
        </div>
      )}

      {/* Real-Time Daily Activity Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Leads Assigned Today
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{todayTotals.leadsAssigned}</span>
            <span className="text-xs text-slate-500">across team</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Calls Logged Today
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <PhoneCall className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{todayTotals.callsLogged}</span>
            <span className="text-xs text-slate-500">client interactions</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Visits Done Today
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <MapPin className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{todayTotals.visitsCompleted}</span>
            <span className="text-xs text-slate-500">site inspections</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Follow-ups Completed
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <CalendarCheck className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{todayTotals.followupsCompleted}</span>
            <span className="text-xs text-slate-500">scheduled tasks</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('roster')}
          className={`pb-3 text-sm font-semibold transition-colors cursor-pointer border-b-2 -mb-px ${
            activeTab === 'roster'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Team Roster & Access ({employees.length})
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`pb-3 text-sm font-semibold transition-colors cursor-pointer border-b-2 -mb-px ${
            activeTab === 'performance'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Daily & Monthly Reports
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`pb-3 text-sm font-semibold transition-colors cursor-pointer border-b-2 -mb-px ${
            activeTab === 'leaderboard'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Agent Leaderboard
        </button>
      </div>

      {/* TAB 1: Team Roster & Access */}
      {activeTab === 'roster' && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-200 px-6 py-4 bg-slate-50/50">
            <h3 className="text-sm font-semibold text-slate-900">
              Employee Directory ({employees.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              <span className="ml-2 text-sm text-slate-500">Loading roster...</span>
            </div>
          ) : employees.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No data yet"
                description="No employee accounts have been created yet. Click 'Add Employee' to register your first team member."
                icon={UserCheck}
                actionText="Add Employee"
                onAction={openCreateModal}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3">Employee</th>
                    <th className="px-6 py-3">Role & Designation</th>
                    <th className="px-6 py-3">Joining Date</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Permissions</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {employees.map(emp => {
                    const profile = emp.profile;
                    const isActive = emp.is_active;

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">
                            {profile?.full_name || 'Agent'}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            {profile?.email && (
                              <span className="flex items-center gap-1 text-slate-600">
                                <Mail className="h-3 w-3 text-slate-400" />
                                {profile.email}
                              </span>
                            )}
                            {profile?.phone && (
                              <span className="flex items-center gap-1 text-slate-600">
                                <Phone className="h-3 w-3 text-slate-400" />
                                {profile.phone}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-800">{emp.designation}</div>
                          <div className="text-xs text-slate-500 capitalize">{profile?.role || 'employee'}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {emp.joining_date || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isActive ? (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle className="h-3 w-3" /> Active
                            </Badge>
                          ) : (
                            <Badge variant="danger" className="gap-1">
                              <XCircle className="h-3 w-3" /> Inactive
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => openPermissionsModal(emp)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer"
                          >
                            <Settings2 className="h-3.5 w-3.5" />
                            Configure Modules
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant={isActive ? 'outline' : 'secondary'}
                            size="sm"
                            onClick={() => handleToggleStatus(emp)}
                          >
                            {isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: Daily & Monthly Reports */}
      {activeTab === 'performance' && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-200 px-6 py-4 bg-slate-50/50">
            <h3 className="text-sm font-semibold text-slate-900">
              Real-Time Daily & Monthly Activity Reports
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live breakdown of leads assigned today, calls logged, visits done, and monthly deals
            </p>
          </div>

          {!perfData?.performance || perfData.performance.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No data yet"
                description="No employee activity recorded yet."
                icon={TrendingUp}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3">Employee</th>
                    <th className="px-4 py-3 text-center">Today Leads</th>
                    <th className="px-4 py-3 text-center">Today Calls</th>
                    <th className="px-4 py-3 text-center">Today Visits</th>
                    <th className="px-4 py-3 text-center">Today Follow-ups</th>
                    <th className="px-4 py-3 text-center">Month Deals</th>
                    <th className="px-6 py-3 text-right">Month Brokerage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {perfData.performance.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="text-xs text-slate-500">{p.designation}</div>
                      </td>
                      <td className="px-4 py-4 text-center font-semibold text-slate-900">
                        {p.today.leadsAssigned}
                      </td>
                      <td className="px-4 py-4 text-center font-semibold text-emerald-600">
                        {p.today.callsLogged}
                      </td>
                      <td className="px-4 py-4 text-center font-semibold text-purple-600">
                        {p.today.visitsDone}
                      </td>
                      <td className="px-4 py-4 text-center font-semibold text-amber-600">
                        {p.today.followupsCompleted}
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-slate-900">
                        {p.thisMonth.dealsClosed}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-700">
                        ₹{p.thisMonth.brokerageEarned.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: Agent Leaderboard */}
      {activeTab === 'leaderboard' && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-200 px-6 py-4 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Award className="h-4.5 w-4.5 text-amber-500" />
                Agent Performance Leaderboard
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ranked by total deals closed and gross brokerage brought into the firm
              </p>
            </div>
          </div>

          {!perfData?.leaderboard || perfData.leaderboard.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No data yet"
                description="Leaderboard will rank agents as deals and brokerage are registered."
                icon={Award}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3">Rank</th>
                    <th className="px-6 py-3">Agent</th>
                    <th className="px-6 py-3">Designation</th>
                    <th className="px-4 py-3 text-center">Active Leads</th>
                    <th className="px-4 py-3 text-center">Deals Closed</th>
                    <th className="px-6 py-3 text-right">Total Brokerage Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {perfData.leaderboard.map((agent) => {
                    const rankBadge =
                      agent.rank === 1 ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-800 font-bold text-xs border border-amber-300">
                          1
                        </span>
                      ) : agent.rank === 2 ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300">
                          2
                        </span>
                      ) : agent.rank === 3 ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 text-amber-700 font-bold text-xs border border-amber-200">
                          3
                        </span>
                      ) : (
                        <span className="text-slate-400 font-semibold pl-2">{agent.rank}</span>
                      );

                    return (
                      <tr key={agent.employee_id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">{rankBadge}</td>
                        <td className="px-6 py-4 font-semibold text-slate-900">{agent.name}</td>
                        <td className="px-6 py-4 text-slate-500">{agent.designation}</td>
                        <td className="px-4 py-4 text-center font-medium text-slate-700">
                          {agent.active_leads}
                        </td>
                        <td className="px-4 py-4 text-center font-bold text-slate-900">
                          {agent.deals_closed}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-700">
                          ₹{agent.brokerage_earned.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Modal: Create Employee */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New Employee"
        description="Create credentials and profile for a new team member."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateEmployee} className="space-y-4">
          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
                placeholder="Rohan Sharma"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Role *
              </label>
              <select
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden bg-white"
              >
                <option value="employee">Employee (Agent)</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Email Address (Login) *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
                placeholder="rohan@diksharealestate.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Temporary Password *
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Designation *
              </label>
              <input
                type="text"
                required
                value={formData.designation}
                onChange={e => setFormData({ ...formData, designation: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
                placeholder="Senior Sales Executive"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
                placeholder="+91 98765 00000"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Joining Date
            </label>
            <input
              type="date"
              value={formData.joiningDate}
              onChange={e => setFormData({ ...formData, joiningDate: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              Create Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Configure Permissions */}
      <Modal
        isOpen={isEditPermsModalOpen}
        onClose={() => setIsEditPermsModalOpen(false)}
        title={`Module Access: ${selectedEmployee?.profile?.full_name || 'Agent'}`}
        description="Configure granular module view, create, edit, and delete permissions."
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-2.5">Module</th>
                  <th className="px-4 py-2.5 text-center">View</th>
                  <th className="px-4 py-2.5 text-center">Create</th>
                  <th className="px-4 py-2.5 text-center">Edit</th>
                  <th className="px-4 py-2.5 text-center">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {MODULES.map(mod => {
                  const currentMod = editingPermissions[mod.id] || {
                    view: false,
                    create: false,
                    edit: false,
                    delete: false,
                  };

                  return (
                    <tr key={mod.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-medium text-slate-800">
                        {mod.label}
                      </td>
                      {(['view', 'create', 'edit', 'delete'] as const).map(action => (
                        <td key={action} className="px-4 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={!!currentMod[action]}
                            onChange={e =>
                              handlePermissionChange(mod.id, action, e.target.checked)
                            }
                            className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditPermsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="gold"
              size="sm"
              isLoading={isSubmitting}
              onClick={handleSavePermissions}
            >
              Save Permissions
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
