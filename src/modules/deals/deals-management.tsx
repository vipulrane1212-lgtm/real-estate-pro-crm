'use client';

import React, { useState, useEffect } from 'react';
import {
  Handshake,
  IndianRupee,
  Building2,
  Calendar,
  Percent,
  Search,
  RefreshCw,
  Plus,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  CreditCard,
  Trash2,
} from 'lucide-react';
import { Deal, BrokerageRecord } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { DealModal } from './deal-modal';

function formatCurrencyINR(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} Lakh`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function DealsManagement() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [brokerage, setBrokerage] = useState<BrokerageRecord[]>([]);
  const [totals, setTotals] = useState({ allTime: 0, thisMonth: 0, paid: 0, pending: 0 });
  const [leads, setLeads] = useState<Array<{ id: string; full_name: string; phone: string }>>([]);
  const [properties, setProperties] = useState<Array<{ id: string; title: string; price?: number }>>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; designation: string; profile?: { full_name: string } }>>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Tabs: 'deals' | 'brokerage'
  const [activeTab, setActiveTab] = useState<'deals' | 'brokerage'>('deals');
  const [search, setSearch] = useState('');

  // Modals
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [payingRecord, setPayingRecord] = useState<BrokerageRecord | null>(null);
  const [paidInput, setPaidInput] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  const fetchData = async () => {
    try {
      const [dealsRes, brokRes, authRes, leadsRes, propsRes, empsRes] = await Promise.all([
        fetch('/api/deals'),
        fetch('/api/brokerage'),
        fetch('/api/auth/me'),
        fetch('/api/leads'),
        fetch('/api/properties'),
        fetch('/api/employees'),
      ]);

      if (dealsRes.ok) {
        const dd = await dealsRes.json();
        setDeals(dd.deals || []);
      }
      if (brokRes.ok) {
        const bd = await brokRes.json();
        setBrokerage(bd.brokerage || []);
        if (bd.totals) setTotals(bd.totals);
      }
      if (authRes.ok) {
        const ad = await authRes.json();
        setIsAdmin(ad.role === 'admin' || ad.role === 'super_admin');
      }
      if (leadsRes.ok) {
        const ld = await leadsRes.json();
        setLeads(ld.leads || []);
      }
      if (propsRes.ok) {
        const pd = await propsRes.json();
        setProperties(pd.properties || []);
      }
      if (empsRes.ok) {
        const ed = await empsRes.json();
        setEmployees(ed.employees || []);
      }
    } catch (e) {
      console.error('Failed to load deals and brokerage data', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await fetchData();
      setIsLoading(false);
    };
    init();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingRecord) return;
    setIsSavingPayment(true);
    try {
      const res = await fetch('/api/brokerage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: payingRecord.id,
          paid_brokerage: Number(paidInput),
          payment_date: new Date().toISOString().split('T')[0],
        }),
      });

      if (res.ok) {
        setPayingRecord(null);
        await fetchData();
      }
    } catch (err) {
      console.error('Payment record error', err);
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleDeleteDeal = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deal and its brokerage record?')) return;
    try {
      const res = await fetch(`/api/deals/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error('Delete deal error', e);
    }
  };

  const filteredDeals = deals.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.lead?.full_name?.toLowerCase().includes(q) ||
      d.property?.title?.toLowerCase().includes(q) ||
      d.employee?.profile?.full_name?.toLowerCase().includes(q)
    );
  });

  const filteredBrokerage = brokerage.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.agent?.profile?.full_name?.toLowerCase().includes(q) ||
      b.deal?.lead?.full_name?.toLowerCase().includes(q) ||
      b.deal?.property?.title?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Deals & Brokerage Accounting
            </h1>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              {deals.length} Closed Deals
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Closed sales transactions, agency commissions, and agent brokerage disbursements
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={isRefreshing}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            onClick={() => setIsDealModalOpen(true)}
            className="bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5 shadow-xs font-semibold"
          >
            <Plus className="h-4 w-4" /> Close Deal
          </Button>
        </div>
      </div>

      {/* 4 Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 uppercase">
            <span>All-Time Brokerage</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {formatCurrencyINR(totals.allTime)}
          </p>
          <span className="text-[11px] text-slate-400">Total commission earned</span>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-amber-900 uppercase">
            <span>This Month</span>
            <Calendar className="h-4 w-4 text-amber-700" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-amber-900">
            {formatCurrencyINR(totals.thisMonth)}
          </p>
          <span className="text-[11px] text-amber-700">Commission booked this month</span>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-900 uppercase">
            <span>Disbursed / Paid</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-emerald-900">
            {formatCurrencyINR(totals.paid)}
          </p>
          <span className="text-[11px] text-emerald-700">Paid out to agents</span>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-blue-900 uppercase">
            <span>Pending Payout</span>
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-blue-900">
            {formatCurrencyINR(totals.pending)}
          </p>
          <span className="text-[11px] text-blue-700">Awaiting client payment</span>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
          <button
            onClick={() => setActiveTab('deals')}
            className={`rounded-md px-4 py-1.5 transition cursor-pointer ${
              activeTab === 'deals' ? 'bg-white font-bold text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Closed Deals List ({deals.length})
          </button>
          <button
            onClick={() => setActiveTab('brokerage')}
            className={`rounded-md px-4 py-1.5 transition cursor-pointer ${
              activeTab === 'brokerage' ? 'bg-white font-bold text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Brokerage Ledger ({brokerage.length})
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deals, clients, properties..."
            className="w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-3 text-xs focus:border-amber-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* TAB 1: DEALS LIST */}
      {activeTab === 'deals' && (
        <div>
          {isLoading ? (
            <div className="py-20 text-center text-sm text-slate-500">Loading closed deals...</div>
          ) : filteredDeals.length === 0 ? (
            <EmptyState
              title="No data yet"
              description="No closed deals have been recorded yet. When transactions finalize, record them here."
              icon={Handshake}
              actionText="Close First Deal"
              onAction={() => setIsDealModalOpen(true)}
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-3 pl-4 pr-2">Deal #</th>
                      <th className="px-3 py-3">Client</th>
                      <th className="px-3 py-3">Property</th>
                      <th className="px-3 py-3">Deal Value</th>
                      <th className="px-3 py-3">Brokerage %</th>
                      <th className="px-3 py-3">Commission Amount</th>
                      <th className="px-3 py-3">Closing Agent</th>
                      <th className="px-3 py-3">Closed Date</th>
                      <th className="py-3 pl-2 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDeals.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 pl-4 pr-2 font-mono font-semibold text-slate-700">
                          #{d.deal_number || d.id.slice(0, 6)}
                        </td>
                        <td className="px-3 py-3 font-semibold text-slate-900">
                          {d.lead?.full_name || 'Client'}
                        </td>
                        <td className="px-3 py-3 text-slate-800 font-medium">
                          {d.property?.title || 'Property'}
                        </td>
                        <td className="px-3 py-3 font-bold text-slate-900">
                          {formatCurrencyINR(d.deal_value)}
                        </td>
                        <td className="px-3 py-3 font-mono text-slate-600">
                          {d.brokerage_percentage}%
                        </td>
                        <td className="px-3 py-3 font-extrabold text-amber-700">
                          {formatCurrencyINR(d.commission_amount)}
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {d.employee?.profile?.full_name || 'Agent'}
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          {new Date(d.closed_date || d.deal_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 pl-2 pr-4 text-right">
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDeal(d.id)}
                              className="h-7 px-2 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BROKERAGE ACCOUNTING */}
      {activeTab === 'brokerage' && (
        <div>
          {isLoading ? (
            <div className="py-20 text-center text-sm text-slate-500">Loading brokerage ledger...</div>
          ) : filteredBrokerage.length === 0 ? (
            <EmptyState
              title="No data yet"
              description="Brokerage commission records will appear automatically when deals are closed."
              icon={DollarSign}
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-3 pl-4 pr-2">Deal Reference</th>
                      <th className="px-3 py-3">Agent</th>
                      <th className="px-3 py-3">Total Commission</th>
                      <th className="px-3 py-3">Paid Amount</th>
                      <th className="px-3 py-3">Pending Balance</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Last Payment</th>
                      <th className="py-3 pl-2 pr-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBrokerage.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 pl-4 pr-2 font-mono text-slate-700">
                          {b.deal?.property?.title ? (
                            <div>
                              <span className="font-semibold text-slate-900 block truncate max-w-xs">
                                {b.deal.property.title}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Client: {b.deal.lead?.full_name || 'Client'}
                              </span>
                            </div>
                          ) : (
                            `Deal #${b.deal_id?.slice(0, 8)}`
                          )}
                        </td>
                        <td className="px-3 py-3 font-semibold text-slate-900">
                          {b.agent?.profile?.full_name || 'Agent'}
                        </td>
                        <td className="px-3 py-3 font-bold text-slate-900">
                          {formatCurrencyINR(b.total_brokerage)}
                        </td>
                        <td className="px-3 py-3 font-mono text-emerald-700 font-semibold">
                          {formatCurrencyINR(b.paid_brokerage)}
                        </td>
                        <td className="px-3 py-3 font-mono text-amber-800 font-semibold">
                          {formatCurrencyINR(b.pending_brokerage)}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              b.payment_status === 'fully_paid'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : b.payment_status === 'partially_paid'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {b.payment_status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          {b.payment_date
                            ? new Date(b.payment_date).toLocaleDateString('en-IN')
                            : '—'}
                        </td>
                        <td className="py-3 pl-2 pr-4 text-right">
                          {isAdmin && b.payment_status !== 'fully_paid' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setPayingRecord(b);
                                setPaidInput(String(b.total_brokerage));
                              }}
                              className="h-7 text-xs bg-slate-900 text-white hover:bg-slate-800"
                            >
                              <CreditCard className="h-3 w-3 mr-1" /> Record Payment
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Deal Registration Modal */}
      <DealModal
        isOpen={isDealModalOpen}
        onClose={() => setIsDealModalOpen(false)}
        onSuccess={() => {
          fetchData();
        }}
        leads={leads}
        properties={properties}
        employees={employees}
      />

      {/* Payment Update Modal */}
      {payingRecord && (
        <Modal
          isOpen={Boolean(payingRecord)}
          onClose={() => setPayingRecord(null)}
          title="Disburse / Record Brokerage Payment"
          description={`Update commission paid to ${payingRecord.agent?.profile?.full_name || 'Agent'}.`}
          maxWidth="sm"
        >
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Total Brokerage</label>
              <p className="font-bold text-slate-900 text-sm">
                {formatCurrencyINR(payingRecord.total_brokerage)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount Paid To Date (INR)
              </label>
              <div className="relative">
                <IndianRupee className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="number"
                  required
                  min="0"
                  max={payingRecord.total_brokerage}
                  value={paidInput}
                  onChange={(e) => setPaidInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-xs focus:border-amber-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setPayingRecord(null)} disabled={isSavingPayment}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={isSavingPayment} className="bg-emerald-600 text-white hover:bg-emerald-700">
                Save Payment
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
