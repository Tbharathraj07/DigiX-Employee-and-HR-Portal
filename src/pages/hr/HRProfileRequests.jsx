import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card, StatCard } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { SearchInput } from '../../components/common/SearchInput';
import {
  UserCheck,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  Eye,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

export const HRProfileRequests = () => {
  const { user, isSupabaseAuth } = useAuth();
  const { profileRequests, approveProfileRequest, rejectProfileRequest, fetchProfileRequests, isLoadingProfileRequests } = usePortalData();
  const { addToast } = useToast();

  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedReq, setSelectedReq] = useState(null);
  const [hrComment, setHrComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Automatically refresh requests when HR page opens
  useEffect(() => {
    if (isSupabaseAuth && typeof fetchProfileRequests === 'function') {
      fetchProfileRequests();
    }
  }, [isSupabaseAuth, fetchProfileRequests]);

  const handleOpenReview = (req) => {
    setSelectedReq(req);
    setHrComment(req.hrComment || '');
  };

  const handleApprove = async () => {
    if (!selectedReq) return;
    setIsProcessing(true);
    try {
      await approveProfileRequest(
        selectedReq.id,
        user?.name || 'Priyanka',
        hrComment.trim() || 'Verified against submitted documentation and approved.'
      );
      addToast({
        type: 'success',
        title: 'Profile Request Approved',
        message: `Updated ${selectedReq.fieldLabel} for ${selectedReq.employeeName}. Changes are now live.`
      });
      setSelectedReq(null);
      setHrComment('');
    } catch (err) {
      console.error('[HRProfileRequests] Error approving request:', err);
      addToast({
        type: 'error',
        title: 'Approval Failed',
        message: err.message || 'Failed to approve request. Please try again.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReq) return;
    setIsProcessing(true);
    try {
      await rejectProfileRequest(
        selectedReq.id,
        user?.name || 'Priyanka',
        hrComment.trim() || 'Documentation insufficient or requires physical HR verification.'
      );
      addToast({
        type: 'error',
        title: 'Profile Request Rejected',
        message: `Request for ${selectedReq.employeeName} has been declined.`
      });
      setSelectedReq(null);
      setHrComment('');
    } catch (err) {
      console.error('[HRProfileRequests] Error rejecting request:', err);
      addToast({
        type: 'error',
        title: 'Rejection Failed',
        message: err.message || 'Failed to reject request. Please try again.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const filtered = profileRequests.filter((r) => {
    const rawStatus = (r.status || '').toLowerCase();
    const targetFilter = filter.toLowerCase();
    const matchesFilter = filter === 'All' || rawStatus === targetFilter;
    const searchLower = search.toLowerCase();
    const matchesSearch =
      (r.employeeName || '').toLowerCase().includes(searchLower) ||
      (r.employeeId || '').toLowerCase().includes(searchLower) ||
      (r.fieldLabel || '').toLowerCase().includes(searchLower) ||
      (r.id || '').toLowerCase().includes(searchLower);
    return matchesFilter && matchesSearch;
  });

  const pendingCount = profileRequests.filter((r) => (r.status || '').toLowerCase() === 'pending').length;
  const approvedCount = profileRequests.filter((r) => (r.status || '').toLowerCase() === 'approved').length;
  const rejectedCount = profileRequests.filter((r) => (r.status || '').toLowerCase() === 'rejected').length;

  const columns = [
    {
      header: 'Request ID',
      accessor: 'id',
      cellClassName: 'font-mono text-xs font-bold text-slate-900',
      render: (row) => (
        <span title={row.id}>
          {row.id?.length > 15 ? `PCR-${row.id.slice(0, 8).toUpperCase()}` : row.id}
        </span>
      )
    },
    {
      header: 'Employee',
      render: (row) => (
        <div className="flex items-center gap-3">
          <img
            src={row.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={row.employeeName}
            className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200"
          />
          <div>
            <span className="font-bold text-slate-900 text-xs block">{row.employeeName}</span>
            <span className="text-[10px] text-slate-400 font-mono">{row.employeeId} • {row.department}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Target Field',
      accessor: 'fieldLabel',
      cellClassName: 'text-xs font-semibold text-slate-800'
    },
    {
      header: 'Comparison (Old → New)',
      render: (row) => (
        <div className="text-xs max-w-xs truncate">
          <span className="line-through text-slate-400 mr-1.5">{row.currentValue}</span>
          <span className="text-slate-400 mr-1.5">→</span>
          <span className="font-bold text-slate-900">{row.requestedValue}</span>
        </div>
      )
    },
    {
      header: 'Document Proof',
      render: (row) => (
        row.documentName ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            <FileText className="w-3 h-3" /> Attached
          </span>
        ) : (
          <span className="text-[11px] text-slate-400">None</span>
        )
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <Badge
          variant={
            row.status === 'Approved'
              ? 'success'
              : row.status === 'Rejected'
              ? 'danger'
              : 'warning'
          }
          size="sm"
          dot
        >
          {row.status}
        </Badge>
      )
    },
    {
      header: 'Actions',
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleOpenReview(row)}
          leftIcon={<Eye className="w-3.5 h-3.5" />}
          className="text-xs py-1 px-2.5"
        >
          {row.status === 'Pending' ? 'Review & Verify' : 'View Details'}
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Profile Change Requests</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit and approve employee requests to modify personal contact information, location, or credentials.
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Requests"
          value={pendingCount}
          subtitle="Awaiting HR verification"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Approved Changes"
          value={approvedCount}
          subtitle="Applied to live employee records"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Declined Requests"
          value={rejectedCount}
          subtitle="Insufficient documentation"
          icon={XCircle}
          color="rose"
        />
        <StatCard
          title="Total Lifetime Submissions"
          value={profileRequests.length}
          subtitle="Full audit trail preserved"
          icon={ShieldCheck}
          color="purple"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-subtle">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          placeholder="Search by employee name, ID, or field..."
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <div className="flex items-center gap-1.5">
            {['All', 'Pending', 'Approved', 'Rejected'].map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  filter === st
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {isSupabaseAuth && (
            <Button
              variant="outline"
              size="sm"
              onClick={fetchProfileRequests}
              isLoading={isLoadingProfileRequests}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingProfileRequests ? 'animate-spin' : ''}`} />}
              className="py-1 px-2.5 text-xs ml-1"
            >
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoadingProfileRequests && filtered.length === 0 ? (
        <div className="py-16 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
          <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span>Loading profile change requests from Supabase...</span>
        </div>
      ) : (
        <Table columns={columns} data={filtered} />
      )}

      {/* Review Modal */}
      {selectedReq && (
        <Modal
          isOpen={!!selectedReq}
          onClose={() => setSelectedReq(null)}
          title="Review Profile Change Request"
          subtitle={`Submission ${selectedReq.id} by ${selectedReq.employeeName}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4">
            {/* Employee Header */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={selectedReq.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={selectedReq.employeeName}
                  className="w-10 h-10 rounded-lg object-cover ring-1 ring-slate-200"
                />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{selectedReq.employeeName}</h4>
                  <p className="text-xs text-slate-500">{selectedReq.employeeId} • {selectedReq.department}</p>
                </div>
              </div>

              <Badge
                variant={
                  selectedReq.status === 'Approved'
                    ? 'success'
                    : selectedReq.status === 'Rejected'
                    ? 'danger'
                    : 'warning'
                }
                size="sm"
                dot
              >
                {selectedReq.status}
              </Badge>
            </div>

            {/* Target Field & Side-by-Side Diff */}
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Field: {selectedReq.fieldLabel}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-200/60 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                    Current on File
                  </span>
                  <p className="font-semibold text-slate-800 mt-1 line-through decoration-rose-500">
                    {selectedReq.currentValue}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/60 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                    Requested New Value
                  </span>
                  <p className="font-bold text-slate-900 mt-1">
                    {selectedReq.requestedValue}
                  </p>
                </div>
              </div>
            </div>

            {/* Justification */}
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <span className="font-bold text-slate-700 block">Employee Reason / Justification:</span>
              <p className="text-slate-600 leading-relaxed italic">
                "{selectedReq.reason}"
              </p>
            </div>

            {/* Supporting Document Card */}
            {selectedReq.documentName && (
              <div className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <span className="font-bold text-slate-900 block">{selectedReq.documentName}</span>
                    <span className="text-[10px] text-slate-400">{selectedReq.documentSize} • Verified format</span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  onClick={() =>
                    addToast({
                      type: 'info',
                      title: 'Viewing Document',
                      message: `Previewing ${selectedReq.documentName}`
                    })
                  }
                  className="py-1 px-2.5 text-xs"
                >
                  Download Proof
                </Button>
              </div>
            )}

            {/* If already decided */}
            {selectedReq.status !== 'Pending' ? (
              <div className="p-3 bg-slate-100 rounded-xl text-xs space-y-1">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Decision: {selectedReq.status}</span>
                  <span className="text-[11px] text-slate-500">{selectedReq.reviewedAt}</span>
                </div>
                <p className="text-slate-600">Reviewer: {selectedReq.reviewedBy}</p>
                {selectedReq.hrComment && (
                  <p className="text-slate-700 italic mt-1">Note: "{selectedReq.hrComment}"</p>
                )}
              </div>
            ) : (
              /* If Pending: HR Comment and Action Buttons */
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    HR Verification Notes / Comment (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={hrComment}
                    onChange={(e) => setHrComment(e.target.value)}
                    placeholder="Enter approval rationale or rejection explanation..."
                    className="w-full rounded-lg border border-slate-300 text-sm p-2.5 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button variant="outline" size="sm" onClick={() => setSelectedReq(null)} disabled={isProcessing}>
                    Close
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleReject}
                    isLoading={isProcessing}
                    leftIcon={<XCircle className="w-4 h-4" />}
                  >
                    Reject Request
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleApprove}
                    isLoading={isProcessing}
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Approve & Update Profile
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
