'use client';

import React, { useState, useRef } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  FileText,
  AlertTriangle,
} from 'lucide-react';

interface LeadImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedLeadPreview {
  full_name: string;
  phone: string;
  email?: string;
  lead_type?: string;
  budget_min?: number;
  budget_max?: number;
  location?: string;
  requirement?: string;
  source?: string;
  isValid: boolean;
  error?: string;
}

export function LeadImportModal({ isOpen, onClose, onSuccess }: LeadImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedLeadPreview[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    importedCount: number;
    totalProcessed: number;
    errors: Array<{ row: number; error: string }>;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setParsedRows([]);
    setIsParsing(false);
    setIsSubmitting(false);
    setImportResult(null);
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const downloadTemplate = () => {
    window.open('/api/leads/import', '_blank');
  };

  const parseCSVText = (text: string): ParsedLeadPreview[] => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length <= 1) return [];

    const header = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());
    const nameIdx = header.findIndex((h) => h.includes('name') || h.includes('client'));
    const phoneIdx = header.findIndex((h) => h.includes('phone') || h.includes('mobile'));
    const emailIdx = header.findIndex((h) => h.includes('email'));
    const minBudgetIdx = header.findIndex((h) => h.includes('min'));
    const maxBudgetIdx = header.findIndex((h) => h.includes('max'));
    const locIdx = header.findIndex((h) => h.includes('location') || h.includes('area'));
    const reqIdx = header.findIndex((h) => h.includes('requirement') || h.includes('bhk'));
    const sourceIdx = header.findIndex((h) => h.includes('source'));
    const typeIdx = header.findIndex((h) => h.includes('type'));

    const rows: ParsedLeadPreview[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // simple quote-aware split
      const cols: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let j = 0; j < line.length; j++) {
        const c = line[j];
        if (c === '"') {
          inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) {
          cols.push(cur.replace(/^"|"$/g, '').trim());
          cur = '';
        } else {
          cur += c;
        }
      }
      cols.push(cur.replace(/^"|"$/g, '').trim());

      const full_name = nameIdx >= 0 ? cols[nameIdx] || '' : cols[0] || '';
      const phone = phoneIdx >= 0 ? cols[phoneIdx] || '' : cols[1] || '';
      const email = emailIdx >= 0 ? cols[emailIdx] : undefined;
      const budget_min = minBudgetIdx >= 0 ? Number(cols[minBudgetIdx]) || undefined : undefined;
      const budget_max = maxBudgetIdx >= 0 ? Number(cols[maxBudgetIdx]) || undefined : undefined;
      const location = locIdx >= 0 ? cols[locIdx] : undefined;
      const requirement = reqIdx >= 0 ? cols[reqIdx] : undefined;
      const source = sourceIdx >= 0 ? cols[sourceIdx] : 'website';
      const lead_type = typeIdx >= 0 ? cols[typeIdx] : 'buy';

      let isValid = true;
      let error = '';

      if (!full_name.trim()) {
        isValid = false;
        error = 'Missing client name';
      } else if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
        isValid = false;
        error = 'Invalid 10-digit phone';
      }

      rows.push({
        full_name,
        phone,
        email,
        budget_min,
        budget_max,
        location,
        requirement,
        source,
        lead_type,
        isValid,
        error,
      });
    }

    return rows;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setErrorMessage('Please upload a valid .csv file');
      return;
    }

    setFile(selectedFile);
    setIsParsing(true);
    setErrorMessage('');

    try {
      const text = await selectedFile.text();
      const rows = parseCSVText(text);
      if (rows.length === 0) {
        setErrorMessage('No valid data rows found in CSV');
      }
      setParsedRows(rows);
    } catch (err: unknown) {
      setErrorMessage('Failed to read CSV: ' + (err as Error).message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleImportSubmit = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setErrorMessage('No valid rows available to import');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: validRows }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setImportResult(data);
      if (data.importedCount > 0) {
        onSuccess();
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Failed to submit import');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Leads from CSV"
      description="Upload bulk enquiries from Excel/CSV with automatic column mapping and validation."
      maxWidth="xl"
    >
      <div className="space-y-6">
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success / Result Screen */}
        {importResult ? (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Import Completed</h3>
              <p className="mt-1 text-sm text-slate-600">
                Successfully imported <span className="font-semibold text-emerald-600">{importResult.importedCount}</span> of{' '}
                {importResult.totalProcessed} records.
              </p>
            </div>

            {importResult.errors && importResult.errors.length > 0 && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{importResult.errors.length} records could not be imported:</span>
                </div>
                <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-amber-700">
                  {importResult.errors.map((e, idx) => (
                    <li key={idx}>
                      Row {e.row}: {e.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-4">
              <Button onClick={handleClose} className="bg-slate-900 text-white hover:bg-slate-800">
                Done & View Leads
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Template Download Banner */}
            <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
              <div>
                <h4 className="text-sm font-semibold text-slate-800">Standard CSV Template</h4>
                <p className="text-xs text-slate-500">
                  Download the formatted template with predefined headers and sample lead rows.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                className="shrink-0 gap-1.5"
              >
                <Download className="h-4 w-4" />
                Download Template
              </Button>
            </div>

            {/* File Upload Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-8 text-center transition hover:border-amber-500 hover:bg-amber-50/20"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <FileSpreadsheet className="h-10 w-10 text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                {file ? file.name : 'Click to select or drop CSV file'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Supports .csv files with standard columns (Client Name, Mobile, Budget, Location, Requirement)
              </p>
            </div>

            {/* Preview Table */}
            {parsedRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-700">
                    Preview: {parsedRows.length} rows detected
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-600 font-semibold">{validCount} valid</span>
                    {invalidCount > 0 && (
                      <span className="text-red-500 font-semibold">{invalidCount} invalid</span>
                    )}
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-100 text-slate-600">
                      <tr>
                        <th className="p-2">Status</th>
                        <th className="p-2">Client Name</th>
                        <th className="p-2">Mobile</th>
                        <th className="p-2">Requirement</th>
                        <th className="p-2">Location</th>
                        <th className="p-2">Budget Min-Max</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {parsedRows.slice(0, 50).map((r, i) => (
                        <tr key={i} className={r.isValid ? '' : 'bg-red-50/50'}>
                          <td className="p-2">
                            {r.isValid ? (
                              <span className="inline-flex items-center text-emerald-600 font-medium">
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Valid
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center text-red-600 font-medium"
                                title={r.error}
                              >
                                <AlertCircle className="mr-1 h-3.5 w-3.5" /> {r.error}
                              </span>
                            )}
                          </td>
                          <td className="p-2 font-medium text-slate-900">{r.full_name || '—'}</td>
                          <td className="p-2 font-mono text-slate-700">{r.phone || '—'}</td>
                          <td className="p-2 text-slate-600">{r.requirement || '—'}</td>
                          <td className="p-2 text-slate-600">{r.location || '—'}</td>
                          <td className="p-2 text-slate-600">
                            {r.budget_min || r.budget_max
                              ? `₹${r.budget_min || 0} - ₹${r.budget_max || 'open'}`
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedRows.length > 50 && (
                  <p className="text-right text-xs text-slate-400">
                    Showing first 50 rows of {parsedRows.length} total
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleImportSubmit}
                disabled={validCount === 0 || isSubmitting}
                isLoading={isSubmitting}
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                Import {validCount > 0 ? `${validCount} Leads` : ''}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
