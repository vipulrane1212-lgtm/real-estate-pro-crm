'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { DocumentType } from '@/lib/supabase/types';
import { Upload, FileText, Calendar, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialLeadId?: string;
  initialPropertyId?: string;
  initialDealId?: string;
  leads?: Array<{ id: string; full_name: string }>;
  properties?: Array<{ id: string; title: string }>;
  deals?: Array<{ id: string; deal_number: number }>;
}

const DOCUMENT_TYPES: { id: DocumentType; label: string; description: string }[] = [
  { id: 'aadhaar', label: 'Aadhaar Card', description: 'Client identity verification' },
  { id: 'pan', label: 'PAN Card', description: 'Tax registration & financial verification' },
  { id: 'agreement', label: 'Agreement / Sale Deed', description: 'Builder-buyer or buyer-seller contract' },
  { id: 'index_2', label: 'Index 2 / Title Deed', description: 'Registration document & chain of title' },
  { id: 'oc', label: 'Occupancy Certificate (OC)', description: 'Civic authority occupancy authorization' },
  { id: 'cc', label: 'Completion Certificate (CC)', description: 'Building plan completion compliance' },
  { id: 'rera', label: 'RERA Registration', description: 'Project RERA certification & disclosures' },
  { id: 'other', label: 'Other Document', description: 'Cheque copy, allotment letter, or NOC' },
];

export function DocumentUploadModal({
  isOpen,
  onClose,
  onSuccess,
  initialLeadId,
  initialPropertyId,
  initialDealId,
  leads = [],
  properties = [],
  deals = [],
}: DocumentUploadModalProps) {
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('aadhaar');
  const [file, setFile] = useState<File | null>(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [leadId, setLeadId] = useState(initialLeadId || '');
  const [propertyId, setPropertyId] = useState(initialPropertyId || '');
  const [dealId, setDealId] = useState(initialDealId || '');
  const [associationType, setAssociationType] = useState<'lead' | 'property' | 'deal' | 'general'>(
    initialDealId ? 'deal' : initialPropertyId ? 'property' : initialLeadId ? 'lead' : 'general'
  );

  const [availableLeads, setAvailableLeads] = useState(leads);
  const [availableProperties, setAvailableProperties] = useState(properties);
  const [availableDeals, setAvailableDeals] = useState(deals);

  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDocumentType('aadhaar');
      setFile(null);
      setExpiryDate('');
      setLeadId(initialLeadId || '');
      setPropertyId(initialPropertyId || '');
      setDealId(initialDealId || '');
      setAssociationType(
        initialDealId ? 'deal' : initialPropertyId ? 'property' : initialLeadId ? 'lead' : 'general'
      );
      setErrorMessage('');

      // Fetch associations if empty
      if (leads.length === 0) {
        fetch('/api/leads')
          .then((r) => r.json())
          .then((d) => {
            if (d.leads) setAvailableLeads(d.leads);
          })
          .catch((e) => console.error(e));
      }
      if (properties.length === 0) {
        fetch('/api/properties')
          .then((r) => r.json())
          .then((d) => {
            if (d.properties) setAvailableProperties(d.properties);
          })
          .catch((e) => console.error(e));
      }
      if (deals.length === 0) {
        fetch('/api/deals')
          .then((r) => r.json())
          .then((d) => {
            if (d.deals) setAvailableDeals(d.deals);
          })
          .catch((e) => console.error(e));
      }
    }
  }, [isOpen, initialLeadId, initialPropertyId, initialDealId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        // Default title to filename without extension
        const base = selected.name.replace(/\.[^/.]+$/, '');
        setTitle(base);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Please select a document file to upload (PDF, PNG, JPG)');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Please provide a document title');
      return;
    }

    setIsUploading(true);
    setErrorMessage('');

    try {
      // 1. Upload file locally
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'documents');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const upErr = await uploadRes.json();
        throw new Error(upErr.error || 'Failed to upload document file');
      }

      const upData = await uploadRes.json();
      const fileUrl = upData.publicUrl;

      // 2. Register document record
      const docRes = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          document_type: documentType,
          file_url: fileUrl,
          file_type: file.type || null,
          file_size: file.size || null,
          lead_id: associationType === 'lead' ? (leadId || null) : null,
          property_id: associationType === 'property' ? (propertyId || null) : null,
          deal_id: associationType === 'deal' ? (dealId || null) : null,
          expiry_date: expiryDate || null,
        }),
      });

      if (!docRes.ok) {
        const docErr = await docRes.json();
        throw new Error(docErr.error || 'Failed to register document');
      }

      onSuccess();
    } catch (err: unknown) {
      console.error('Upload document error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Document"
      description="Store client KYC, title deeds, contracts, or civic approvals locally."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* File Picker */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Document File (PDF / Images) <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300 p-4 hover:border-amber-500 transition-colors">
            {file ? (
              <div className="flex items-center justify-between w-full bg-slate-50 p-2.5 rounded border border-slate-200">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="h-5 w-5 text-amber-600 shrink-0" />
                  <div className="truncate text-xs">
                    <p className="font-semibold text-slate-800 truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="p-1 text-slate-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center cursor-pointer w-full">
                <Upload className="h-6 w-6 text-slate-400 mb-1" />
                <span className="text-xs font-medium text-slate-600">
                  Click to select file (PDF, JPG, PNG)
                </span>
                <span className="text-[10px] text-slate-400">Stored locally in CRM documents repository</span>
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Document Title */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Document Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Rajesh Varma - Aadhaar Card Front & Back"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
          />
        </div>

        {/* Document Type Dropdown */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Document Classification <span className="text-red-500">*</span>
          </label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
          >
            {DOCUMENT_TYPES.map((dt) => (
              <option key={dt.id} value={dt.id}>
                {dt.label} — {dt.description}
              </option>
            ))}
          </select>
        </div>

        {/* Record Association */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Associate Document With
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2">
            {[
              { id: 'lead', label: 'Client / Lead' },
              { id: 'property', label: 'Property' },
              { id: 'deal', label: 'Deal' },
              { id: 'general', label: 'General / Office' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setAssociationType(t.id as any)}
                className={`py-1.5 text-xs font-medium rounded border transition ${
                  associationType === t.id
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {associationType === 'lead' && (
            <select
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
            >
              <option value="">-- Select Client Lead --</option>
              {availableLeads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.full_name}
                </option>
              ))}
            </select>
          )}

          {associationType === 'property' && (
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
            >
              <option value="">-- Select Property --</option>
              {availableProperties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          )}

          {associationType === 'deal' && (
            <select
              value={dealId}
              onChange={(e) => setDealId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
            >
              <option value="">-- Select Deal --</option>
              {availableDeals.map((d) => (
                <option key={d.id} value={d.id}>
                  Deal #{d.deal_number}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Expiry Date (Optional) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Document Expiry Date
            </span>
            <span className="text-[10px] text-slate-400">Optional for agreements/certificates</span>
          </label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-amber-500 focus:outline-hidden"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={isUploading}
            className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
          >
            Upload Document
          </Button>
        </div>
      </form>
    </Modal>
  );
}
