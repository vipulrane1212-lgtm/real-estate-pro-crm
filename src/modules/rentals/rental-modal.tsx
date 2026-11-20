'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Property, Employee, RentalStatus } from '@/lib/supabase/types';

interface RentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RentalModal({ isOpen, onClose, onSuccess }: RentalModalProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');

  // Form Fields
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [agentId, setAgentId] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [rentDueDay, setRentDueDay] = useState('5');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [brokeragePct, setBrokeragePct] = useState('2.0');
  const [bookingAmount, setBookingAmount] = useState('');
  const [status, setStatus] = useState<RentalStatus>('active');
  const [notes, setNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-calculate 11-month end date on start date change
  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (val) {
      const d = new Date(val);
      d.setMonth(d.getMonth() + 11);
      // Subtract 1 day for 11 months minus one day standard agreement
      d.setDate(d.getDate() - 1);
      setEndDate(d.toISOString().split('T')[0]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Default dates
      const today = new Date().toISOString().split('T')[0];
      handleStartDateChange(today);

      // Load properties
      fetch('/api/properties')
        .then((res) => res.json())
        .then((data) => {
          if (data.properties) {
            setProperties(data.properties);
          }
        })
        .catch(console.error);

      // Load employees
      fetch('/api/employees')
        .then((res) => res.json())
        .then((data) => {
          if (data.employees) {
            setEmployees(data.employees);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  // When property is selected, auto-fill owner & suggested rent
  const handlePropertyChange = (propId: string) => {
    setSelectedPropertyId(propId);
    const prop = properties.find((p) => p.id === propId);
    if (prop) {
      if (prop.owner_name) setOwnerName(prop.owner_name);
      if (prop.owner_phone) setOwnerPhone(prop.owner_phone);
      if (prop.price && (!monthlyRent || monthlyRent === '0')) {
        // If property is rental listing type, price is monthly rent
        setMonthlyRent(String(prop.price));
      }
      if (prop.assigned_agent_id) {
        setAgentId(prop.assigned_agent_id);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/rentals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: selectedPropertyId,
          tenant_name: tenantName,
          tenant_phone: tenantPhone,
          tenant_email: tenantEmail || null,
          tenant_id: tenantId || null,
          owner_name: ownerName || null,
          owner_phone: ownerPhone || null,
          agent_id: agentId || null,
          monthly_rent: Number(monthlyRent),
          deposit_amount: Number(depositAmount) || 0,
          rent_due_day: Number(rentDueDay) || 5,
          agreement_start_date: startDate,
          agreement_end_date: endDate,
          brokerage_percentage: Number(brokeragePct) || 2.0,
          booking_amount: Number(bookingAmount) || 0,
          status,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create rental agreement');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error submitting rental');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Rental Agreement"
      description="Create a formal tenancy contract, link inventory property, and schedule monthly collection."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Property Select */}
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Select Property *
          </label>
          <select
            required
            value={selectedPropertyId}
            onChange={(e) => handlePropertyChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden bg-white"
          >
            <option value="">-- Choose a Property --</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.property_code || 'PROP'}) - {p.location || p.city} [₹{p.price?.toLocaleString('en-IN')}]
              </option>
            ))}
          </select>
        </div>

        {/* Tenant Details */}
        <div className="border-t border-slate-100 pt-3">
          <h4 className="text-xs font-semibold text-slate-900 mb-2">Tenant Details</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Tenant Full Name *
              </label>
              <input
                type="text"
                required
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
                placeholder="Vikas Saxena"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Tenant Mobile Phone *
              </label>
              <input
                type="tel"
                required
                value={tenantPhone}
                onChange={(e) => setTenantPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Tenant Email
              </label>
              <input
                type="email"
                value={tenantEmail}
                onChange={(e) => setTenantEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
                placeholder="tenant@gmail.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Govt ID / Aadhaar / PAN
              </label>
              <input
                type="text"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
                placeholder="ABCD1234E or Aadhaar"
              />
            </div>
          </div>
        </div>

        {/* Owner Details */}
        <div className="border-t border-slate-100 pt-3">
          <h4 className="text-xs font-semibold text-slate-900 mb-2">Owner / Landlord Details</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Owner Name
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
                placeholder="Ramesh Gupta"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Owner Phone
              </label>
              <input
                type="tel"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
                placeholder="+91 98765 00000"
              />
            </div>
          </div>
        </div>

        {/* Financials & Dates */}
        <div className="border-t border-slate-100 pt-3">
          <h4 className="text-xs font-semibold text-slate-900 mb-2">Rent & Agreement Terms</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Monthly Rent (₹) *
              </label>
              <input
                type="number"
                required
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
                placeholder="e.g. 25000"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Security Deposit (₹)
              </label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
                placeholder="e.g. 50000"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Rent Due Day of Month
              </label>
              <input
                type="number"
                min={1}
                max={28}
                value={rentDueDay}
                onChange={(e) => setRentDueDay(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
                placeholder="5"
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Agreement Start Date *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Agreement End Date (Default 11 Months) *
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Brokerage Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={brokeragePct}
                onChange={(e) => setBrokeragePct(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
                placeholder="2.0"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Assigned Agent
              </label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden bg-white"
              >
                <option value="">-- Assign Agent --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.profile?.full_name || 'Agent'} ({emp.designation})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RentalStatus)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden bg-white"
              >
                <option value="active">Active</option>
                <option value="pending_booking">Pending Booking</option>
                <option value="notice_period">Notice Period</option>
                <option value="completed">Completed</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700">
            Agreement Notes / Special Clauses
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
            placeholder="e.g. 10% annual escalation, 1 month notice period required..."
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
            Register Rental Agreement
          </Button>
        </div>
      </form>
    </Modal>
  );
}
