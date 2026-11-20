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
  Edit,
  Trash2,
  ExternalLink,
  TrendingUp,
  X,
} from 'lucide-react';
import { ExpenseRecord } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ExpenseModal } from './expense-modal';
import { Expenses30DayChart, DailySpendPoint } from '@/components/charts/expenses-30day-chart';

export function ExpensesManagement() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [totals, setTotals] = useState<{
    thisMonthTotal: number;
    todayTotal: number;
    recordCount: number;
  }>({
    thisMonthTotal: 0,
    todayTotal: 0,
    recordCount: 0,
  });
  const [last30Days, setLast30Days] = useState<DailySpendPoint[]>([]);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
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
      if (fromDate && toDate) {
        params.set('from', fromDate);
        params.set('to', toDate);
      } else if (selectedMonth) {
        params.set('month', selectedMonth);
      }

      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setExpenses(json.expenses || []);
        if (json.totals) setTotals(json.totals);
        if (json.last30Days) setLast30Days(json.last30Days);
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
  }, [selectedMonth, fromDate, toDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchExpenses();
  };

  const clearDateRange = () => {
    setFromDate('');
    setToDate('');
    setSelectedDay(null);
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const params = new URLSearchParams();
      if (fromDate && toDate) {
        params.set('from', fromDate);
        params.set('to', toDate);
      } else if (selectedMonth) {
        params.set('month', selectedMonth);
      }

      const res = await fetch(`/api/expenses/export?${params.toString()}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Diksha_Expenses_Report_${fromDate ? `${fromDate}_to_${toDate}` : selectedMonth}.xlsx`;
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

  const handleDelete = async (id: string, headline: string) => {
    if (!window.confirm(`Are you sure you want to delete expense "${headline}"? This action is recorded in the audit log.`)) {
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

  // Filter expenses if a specific day is selected from the 30-day chart
  const displayedExpenses = selectedDay
    ? expenses.filter((e) => e.expense_date === selectedDay)
    : expenses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Office Expenses & Ledger
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Free-form tracking of operational outflows, tea/snacks, travel, utilities, and office bills.
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

      {/* 30-Day Daily Expenses Chart */}
      <Expenses30DayChart
        data={last30Days}
        monthTotal={totals.thisMonthTotal}
        todayTotal={totals.todayTotal}
        selectedDate={selectedDay}
        onSelectDate={setSelectedDay}
        variant="full"
      />

      {/* Filter and Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by headline, notes, or vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </form>

        {/* Date Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium">Month:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setFromDate('');
                setToDate('');
                setSelectedDay(null);
              }}
              className="bg-transparent border-none text-xs focus:outline-none cursor-pointer font-semibold text-slate-800"
            />
          </div>

          {/* Date range picker */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
            <span className="font-medium">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setSelectedDay(null);
              }}
              className="bg-transparent border-none text-xs focus:outline-none cursor-pointer text-slate-800"
            />
            <span className="font-medium">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setSelectedDay(null);
              }}
              className="bg-transparent border-none text-xs focus:outline-none cursor-pointer text-slate-800"
            />
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={clearDateRange}
                className="text-slate-400 hover:text-red-500 ml-1"
                title="Clear date range"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-amber-600" />
            <h3 className="font-semibold text-slate-900 text-sm">
              Expense Records {selectedDay ? `for ${selectedDay}` : `(${displayedExpenses.length})`}
            </h3>
          </div>
          {selectedDay && (
            <button
              onClick={() => setSelectedDay(null)}
              className="text-xs text-amber-700 hover:underline font-medium"
            >
              Clear day filter (show all)
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading office expenses...</div>
        ) : displayedExpenses.length === 0 ? (
          <EmptyState
            title="No data yet"
            description={
              selectedDay
                ? `No expenses recorded for ${selectedDay}.`
                : search
                ? `No expenses match "${search}".`
                : 'No office expenses recorded for this period yet.'
            }
            actionText="Record First Expense"
            onAction={openCreateModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Headline / Description</th>
                  <th className="py-3 px-4 font-semibold">Amount</th>
                  <th className="py-3 px-4 font-semibold">Paid To</th>
                  <th className="py-3 px-4 font-semibold">Added By</th>
                  <th className="py-3 px-4 font-semibold">Notes</th>
                  <th className="py-3 px-4 font-semibold">Receipt</th>
                  {isAdmin && <th className="py-3 px-4 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedExpenses.map((exp) => {
                  const displayHeadline = exp.headline || exp.title || 'Expense';
                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                        {exp.expense_date}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 text-sm block">
                          {displayHeadline}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900 text-sm">
                          ₹{Number(exp.amount).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                        {exp.paid_to || '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {exp.employee?.profile?.full_name || 'Admin'}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-500">
                        {exp.notes || '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {exp.receipt_url ? (
                          <a
                            href={exp.receipt_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-800 font-medium underline"
                          >
                            <ExternalLink className="h-3 w-3" /> View
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(exp)}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                              title="Edit Expense"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(exp.id, displayHeadline)}
                              disabled={deletingId === exp.id}
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                              title="Delete Expense"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchExpenses()}
        expenseToEdit={editingExpense}
      />
    </div>
  );
}
