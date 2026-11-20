'use client';

import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Plus,
  Search,
  RefreshCw,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  Mail,
  Building2,
  CreditCard,
  RotateCcw,
  IndianRupee,
  ChevronDown,
  ChevronUp,
  History,
  Check,
  Loader2,
} from 'lucide-react';
import { RentalRecord, RentalStatus, RentPaymentRecord } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { RentalModal } from './rental-modal';
import { RentPaymentModal } from './rent-payment-modal';

export function RentalsManagement() {
  const [rentals, setRentals] = useState<RentalRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedRentalForPayment, setSelectedRentalForPayment] = useState<RentalRecord | null>(null);

  // Renewal Modal
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);
  const [selectedRentalForRenewal, setSelectedRentalForRenewal] = useState<RentalRecord | null>(null);
  const [newRentAmount, setNewRentAmount] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [isRenewing, setIsRenewing] = useState(false);

  // Expandable payment history
  const [expandedRentalId, setExpandedRentalId] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState('');

  const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

  const fetchRentals = async () => {
    try {
      setIsRefreshing(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/rentals?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRentals(data.rentals || []);
      }
    } catch (err) {
      console.error('Failed to load rentals:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRentals();
  }, [statusFilter, search]);

  const openPaymentModal = (rental: RentalRecord) => {
    setSelectedRentalForPayment(rental);
    setPaymentModalOpen(true);
  };

  const openRenewalModal = (rental: RentalRecord) => {
    setSelectedRentalForRenewal(rental);
    setNewRentAmount(String(rental.monthly_rent));
    // Calculate new end date (+11 months from current end date or today)
    const baseDate = new Date(rental.agreement_end_date || new Date().toISOString());
    baseDate.setMonth(baseDate.getMonth() + 11);
    setNewEndDate(baseDate.toISOString().split('T')[0]);
    setRenewalModalOpen(true);
  };

  const handleRenewalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRentalForRenewal) return;

    setIsRenewing(true);
    try {
      const res = await fetch(`/api/rentals/${selectedRentalForRenewal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreement_end_date: newEndDate,
          monthly_rent: Number(newRentAmount),
          status: 'active',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to renew agreement');

      setRenewalModalOpen(false);
      setSelectedRentalForRenewal(null);
      setSuccessBanner(`Rental agreement #${data.rental.rental_number} successfully renewed until ${newEndDate}!`);
      setTimeout(() => setSuccessBanner(''), 5000);
      fetchRentals();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error renewing agreement');
    } finally {
      setIsRenewing(false);
    }
  };

  // Quick 1-click Mark Paid for current month
  const handleQuickMarkPaid = async (rental: RentalRecord) => {
    try {
      const res = await fetch(`/api/rentals/${rental.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month_year: currentMonth,
          amount: rental.monthly_rent,
          status: 'paid',
          paid_date: new Date().toISOString().split('T')[0],
          payment_mode: 'upi',
          notes: 'Marked paid via quick action',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record payment');
      }

      setSuccessBanner(`Rent for ${currentMonth} marked as Collected for ${rental.tenant_name}`);
      setTimeout(() => setSuccessBanner(''), 5000);
      fetchRentals();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error marking rent paid');
    }
  };

  // Helper to compute expiry info
  const getExpiryInfo = (endDateStr: string) => {
    if (!endDateStr) return { days: 0, isExpiringSoon: false, isExpired: false };
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const end = new Date(endDateStr);
    end.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      days: diffDays,
      isExpiringSoon: diffDays >= 0 && diffDays <= 30,
      isExpired: diffDays < 0,
    };
  };

  // Collection Summary for current month
  const totalActiveRentals = rentals.filter((r) => r.status === 'active').length;
  let totalExpectedMonthRent = 0;
  let totalCollectedMonthRent = 0;
  let pendingCollectionCount = 0;

  rentals.forEach((r) => {
    if (r.status === 'active') {
      totalExpectedMonthRent += Number(r.monthly_rent || 0);
      const currPayment = r.payments?.find((p) => p.month_year === currentMonth);
      if (currPayment?.status === 'paid') {
        totalCollectedMonthRent += Number(currPayment.amount || r.monthly_rent);
      } else {
        pendingCollectionCount++;
      }
    }
  });

  // Expiring agreements list for highlight widget
  const expiringRentals = rentals.filter((r) => {
    if (r.status !== 'active') return false;
    const { isExpiringSoon, isExpired } = getExpiryInfo(r.agreement_end_date);
    return isExpiringSoon || isExpired;
  });

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Rentals & Tenancy Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track rental agreements, monthly rent collections, 11-month lease expirations, and renewals
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRentals}
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
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            New Rental Agreement
          </Button>
        </div>
      </div>

      {successBanner && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          {successBanner}
        </div>
      )}

      {/* Expiry Alerts Banner if any expiring within 30 days */}
      {expiringRentals.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span>Attention: {expiringRentals.length} Rental Agreement{expiringRentals.length > 1 ? 's' : ''} Expiring Soon / Expired</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {expiringRentals.map((r) => {
              const { days, isExpired } = getExpiryInfo(r.agreement_end_date);
              return (
                <div
                  key={r.id}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    isExpired
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  <span>
                    #{r.rental_number} ({r.tenant_name}) — {isExpired ? 'EXPIRED' : `${days} days left`}
                  </span>
                  <button
                    onClick={() => openRenewalModal(r)}
                    className="ml-1 underline font-bold hover:text-amber-950 cursor-pointer"
                  >
                    Renew
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Rentals
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <KeyRound className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalActiveRentals}</span>
            <span className="text-xs text-slate-500">properties leased</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Expected Rent ({currentMonth})
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <IndianRupee className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              ₹{totalExpectedMonthRent.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-500">monthly dues</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Collected Rent ({currentMonth})
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">
              ₹{totalCollectedMonthRent.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-500">received</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pending Collections
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <Clock className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600">{pendingCollectionCount}</span>
            <span className="text-xs text-slate-500">tenants pending</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'active', 'pending_booking', 'notice_period', 'completed', 'terminated'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tenant, property, agreement..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs focus:border-slate-900 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Rentals Table or Empty State */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-200 px-6 py-4 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Rental Agreements Registry ({rentals.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            <span className="ml-2 text-sm text-slate-500">Loading rentals registry...</span>
          </div>
        ) : rentals.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No data yet"
              description="No rental agreements found. Click 'New Rental Agreement' to register your first lease."
              icon={KeyRound}
              actionText="New Rental Agreement"
              onAction={() => setIsCreateModalOpen(true)}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">Agreement & Property</th>
                  <th className="px-6 py-3">Tenant</th>
                  <th className="px-4 py-3">Rent & Deposit</th>
                  <th className="px-6 py-3">Lease Period</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-6 py-3">Current Month ({currentMonth})</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {rentals.map((rental) => {
                  const expiry = getExpiryInfo(rental.agreement_end_date);
                  const currentMonthPayment = rental.payments?.find(
                    (p) => p.month_year === currentMonth
                  );
                  const isCurrentPaid = currentMonthPayment?.status === 'paid';
                  const isExpanded = expandedRentalId === rental.id;

                  return (
                    <React.Fragment key={rental.id}>
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        {/* Agreement & Property */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                              #RNT-{rental.rental_number}
                            </span>
                          </div>
                          <div className="font-medium text-slate-800 mt-0.5">
                            {rental.property?.title || 'Property'}
                          </div>
                          <div className="text-xs text-slate-500">
                            {rental.property?.location || rental.property?.address || 'Lucknow'}
                          </div>
                        </td>

                        {/* Tenant */}
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{rental.tenant_name}</div>
                          <div className="mt-1 flex flex-col gap-0.5 text-xs text-slate-500">
                            <a
                              href={`tel:${rental.tenant_phone}`}
                              className="flex items-center gap-1 hover:text-amber-600"
                            >
                              <Phone className="h-3 w-3 text-slate-400" />
                              {rental.tenant_phone}
                            </a>
                            {rental.tenant_email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3 text-slate-400" />
                                {rental.tenant_email}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Rent & Deposit */}
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-900">
                            ₹{rental.monthly_rent.toLocaleString('en-IN')}/mo
                          </div>
                          <div className="text-xs text-slate-500">
                            Deposit: ₹{rental.deposit_amount.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Due day: {rental.rent_due_day}th of month
                          </div>
                        </td>

                        {/* Lease Period */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-xs text-slate-700">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>{rental.agreement_start_date} to {rental.agreement_end_date}</span>
                          </div>
                          <div className="mt-1">
                            {expiry.isExpired ? (
                              <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                                Expired ({Math.abs(expiry.days)} days ago)
                              </span>
                            ) : expiry.isExpiringSoon ? (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                                <AlertTriangle className="h-3 w-3 text-amber-600" />
                                {expiry.days} days remaining
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                {expiry.days} days remaining
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Agreement Status */}
                        <td className="px-4 py-4">
                          <Badge
                            variant={
                              rental.status === 'active'
                                ? 'success'
                                : rental.status === 'notice_period'
                                ? 'warning'
                                : 'default'
                            }
                            className="capitalize text-xs"
                          >
                            {rental.status.replace('_', ' ')}
                          </Badge>
                        </td>

                        {/* Current Month Rent Collection */}
                        <td className="px-6 py-4">
                          {isCurrentPaid ? (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                                <Check className="h-3.5 w-3.5" /> Paid
                              </span>
                              <span className="text-[11px] text-slate-400">
                                ({currentMonthPayment?.payment_mode?.toUpperCase()})
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                                <Clock className="h-3.5 w-3.5" /> Pending
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickMarkPaid(rental)}
                                className="h-7 text-xs px-2 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                              >
                                Mark Paid
                              </Button>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPaymentModal(rental)}
                              title="Record or Update Payment"
                            >
                              <CreditCard className="h-3.5 w-3.5 mr-1" />
                              Pay
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRenewalModal(rental)}
                              title="Renew Agreement (Extend 11 Months)"
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-1" />
                              Renew
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setExpandedRentalId(isExpanded ? null : rental.id)
                              }
                              title="View Collection History"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Payment History Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={7} className="px-8 py-4">
                            <div className="rounded-lg border border-slate-200 bg-white p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                  <History className="h-4 w-4 text-amber-500" />
                                  Payment & Collection History (Agreement #{rental.rental_number})
                                </h4>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openPaymentModal(rental)}
                                >
                                  + Record Month Payment
                                </Button>
                              </div>

                              {!rental.payments || rental.payments.length === 0 ? (
                                <div className="text-xs text-slate-400 py-3 text-center">
                                  No payment collection records found yet.
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase">
                                      <tr>
                                        <th className="px-3 py-2">Month</th>
                                        <th className="px-3 py-2">Due Date</th>
                                        <th className="px-3 py-2">Amount</th>
                                        <th className="px-3 py-2">Status</th>
                                        <th className="px-3 py-2">Paid Date</th>
                                        <th className="px-3 py-2">Mode</th>
                                        <th className="px-3 py-2">Ref / Notes</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {rental.payments.map((p) => (
                                        <tr key={p.id}>
                                          <td className="px-3 py-2 font-bold text-slate-900">
                                            {p.month_year}
                                          </td>
                                          <td className="px-3 py-2 text-slate-600">{p.due_date}</td>
                                          <td className="px-3 py-2 font-semibold text-slate-900">
                                            ₹{p.amount.toLocaleString('en-IN')}
                                          </td>
                                          <td className="px-3 py-2">
                                            <span
                                              className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                                p.status === 'paid'
                                                  ? 'bg-emerald-100 text-emerald-800'
                                                  : p.status === 'overdue'
                                                  ? 'bg-rose-100 text-rose-800'
                                                  : 'bg-amber-100 text-amber-800'
                                              }`}
                                            >
                                              {p.status}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 text-slate-600">
                                            {p.paid_date || '—'}
                                          </td>
                                          <td className="px-3 py-2 uppercase text-slate-600">
                                            {p.payment_mode || '—'}
                                          </td>
                                          <td className="px-3 py-2 text-slate-500">
                                            {p.transaction_reference || p.notes || '—'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* New Rental Modal */}
      <RentalModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setSuccessBanner('New rental agreement successfully registered.');
          setTimeout(() => setSuccessBanner(''), 5000);
          fetchRentals();
        }}
      />

      {/* Record Rent Payment Modal */}
      <RentPaymentModal
        isOpen={paymentModalOpen}
        rental={selectedRentalForPayment}
        defaultMonth={currentMonth}
        onClose={() => setPaymentModalOpen(false)}
        onSuccess={() => {
          setSuccessBanner('Rent collection status successfully updated.');
          setTimeout(() => setSuccessBanner(''), 5000);
          fetchRentals();
        }}
      />

      {/* Renewal Modal */}
      <Modal
        isOpen={renewalModalOpen}
        onClose={() => setRenewalModalOpen(false)}
        title={`Renew Agreement: #${selectedRentalForRenewal?.rental_number}`}
        description={`Extend tenancy for ${selectedRentalForRenewal?.tenant_name} by standard 11 months.`}
        maxWidth="md"
      >
        <form onSubmit={handleRenewalSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700">
              New Monthly Rent (₹) *
            </label>
            <input
              type="number"
              required
              value={newRentAmount}
              onChange={(e) => setNewRentAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              New Agreement End Date (+11 Months) *
            </label>
            <input
              type="date"
              required
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRenewalModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isRenewing}
            >
              Confirm 11-Month Renewal
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
