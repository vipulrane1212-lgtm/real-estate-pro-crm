'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { ExpenseRecord, ExpenseCategory } from '@/lib/supabase/types';
import {
  IndianRupee,
  Calendar,
  Upload,
  FileText,
  AlertCircle,
  X,
  Receipt,
  Tag,
} from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  expenseToEdit?: ExpenseRecord | null;
}

const CATEGORIES: { id: ExpenseCategory; label: string }[] = [
  { id: 'rent', label: 'Office Rent & Maintenance' },
  { id: 'electricity', label: 'Electricity & Utilities' },
  { id: 'tea_coffee', label: 'Tea / Coffee / Pantry' },
  { id: 'travel', label: 'Travel & Site Fuel' },
  { id: 'marketing', label: 'Marketing & Advertising' },
  { id: 'stationery', label: 'Stationery & Printing' },
  { id: 'salary_advance', label: 'Salary Advance' },
  { id: 'other', label: 'Other Operational Expense' },
];

export function ExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  expenseToEdit,
}: ExpenseModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('other');
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
        setTitle(expenseToEdit.title);
        setCategory((expenseToEdit.category as ExpenseCategory) || 'other');
        setAmount(String(expenseToEdit.amount));
        setExpenseDate(expenseToEdit.expense_date);
        setPaidTo(expenseToEdit.paid_to || '');
        setNotes(expenseToEdit.notes || '');
        setReceiptUrl(expenseToEdit.receipt_url || null);
      } else {
        setTitle('');
        setCategory('tea_coffee');
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
    if (!title.trim()) {
      setErrorMessage('Please provide an expense title or description');
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

      // 1. Upload receipt if file selected
      if (receiptFile) {
        const formData = new FormData();
        formData.append('file', receiptFile);
        formData.append('bucket', 'expenses');

        const upRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!upRes.ok) {
          const upErr = await upRes.json();
          throw new Error(upErr.error || 'Failed to upload receipt');
        }

        const upData = await upRes.json();
        finalReceiptUrl = upData.publicUrl;
      }

      // 2. Submit record
      if (expenseToEdit) {
        // Edit existing
        const res = await fetch(`/api/expenses/${expenseToEdit.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            category,
            amount: numAmt,
            expense_date: expenseDate,
            paid_to: paidTo.trim() || null,
            notes: notes.trim() || null,
            receipt_url: finalReceiptUrl,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to update expense');
        }
      } else {
        // Create new
        const res = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            category,
            amount: numAmt,
            expense_date: expenseDate,
            paid_to: paidTo.trim() || null,
            notes: notes.trim() || null,
            receipt_url: finalReceiptUrl,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to record expense');
        }
      }

      onSuccess();
    } catch (err: unknown) {
      console.error('Expense submit error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={expenseToEdit ? 'Edit Office Expense' : 'Record Office Expense'}
      description="Track operational cash outflows, utility payments, and team expenditures."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Expense Title / Description <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. November Office Internet Bill, Client refreshments..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
          />
        </div>

        {/* Amount & Category */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Amount (INR) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <IndianRupee className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="number"
                min="1"
                step="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="2500"
                className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2 text-xs font-semibold focus:border-amber-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Expense Date & Paid To */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" /> Date of Expense <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Paid To / Vendor
            </label>
            <input
              type="text"
              value={paidTo}
              onChange={(e) => setPaidTo(e.target.value)}
              placeholder="e.g. Jio Fiber, Chai Point, Landlord"
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-amber-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Notes / Voucher Reference
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payment mode (UPI/Cash), receipt invoice number, or breakdown..."
            className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-amber-500 focus:outline-hidden"
          />
        </div>

        {/* Receipt Attachment */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Receipt / Bill Photo (Optional)
          </label>
          <div className="flex items-center gap-3">
            {receiptFile ? (
              <div className="flex items-center gap-2 rounded bg-slate-50 p-2 text-xs border border-slate-200 flex-1">
                <Receipt className="h-4 w-4 text-emerald-600" />
                <span className="truncate">{receiptFile.name}</span>
                <button
                  type="button"
                  onClick={() => setReceiptFile(null)}
                  className="ml-auto text-slate-400 hover:text-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : receiptUrl ? (
              <div className="flex items-center gap-2 rounded bg-slate-50 p-2 text-xs border border-slate-200 flex-1">
                <Receipt className="h-4 w-4 text-emerald-600" />
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-700 underline truncate"
                >
                  Current Receipt Attached
                </a>
                <button
                  type="button"
                  onClick={() => setReceiptUrl(null)}
                  className="ml-auto text-slate-400 hover:text-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs">
                <Upload className="h-3.5 w-3.5 text-slate-400" />
                Attach Receipt (JPG/PNG/PDF)
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={isSubmitting}
            className="bg-slate-900 hover:bg-slate-800 text-white font-medium"
          >
            {expenseToEdit ? 'Save Changes' : 'Record Expense'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
