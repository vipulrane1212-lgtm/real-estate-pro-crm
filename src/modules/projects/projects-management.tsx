'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
  Building,
  Image as ImageIcon,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { ProjectSubmissionRecord, ProjectSubmissionStatus } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { ProjectSubmissionModal } from './project-submission-modal';

export function ProjectsManagement() {
  const [submissions, setSubmissions] = useState<ProjectSubmissionRecord[]>([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<ProjectSubmissionRecord | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [successBanner, setSuccessBanner] = useState('');

  const fetchSubmissions = async () => {
    try {
      setIsRefreshing(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/project-submissions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
        if (data.counts) setCounts(data.counts);
      }
    } catch (err) {
      console.error('Failed to load project submissions:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
    const handleToggle = () => fetchSubmissions();
    window.addEventListener('diksha_demo_toggle', handleToggle);
    return () => window.removeEventListener('diksha_demo_toggle', handleToggle);
  }, [statusFilter, search]);

  const handleApprove = async (sub: ProjectSubmissionRecord) => {
    if (!confirm(`Are you sure you want to approve "${sub.project_name}"? This will automatically create an active property in your inventory.`)) {
      return;
    }

    setIsProcessingAction(true);
    try {
      const res = await fetch(`/api/project-submissions/${sub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve project');

      setSuccessBanner(`"${sub.project_name}" has been approved and added to available inventory.`);
      setTimeout(() => setSuccessBanner(''), 5000);
      fetchSubmissions();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error approving project');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const openRejectModal = (sub: ProjectSubmissionRecord) => {
    setSelectedSubmission(sub);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    setIsProcessingAction(true);
    try {
      const res = await fetch(`/api/project-submissions/${selectedSubmission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          admin_notes: rejectReason.trim() || 'Submission rejected after internal evaluation.',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject project');

      setRejectModalOpen(false);
      setSelectedSubmission(null);
      setSuccessBanner(`Submission has been rejected and marked in review archive.`);
      setTimeout(() => setSuccessBanner(''), 5000);
      fetchSubmissions();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error rejecting project');
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Client-Added Projects & Review Queue
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review incoming project proposals, verify client property submissions, and approve into active inventory
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSubmissions}
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
            Submit New Project
          </Button>
        </div>
      </div>

      {successBanner && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          {successBanner}
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Submissions ({counts.total})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            <Clock className="h-3 w-3" />
            Pending Review ({counts.pending})
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'approved'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle className="h-3 w-3" />
            Approved ({counts.approved})
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'rejected'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <XCircle className="h-3 w-3" />
            Rejected ({counts.rejected})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects or clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs focus:border-slate-900 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Submissions Cards or Empty State */}
      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          <span className="ml-2 text-sm text-slate-500">Loading project submissions...</span>
        </div>
      ) : submissions.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            title="No data yet"
            description="No project submissions found for this view. New submissions will show here for review and inventory approval."
            icon={Layers}
            actionText="Submit Project"
            onAction={() => setIsCreateModalOpen(true)}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {submissions.map((sub) => {
            const isPending = sub.status === 'pending';
            const isApproved = sub.status === 'approved';
            const isRejected = sub.status === 'rejected';

            return (
              <div
                key={sub.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-slate-300"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                          {sub.project_type}
                        </span>
                        {isPending && (
                          <Badge variant="warning" className="gap-1 text-[11px]">
                            <Clock className="h-3 w-3" /> Pending Review
                          </Badge>
                        )}
                        {isApproved && (
                          <Badge variant="success" className="gap-1 text-[11px]">
                            <CheckCircle className="h-3 w-3" /> Approved & Listed
                          </Badge>
                        )}
                        {isRejected && (
                          <Badge variant="danger" className="gap-1 text-[11px]">
                            <XCircle className="h-3 w-3" /> Rejected
                          </Badge>
                        )}
                      </div>
                      <h3 className="mt-2 text-base font-bold text-slate-900">
                        {sub.project_name}
                      </h3>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{sub.location}</span>
                      </div>
                    </div>

                    {/* Price Range */}
                    <div className="text-right shrink-0">
                      <div className="text-xs font-semibold text-slate-500">Pricing</div>
                      <div className="text-sm font-bold text-slate-900">
                        {sub.price_range ||
                          (sub.price_min
                            ? `₹${sub.price_min.toLocaleString('en-IN')}`
                            : 'On Request')}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {sub.description && (
                    <p className="mt-3 text-xs text-slate-600 line-clamp-2">
                      {sub.description}
                    </p>
                  )}

                  {/* Photos preview */}
                  {sub.photos && sub.photos.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" /> {sub.photos.length} Photo{sub.photos.length > 1 ? 's' : ''}
                      </span>
                      <div className="flex gap-1.5 overflow-x-auto py-1">
                        {sub.photos.slice(0, 4).map((p, i) => (
                          <span
                            key={i}
                            className="inline-block max-w-[120px] truncate rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600"
                            title={p}
                          >
                            {p.split('/').pop() || p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Client Submitter Details */}
                  <div className="mt-4 rounded-lg bg-slate-50 p-3 border border-slate-100">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Submitter Contact
                    </div>
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-900">{sub.client_name}</span>
                      <div className="flex items-center gap-3">
                        <a
                          href={`tel:${sub.client_phone}`}
                          className="flex items-center gap-1 text-slate-600 hover:text-amber-600 font-medium"
                        >
                          <Phone className="h-3 w-3 text-slate-400" />
                          {sub.client_phone}
                        </a>
                        {sub.client_email && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <Mail className="h-3 w-3 text-slate-400" />
                            {sub.client_email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Admin notes if rejected or approved */}
                  {sub.admin_notes && (
                    <div className={`mt-3 rounded-lg p-2.5 text-xs ${
                      isRejected ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-700'
                    }`}>
                      <span className="font-semibold">Review note: </span>
                      {sub.admin_notes}
                    </div>
                  )}

                  {/* Created Property link if approved */}
                  {sub.created_property && (
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 border border-emerald-200 text-xs text-emerald-800">
                      <span className="font-medium flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5 text-emerald-600" />
                        Linked Inventory Property:
                      </span>
                      <span className="font-bold text-slate-900">
                        {sub.created_property.property_code || 'DK-PROP'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[11px] text-slate-400">
                    Submitted: {new Date(sub.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>

                  {isPending && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openRejectModal(sub)}
                        disabled={isProcessingAction}
                        className="text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Reject
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleApprove(sub)}
                        disabled={isProcessingAction}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Approve & List
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Project Modal */}
      <ProjectSubmissionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setSuccessBanner('New project successfully submitted for review.');
          setTimeout(() => setSuccessBanner(''), 5000);
          fetchSubmissions();
        }}
      />

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title={`Reject Submission: ${selectedSubmission?.project_name}`}
        description="Provide a rejection reason or feedback for internal records. Rejected submissions are preserved in the archive."
        maxWidth="md"
      >
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Reason for Rejection *
            </label>
            <textarea
              required
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Incomplete title deed documentation, price significantly higher than market valuation..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRejectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              isLoading={isProcessingAction}
            >
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
