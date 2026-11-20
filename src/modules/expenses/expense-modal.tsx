'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { ExpenseRecord } from '@/lib/supabase/types';
import {
  IndianRupee,
  Calendar,
  Upload,
  FileText,
  AlertCircle,
  X,
  Receipt,
  User,
} from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  expenseToEdit?: ExpenseRecord | null;
}

export function ExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  expenseToEdit,
}: ExpenseModalProps) {
  const [headline, setHeadline] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (expenseToEdit) {
        setHeadline(expenseToEdit.headline || expenseToEdit.title || String(expenseToEdit.category || ''));
        setAmount(String(expenseToEdit.amount));
        setExpenseDate(expenseToEdit.expense_date);
        setPaidTo(expenseToEdit.paid_to || '');
        setNotes(expenseToEdit.notes || '');
        setReceiptUrl(expenseToEdit.receipt_url || null);
      } else {
        setHeadline('');
        setAmount('');
        setExpenseDate(new Date().toISOString().split('T')[0]);
        setPaidTo('');
        setNotes('');
        setReceiptUrl(null);
      }
      setReceiptFile(null);
      setErrorMessage('');
    }
  }, [isOpen, expenseToEdit]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headline.trim()) {
      setErrorMessage('Please enter an expense headline (e.g. Chai, Kharcha Pani, Office Rent, Petrol)');
      return;
    }
    const numAmt = Number(amount);
    if (!amount || isNaN(numAmt) || numAmt <= 0) {
      setErrorMessage('Please enter a valid amount in INR');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      let finalReceiptUrl = receiptUrl;

      // Upload receipt file if newly selected
      if (receiptFile) {
        const formData = new FormData();
        formData.append('file', receiptFile);
        formData.append('bucket', 'expenses');

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || 'Failed to upload receipt');
        }

        const uploadJson = await uploadRes.json();
        finalReceiptUrl = uploadJson.url;
      }

      const payload = {
        headline: headline.trim(),
        title: headline.trim(),
        amount: numAmt,
        expense_date: expenseDate || new Date().toISOString().split('T')[0],
        paid_to: paidTo.trim() || null,
        notes: notes.trim() || null,
        receipt_url: finalReceiptUrl,
      };

      const url = expenseToEdit ? `/api/expenses/${expenseToEdit.id}` : '/api/expenses';
      const method = expenseToEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to save expense');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Error saving expense:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Error saving expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={expenseToEdit ? 'Edit Office Expense' : 'Record Office Expense'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Free-form Headline */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Expense Headline / Description <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. Chai / Nashta, Kharcha Pani, Office Rent, Petrol, Client lunch..."
            className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Free-form entry — type any category or operational expense title freely.
          </p>
        </div>

        {/* Amount & Date in Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Total Amount (₹) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="number"
                step="any"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full text-sm pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Expense Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full text-sm pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Paid To / Vendor */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Paid To / Vendor / Person (Optional)
          </label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={paidTo}
              onChange={(e) => setPaidTo(e.target.value)}
              placeholder="e.g. Ramesh Chaiwala, Landlord, HP Petrol Pump"
              className="w-full text-sm pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Notes (Optional) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Notes / Remarks (Optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional details, bill numbers, or purpose..."
            className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Receipt / Photo upload */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Bill / Receipt Photo (Optional)
          </label>
          {receiptUrl && !receiptFile ? (
            <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <div className="flex items-center gap-2 truncate">
                <Receipt className="h-4 w-4 text-amber-600 shrink-0" />
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-700 hover:underline truncate"
                >
                  View Attached Receipt
                </a>
              </div>
              <button
                type="button"
                onClick={() => setReceiptUrl(null)}
                className="text-slate-400 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : receiptFile ? (
            <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <span className="truncate text-slate-700">{receiptFile.name}</span>
              <button
                type="button"
                onClick={() => setReceiptFile(null)}
                className="text-slate-400 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-lg p-3 text-center cursor-pointer relative">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="h-5 w-5 text-slate-400 mx-auto mb-1" />
              <p className="text-xs text-slate-600 font-medium">Click to upload bill / receipt</p>
              <p className="text-[10px] text-slate-400">PNG, JPG, PDF up to 10MB</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-amber-600 hover:bg-amber-700 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : expenseToEdit ? 'Update Expense' : 'Save Expense'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
