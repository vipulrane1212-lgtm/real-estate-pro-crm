'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { IndianRupee, Building2, User, Percent, Calendar, AlertCircle } from 'lucide-react';

interface DealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialLeadId?: string;
  initialPropertyId?: string;
  leads?: Array<{ id: string; full_name: string; phone: string }>;
  properties?: Array<{ id: string; title: string; price?: number }>;
  employees?: Array<{ id: string; designation: string; profile?: { full_name: string } }>;
}

function formatCurrencyINR(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} Lakh`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function DealModal({
  isOpen,
  onClose,
  onSuccess,
  initialLeadId,
  initialPropertyId,
  leads = [],
  properties = [],
  employees = [],
}: DealModalProps) {
  const [leadId, setLeadId] = useState(initialLeadId || '');
  const [propertyId, setPropertyId] = useState(initialPropertyId || '');
  const [employeeId, setEmployeeId] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [brokeragePercent, setBrokeragePercent] = useState('2.0');
  const [status, setStatus] = useState<'closed_won' | 'in_progress' | 'cancelled'>('closed_won');
  const [closedDate, setClosedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [availableProperties, setAvailableProperties] = useState(properties);
  const [availableEmployees, setAvailableEmployees] = useState(employees);

  useEffect(() => {
    if (properties.length > 0) setAvailableProperties(properties);
    if (employees.length > 0) setAvailableEmployees(employees);
  }, [properties, employees]);

  useEffect(() => {
    if (isOpen) {
      if (initialLeadId) setLeadId(initialLeadId);
      if (initialPropertyId) {
        setPropertyId(initialPropertyId);
        const p = (availableProperties.length > 0 ? availableProperties : properties).find((item) => item.id === initialPropertyId);
        if (p?.price) setDealValue(String(p.price));
      } else {
        setDealValue('');
      }
      setBrokeragePercent('2.0');
      setStatus('closed_won');
      setClosedDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setErrorMessage('');

      if (availableProperties.length === 0) {
        fetch('/api/properties')
          .then((res) => res.json())
          .then((data) => {
            if (data.properties) {
              setAvailableProperties(data.properties);
              if (initialPropertyId) {
                const p = data.properties.find((item: { id: string; price?: number }) => item.id === initialPropertyId);
                if (p?.price) setDealValue(String(p.price));
              }
            }
          })
          .catch((e) => console.error(e));
      }

      if (availableEmployees.length === 0) {
        fetch('/api/employees')
          .then((res) => res.json())
          .then((data) => {
            if (data.employees) setAvailableEmployees(data.employees);
          })
          .catch((e) => console.error(e));
      }
    }
  }, [isOpen, initialLeadId, initialPropertyId, properties]);

  const handlePropertyChange = (pId: string) => {
    setPropertyId(pId);
    const p = availableProperties.find((item) => item.id === pId);
    if (p?.price) {
      setDealValue(String(p.price));
    }
  };

  const calculatedCommission =
    dealValue && Number(dealValue) > 0 && brokeragePercent
      ? Math.round((Number(dealValue) * Number(brokeragePercent)) / 100)
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId) {
      setErrorMessage('Please select a client lead');
      return;
    }
    if (!propertyId) {
      setErrorMessage('Please select a property');
      return;
    }
    if (!dealValue || Number(dealValue) <= 0) {
      setErrorMessage('Please provide a valid final deal value');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          property_id: propertyId,
          employee_id: employeeId || null,
          deal_value: Number(dealValue),
          brokerage_percentage: Number(brokeragePercent) || 2.0,
          status,
          closed_date: closedDate || new Date().toISOString().split('T')[0],
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record deal');

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Failed to save deal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Close / Register Property Deal"
      description="Record a finalized transaction, auto-calculate brokerage, and update client & inventory status."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Lead Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Client / Buyer <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
          >
            <option value="">-- Select Client --</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.full_name} ({l.phone})
              </option>
            ))}
          </select>
        </div>

        {/* Property Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Transacted Property <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={propertyId}
            onChange={(e) => handlePropertyChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
          >
            <option value="">-- Select Property --</option>
            {availableProperties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} {p.price ? `(List: ${formatCurrencyINR(p.price)})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Deal Value & Brokerage % */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Final Deal Value (INR) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <IndianRupee className="pointer-events-none absolute left-3 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="number"
                required
                min="1000"
                step="10000"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                placeholder="e.g. 7500000"
                className="w-full rounded-lg border border-slate-300 pl-8 pr-2 py-1.5 text-xs focus:border-amber-500 focus:outline-hidden"
              />
            </div>
            {dealValue && (
              <span className="text-[10px] font-semibold text-amber-700">
                {formatCurrencyINR(Number(dealValue))}
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Brokerage Percentage (%)
            </label>
            <div className="relative">
              <Percent className="pointer-events-none absolute left-3 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={brokeragePercent}
                onChange={(e) => setBrokeragePercent(e.target.value)}
                placeholder="2.0"
                className="w-full rounded-lg border border-slate-300 pl-8 pr-2 py-1.5 text-xs focus:border-amber-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Auto Commission Summary Box */}
        {calculatedCommission > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs flex items-center justify-between">
            <div>
              <span className="text-amber-900 font-semibold block">Total Agency Brokerage</span>
              <span className="text-[11px] text-amber-700">
                Calculated at {brokeragePercent}% of deal value
              </span>
            </div>
            <span className="text-sm font-extrabold text-amber-900 font-mono">
              {formatCurrencyINR(calculatedCommission)}
            </span>
          </div>
        )}

        {/* Closing Agent & Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Closing Agent
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-amber-500 focus:outline-hidden"
            >
              <option value="">-- Lead Assigned Agent --</option>
              {availableEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.profile?.full_name || 'Agent'} ({emp.designation})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Closed Date
            </label>
            <input
              type="date"
              required
              value={closedDate}
              onChange={(e) => setClosedDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-amber-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Transaction Remarks & Registry Terms
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Agreement signed, 10% advance received, registry scheduled..."
            className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-amber-500 focus:outline-hidden"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={isSubmitting}
            className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs font-bold"
          >
            Confirm & Close Deal
          </Button>
        </div>
      </form>
    </Modal>
  );
}
