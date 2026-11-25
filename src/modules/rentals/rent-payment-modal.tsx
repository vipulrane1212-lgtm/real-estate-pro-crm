'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { RentalRecord, RentPaymentStatus } from '@/lib/supabase/types';

interface RentPaymentModalProps {
  isOpen: boolean;
  rental: RentalRecord | null;
  defaultMonth?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RentPaymentModal({
  isOpen,
  rental,
  defaultMonth,
  onClose,
  onSuccess,
}: RentPaymentModalProps) {
  const [monthYear, setMonthYear] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<RentPaymentStatus>('paid');
  const [paidDate, setPaidDate] = useState('');
  const [paymentMode, setPaymentMode] = useState<'upi' | 'bank_transfer' | 'cash' | 'cheque'>('upi');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen && rental) {
      const currentYm = defaultMonth || new Date().toISOString().slice(0, 7);
      setMonthYear(currentYm);
      setAmount(String(rental.monthly_rent));
      setPaidDate(new Date().toISOString().split('T')[0]);
      setStatus('paid');
      setPaymentMode('upi');
      setTransactionRef('');
      setNotes('');
      setErrorMessage('');
    }
  }, [isOpen, rental, defaultMonth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rental) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch(`/api/rentals/${rental.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month_year: monthYear,
          amount: Number(amount),
          status,
          paid_date: status === 'paid' ? paidDate : null,
          payment_mode: paymentMode,
          transaction_reference: transactionRef || null,
          notes: notes || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record rent collection');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error recording payment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Record Rent Collection: ${rental?.tenant_name || ''}`}
      description={`Agreement #${rental?.rental_number || ''} • Monthly rent: ₹${Number(rental?.monthly_rent || 0).toLocaleString('en-IN')}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Rent Month (YYYY-MM) *
            </label>
            <input
              type="month"
              required
              value={monthYear}
              onChange={(e) => setMonthYear(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Amount (₹) *
            </label>
            <input
              type="number"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Payment Status *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as RentPaymentStatus)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden bg-white"
            >
              <option value="paid">Paid (Collected)</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {status === 'paid' && (
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Payment Mode *
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as 'upi' | 'bank_transfer' | 'cash' | 'cheque')}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden bg-white"
              >
                <option value="upi">UPI / GPay / PhonePe</option>
                <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          )}
        </div>

        {status === 'paid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Paid Date *
              </label>
              <input
                type="date"
                required
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Transaction Ref / Cheque No
              </label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="UPI ref or UTR / Cheque #"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700">
            Notes / Receipt Remarks
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Received via tenant GPay transfer..."
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isLoading}
          >
            Save Collection Status
          </Button>
        </div>
      </form>
    </Modal>
  );
}
