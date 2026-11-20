'use client';

import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Search,
  RefreshCw,
  FileSpreadsheet,
  IndianRupee,
  Calendar,
  Tag,
  Edit,
  Trash2,
  ExternalLink,
  DollarSign,
  TrendingUp,
  PieChart,
} from 'lucide-react';
import { ExpenseRecord, ExpenseCategory } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ExpenseModal } from './expense-modal';

function formatCurrencyINR(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} Lakh`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

const CATEGORY_COLORS: Record<string, { label: string; color: string }> = {
  rent: { label: 'Rent & Office', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  electricity: { label: 'Utilities', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  tea_coffee: { label: 'Pantry / Tea', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  travel: { label: 'Travel & Fuel', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  marketing: { label: 'Marketing', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  stationery: { label: 'Stationery', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  salary_advance: { label: 'Salary Advance', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  other: { label: 'General / Other', color: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export function ExpensesManagement() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [totals, setTotals] = useState<{
    thisMonthTotal: number;
    categoryBreakdown: Record<string, number>;
    recordCount: number;
  }>({
    thisMonthTotal: 0,
    categoryBreakdown: {},
    recordCount: 0,
  });

  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const fetchExpenses = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    try {
      // Check auth role
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setIsAdmin(['super_admin', 'admin'].includes(meData.user?.role));
      }

      const params = new URLSearchParams();
      if (selectedMonth) params.set('month', selectedMonth);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setExpenses(json.expenses || []);
        if (json.totals) setTotals(json.totals);
      }
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [selectedMonth, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchExpenses();
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const params = new URLSearchParams();
      if (selectedMonth) params.set('month', selectedMonth);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);

      const res = await fetch(`/api/expenses/export?${params.toString()}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Diksha_Expenses_Report_${selectedMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export expenses report');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete expense "${title}"? This action is recorded in the audit log.`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchExpenses();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete expense');
      }
    } catch (e) {
      console.error(e);
      alert('Network error while deleting expense');
    } finally {
      setDeletingId(null);
    }
  };

  const openCreateModal = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };

  const openEditModal = (exp: ExpenseRecord) => {
    setEditingExpense(exp);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Office Expenses & Ledger
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track day-to-day administrative outflows, utilities, site travel, and petty cash.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchExpenses(true)}
            disabled={isRefreshing}
            className="border-slate-200"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-xs"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {isExportingExcel ? 'Exporting...' : 'Export to Excel (.xlsx)'}
          </Button>

          <Button
            size="sm"
            onClick={openCreateModal}
            className="bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-xs"
          >
            <Plus className="mr-2 h-4 w-4" />
            Record Expense
          </Button>
        </div>
      </div>

      {/* Top 3 KPI Financial Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Spend ({selectedMonth})
            </span>
            <div className="rounded-lg bg-rose-50 p-2 text-rose-600">
              <IndianRupee className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrencyINR(totals.thisMonthTotal)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Across {totals.recordCount} recorded expenditures</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Top Outflow Category
            </span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <PieChart className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg font-bold text-slate-900 capitalize">
              {Object.keys(totals.categoryBreakdown).length > 0
                ? Object.entries(totals.categoryBreakdown).sort((a, b) => b[1] - a[1])[0][0].replace('_', ' ')
                : 'None'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {Object.keys(totals.categoryBreakdown).length > 0
              ? formatCurrencyINR(Object.entries(totals.categoryBreakdown).sort((a, b) => b[1] - a[1])[0][1])
              : 'No expenses logged'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Current Billing Cycle
            </span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold tracking-tight text-slate-900">
              {new Date(`${selectedMonth}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Auto-balanced monthly expense cycle</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, vendor, or notes..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-hidden"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month Selector */}
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 font-medium focus:border-amber-500 focus:outline-hidden"
          />

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 font-medium focus:border-amber-500 focus:outline-hidden"
          >
            <option value="all">All Expense Categories</option>
            <option value="rent">Office Rent & Maintenance</option>
            <option value="electricity">Electricity & Utilities</option>
            <option value="tea_coffee">Tea / Coffee / Pantry</option>
            <option value="travel">Travel & Site Fuel</option>
            <option value="marketing">Marketing & Advertising</option>
            <option value="stationery">Stationery & Printing</option>
            <option value="salary_advance">Salary Advance</option>
            <option value="other">Other Operational</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState
            title="No data yet"
            description={`No office expenses recorded for ${selectedMonth}. Click "Record Expense" to log operational costs.`}
            icon={Receipt}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Expense Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Paid To</th>
                  <th className="py-3 px-4">Added By</th>
                  <th className="py-3 px-4">Receipt</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {expenses.map((exp) => {
                  const catMeta = CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.other;

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Date */}
                      <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                        {new Date(exp.expense_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Title & Notes */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{exp.title}</span>
                        {exp.notes && (
                          <span className="text-[10px] text-slate-400 block truncate max-w-xs">{exp.notes}</span>
                        )}
                      </td>

                      {/* Category Badge */}
                      <td className="py-3 px-4">
                        <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold ${catMeta.color}`}>
                          {catMeta.label}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrencyINR(exp.amount)}
                      </td>

                      {/* Paid To */}
                      <td className="py-3 px-4 text-slate-600">
                        {exp.paid_to || '—'}
                      </td>

                      {/* Added By */}
                      <td className="py-3 px-4 text-slate-600">
                        {exp.employee?.profile?.full_name || 'Admin'}
                      </td>

                      {/* Receipt */}
                      <td className="py-3 px-4">
                        {exp.receipt_url ? (
                          <a
                            href={exp.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-amber-700 hover:underline font-medium"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View Bill
                          </a>
                        ) : (
                          <span className="text-slate-400 text-[10px]">None</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(exp)}
                                className="text-slate-400 hover:text-slate-900 p-1"
                                title="Edit Expense (Admin)"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={deletingId === exp.id}
                                onClick={() => handleDelete(exp.id, exp.title)}
                                className="text-slate-400 hover:text-red-600 p-1"
                                title="Delete Expense (Admin)"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Expense Modal */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchExpenses(true);
        }}
        expenseToEdit={editingExpense}
      />
    </div>
  );
}
