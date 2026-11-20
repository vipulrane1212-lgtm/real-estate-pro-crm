'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Search,
  RefreshCw,
  Download,
  Trash2,
  Calendar,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  User,
  Building2,
  Handshake,
  CheckCircle2,
} from 'lucide-react';
import { DocumentRecord, DocumentType } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { DocumentUploadModal } from './document-upload-modal';

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  aadhaar: { label: 'Aadhaar', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  pan: { label: 'PAN Card', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  agreement: { label: 'Agreement', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  index_2: { label: 'Index 2', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  oc: { label: 'OC', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  cc: { label: 'CC', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  rera: { label: 'RERA', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  other: { label: 'Other', color: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export function DocumentsManagement() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expiringOnly, setExpiringOnly] = useState(false);

  // Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDocuments = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    try {
      // Check auth role
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setIsAdmin(['super_admin', 'admin'].includes(meData.user?.role));
      }

      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('document_type', typeFilter);
      if (expiringOnly) params.set('expiring', 'true');
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/documents?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setDocuments(json.documents || []);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [typeFilter, expiringOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDocuments();
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This action will be logged in the audit trail.`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchDocuments();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete document');
      }
    } catch (e) {
      console.error(e);
      alert('Network error while deleting document');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Document Repository & KYC
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Aadhaar, PAN, agreements, title deeds, OC/CC approvals, and deal contracts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDocuments(true)}
            disabled={isRefreshing}
            className="border-slate-200"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-xs"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, client, or property..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-hidden"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Document Type Dropdown */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 font-medium focus:border-amber-500 focus:outline-hidden"
          >
            <option value="all">All Document Types</option>
            <option value="aadhaar">Aadhaar Card</option>
            <option value="pan">PAN Card</option>
            <option value="agreement">Agreement / Sale Deed</option>
            <option value="index_2">Index 2 / Title Deed</option>
            <option value="oc">Occupancy Certificate (OC)</option>
            <option value="cc">Completion Certificate (CC)</option>
            <option value="rera">RERA Registration</option>
            <option value="other">Other Documents</option>
          </select>

          {/* Expiring Soon Toggle */}
          <button
            type="button"
            onClick={() => setExpiringOnly(!expiringOnly)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              expiringOnly
                ? 'border-amber-500 bg-amber-50 text-amber-900'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className={`h-3.5 w-3.5 ${expiringOnly ? 'text-amber-600' : 'text-slate-400'}`} />
            Expiring in 30 Days
          </button>
        </div>
      </div>

      {/* Documents Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            title="No data yet"
            description="Uploaded customer agreements, KYC files, and civic compliance certificates will appear here."
            icon={FileText}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Document Details</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Associated Entity</th>
                  <th className="py-3 px-4">Uploaded By</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {documents.map((doc) => {
                  const typeMeta = TYPE_LABELS[doc.document_type] || TYPE_LABELS.other;
                  const isExpiringSoon =
                    doc.expiry_date &&
                    new Date(doc.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) &&
                    new Date(doc.expiry_date) >= new Date();

                  const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Document Details */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="truncate max-w-xs">
                            <span className="font-semibold text-slate-900 block truncate">
                              {doc.title}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Added on {new Date(doc.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4">
                        <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold ${typeMeta.color}`}>
                          {typeMeta.label}
                        </span>
                      </td>

                      {/* Associated Entity */}
                      <td className="py-3 px-4">
                        {doc.lead ? (
                          <div className="flex items-center gap-1.5 text-slate-800">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-medium truncate max-w-[140px]">{doc.lead.full_name}</span>
                          </div>
                        ) : doc.property ? (
                          <div className="flex items-center gap-1.5 text-slate-800">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-medium truncate max-w-[140px]">{doc.property.title}</span>
                          </div>
                        ) : doc.deal ? (
                          <div className="flex items-center gap-1.5 text-emerald-800">
                            <Handshake className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="font-semibold">Deal #{doc.deal.deal_number}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">General Office</span>
                        )}
                      </td>

                      {/* Uploaded By */}
                      <td className="py-3 px-4 text-slate-600">
                        {doc.uploader?.full_name || 'System User'}
                      </td>

                      {/* Expiry Date */}
                      <td className="py-3 px-4">
                        {doc.expiry_date ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-medium ${
                                isExpired
                                  ? 'text-red-600 font-bold'
                                  : isExpiringSoon
                                  ? 'text-amber-600 font-semibold'
                                  : 'text-slate-600'
                              }`}
                            >
                              {new Date(doc.expiry_date).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                            {isExpired && (
                              <span className="rounded bg-red-100 text-red-800 text-[9px] px-1 font-bold">
                                Expired
                              </span>
                            )}
                            {isExpiringSoon && !isExpired && (
                              <span className="rounded bg-amber-100 text-amber-800 text-[9px] px-1 font-bold">
                                30d
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-700 hover:bg-slate-50 transition"
                            title="View / Download Document"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>View</span>
                          </a>

                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={deletingId === doc.id}
                              onClick={() => handleDelete(doc.id, doc.title)}
                              className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1"
                              title="Delete Document (Admin Only)"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          setIsUploadModalOpen(false);
          fetchDocuments();
        }}
      />
    </div>
  );
}
