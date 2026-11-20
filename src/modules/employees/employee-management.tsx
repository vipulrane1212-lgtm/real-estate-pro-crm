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
} from 'lucide-react';
import { Employee, EmployeePermissions } from '@/lib/supabase/types';
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

export function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Editing permissions state
  const [editingPermissions, setEditingPermissions] = useState<EmployeePermissions>({});

  const fetchEmployees = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error('Failed to load employee directory:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
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
      });
      fetchEmployees();
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

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Employee & Access Control
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage agents, account activation, and granular module permissions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchEmployees}
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

      {/* Employee List Table or Empty State */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-200 px-6 py-4 bg-slate-50/50">
          <h3 className="text-sm font-semibold text-slate-900">
            Team Roster ({employees.length})
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
                  <th className="px-6 py-3">Designation</th>
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
                        <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                          {profile?.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {profile.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium">
                        {emp.designation}
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

      {/* Modal: Edit Permissions Matrix */}
      <Modal
        isOpen={isEditPermsModalOpen}
        onClose={() => setIsEditPermsModalOpen(false)}
        title={`Module Permissions: ${selectedEmployee?.profile?.full_name || 'Employee'}`}
        description="Configure granular module access. Changes apply immediately upon save."
        maxWidth="xl"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
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
