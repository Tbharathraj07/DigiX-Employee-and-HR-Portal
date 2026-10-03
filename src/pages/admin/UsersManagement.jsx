import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Button } from '../../components/common/Button';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { SearchInput } from '../../components/common/SearchInput';
import { StatCard } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import {
  KeyRound,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Eye,
  Mail,
  Building,
  MapPin,
  Calendar,
  Phone,
  FileText,
  AlertCircle,
  UserPlus
} from 'lucide-react';

const STORAGE_REQUESTS_KEY = 'digix_portal_registration_requests_v1';

// Seed requests matching initial test specifications
const INITIAL_REGISTRATION_REQUESTS = [
  {
    id: 'reg-alex-morgan-2026',
    full_name: 'Alex Morgan',
    email: 'alex.morgan.test2026@digix.internal',
    phone: '+1 555-0188',
    department: 'Technology',
    designation: 'Software Developer',
    location: 'Hyderabad, India',
    requested_role: 'employee',
    status: 'pending',
    joining_date: '2026-10-15',
    manager_id: null,
    reason: 'Testing employee account registration flow',
    created_at: '2026-09-28T05:00:00.000Z',
    reviewed_by: null,
    reviewed_at: null,
    review_comment: null
  },
  {
    id: 'reg-samantha-reed-2026',
    full_name: 'Samantha Reed',
    email: 'samantha.reed.test2026@digix.internal',
    phone: '+1 555-0199',
    department: 'Human Resources',
    designation: 'HR Operations Specialist',
    location: 'New York, NY',
    requested_role: 'hr_manager',
    status: 'pending',
    joining_date: '2026-10-20',
    manager_id: null,
    reason: 'Reporting Manager: Priyanka\n\nTesting HR account registration flow',
    created_at: '2026-09-28T05:15:00.000Z',
    reviewed_by: null,
    reviewed_at: null,
    review_comment: null
  }
];

export const UsersManagement = () => {
  const { user, role, isSupabaseAuth } = useAuth();
  const { employees, addAuditLog } = usePortalData();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab state: 'accounts' | 'requests'
  const activeTab = searchParams.get('tab') === 'requests' ? 'requests' : 'accounts';
  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  // ---------------------------------------------------------------------------
  // Tab 1: User Accounts Governance State
  // ---------------------------------------------------------------------------
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const [userStatuses, setUserStatuses] = useState(() => {
    const init = {};
    employees.forEach((e) => {
      init[e.id] = 'Active';
    });
    return init;
  });

  const toggleStatus = (id, name) => {
    const nextStatus = userStatuses[id] === 'Active' ? 'Suspended' : 'Active';
    setUserStatuses((prev) => ({ ...prev, [id]: nextStatus }));
    addToast({
      type: nextStatus === 'Active' ? 'success' : 'warning',
      title: `Account ${nextStatus}`,
      message: `${name}'s access has been updated.`
    });
    addAuditLog?.(`Account status for ${name} (${id}) changed to ${nextStatus}`, nextStatus === 'Active' ? 'Success' : 'Warning', 'Security');
  };

  const handleResetPassword = (name) => {
    addToast({
      type: 'info',
      title: 'Reset Link Dispatched',
      message: `A temporary password token was sent to ${name}'s verified corporate inbox.`
    });
    addAuditLog?.(`Dispatched password reset token for user ${name}`, 'Warning', 'Security');
  };

  const filteredAccounts = employees.filter((emp) => {
    const matchesRole = roleFilter === 'All' || emp.role === roleFilter;
    const matchesSearch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.id.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  // ---------------------------------------------------------------------------
  // Tab 2: Registration Requests State
  // ---------------------------------------------------------------------------
  const [registrationRequests, setRegistrationRequests] = useState(() => {
    if (isSupabaseAuth) return [];
    try {
      const saved = localStorage.getItem(STORAGE_REQUESTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[UsersManagement] Failed reading cached registration requests:', e);
    }
    return INITIAL_REGISTRATION_REQUESTS;
  });

  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [requestsError, setRequestsError] = useState(null);

  // Request Filters
  const [requestStatusFilter, setRequestStatusFilter] = useState('All');
  const [requestRoleFilter, setRequestRoleFilter] = useState('All');
  const [requestSearch, setRequestSearch] = useState('');

  // Selected Request & Modals
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch Requests from Supabase with safe fallback
  const fetchRequests = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setIsLoadingRequests(true);
    setRequestsError(null);

    try {
      const { data, error } = await supabase
        .from('registration_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // If error code is 42501 (RLS denied when using demo session), retain cached state
        if (error.code === '42501') {
          console.info('[UsersManagement] Supabase RLS restricted anon SELECT. Retaining local requests state.');
        } else {
          console.warn('[UsersManagement] Error fetching registration requests from Supabase:', error);
          setRequestsError(error.message);
        }
      } else if (data) {
        if (isSupabaseAuth) {
          setRegistrationRequests(data);
          try {
            localStorage.removeItem(STORAGE_REQUESTS_KEY);
          } catch (_) {}
        } else {
          // Retain demo merge only in unauthenticated demo fallback mode
          setRegistrationRequests((prev) => {
            const map = new Map();
            data.forEach((r) => map.set(r.email.toLowerCase(), r));
            prev.forEach((r) => {
              if (!map.has(r.email.toLowerCase())) {
                map.set(r.email.toLowerCase(), r);
              }
            });
            const merged = Array.from(map.values());
            try {
              localStorage.setItem(STORAGE_REQUESTS_KEY, JSON.stringify(merged));
            } catch (_) {}
            return merged;
          });
        }
      }
    } catch (err) {
      console.warn('[UsersManagement] Unexpected error fetching requests:', err);
      setRequestsError(err.message);
    } finally {
      setIsLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Sync registrationRequests to localStorage
  const saveRequests = (updatedList) => {
    setRegistrationRequests(updatedList);
    try {
      localStorage.setItem(STORAGE_REQUESTS_KEY, JSON.stringify(updatedList));
    } catch (e) {
      console.warn('[UsersManagement] Failed saving registration requests:', e);
    }
  };

  // Helper to update a single request's status locally
  const updateRequestStatusLocally = (id, status, comment = null) => {
    const reviewerId = user?.rawProfile?.employee_id || user?.dbId || 'ADM001';
    const reviewerName = user?.name || 'Marcus Vance';
    const now = new Date().toISOString();

    const updated = registrationRequests.map((r) => {
      if (r.id === id || r.email?.toLowerCase() === id?.toLowerCase()) {
        return {
          ...r,
          status,
          reviewed_by: reviewerId,
          reviewer_name: reviewerName,
          reviewed_at: now,
          review_comment: comment
        };
      }
      return r;
    });

    saveRequests(updated);
  };

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------
  const handleOpenReview = (request) => {
    setSelectedRequest(request);
    setReviewComment(request.review_comment || '');
  };

  const handleOpenApproveModal = (request) => {
    setSelectedRequest(request);
    setReviewComment(request.review_comment || 'Verified and approved by System Administrator.');
    setIsApproveModalOpen(true);
  };

  const handleOpenRejectModal = (request) => {
    setSelectedRequest(request);
    setReviewComment(request.review_comment || 'Declined during administrative review.');
    setIsRejectModalOpen(true);
  };

  // Execute Approval: Strictly calls approve-registration Edge Function
  const handleConfirmApprove = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);

    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase client is not configured.');
      }

      // 1. Invoke the approve-registration Edge Function with current site_url
      const { data, error } = await supabase.functions.invoke('approve-registration', {
        body: {
          request_id: selectedRequest.id,
          requestId: selectedRequest.id,
          site_url: typeof window !== 'undefined' ? window.location.origin : undefined,
          review_comment: reviewComment.trim() || 'Verified and approved by System Administrator.'
        }
      });

      // 2. Check for transport, network, or HTTP failure (404, 401, 403, 409, 429, 500, etc.)
      if (error) {
        let errorDetail = 'Account provisioning failed. The invitation email could not be sent.';
        try {
          if (error.context && typeof error.context.json === 'function') {
            const errBody = await error.context.json();
            if (errBody?.error) {
              errorDetail = errBody.error;
            }
          }
        } catch (_parseErr) {
          if (error.message) {
            errorDetail = error.message;
          }
        }
        console.error('[UsersManagement] approve-registration invocation failed:', {
          name: error.name,
          message: error.message,
          detail: errorDetail
        });
        throw new Error(errorDetail);
      }

      // 3. Check for application/business failure returned by the function
      if (!data || !data.success) {
        const errorDetail = data?.error || 'Account provisioning failed. The invitation email could not be sent.';
        console.error('[UsersManagement] approve-registration returned unsuccessful data:', data);
        throw new Error(errorDetail);
      }

      // 4. Verify that the invitation email was actually delivered
      if (data.data?.invitation_email_delivered === false) {
        console.error('[UsersManagement] approve-registration invitation email not delivered:', data);
        throw new Error('Invitation email could not be sent by the email service. Registration has NOT been approved.');
      }

      // 5. Successful approval path: ONLY executed after Edge Function successfully returns a verified invitation
      const provisionedData = data.data;

      // Update local state to approved
      updateRequestStatusLocally(
        selectedRequest.id,
        'approved',
        reviewComment.trim() || 'Verified and approved by System Administrator.'
      );

      addToast({
        type: 'success',
        title: 'Access Request Approved',
        message: `${selectedRequest.full_name} (${selectedRequest.email}) has been approved as ${
          selectedRequest.requested_role === 'hr_manager' ? 'HR Manager' : 'Employee'
        }.${provisionedData?.employee_id ? ` Assigned ID: ${provisionedData.employee_id}` : ''}`
      });

      addAuditLog?.(
        `Approved registration for ${selectedRequest.full_name} (${selectedRequest.email}) as ${selectedRequest.requested_role}`,
        'Success',
        'Security',
        null,
        null,
        { requestId: selectedRequest.id, email: selectedRequest.email, role: selectedRequest.requested_role }
      );

      setIsApproveModalOpen(false);
      setSelectedRequest(null);

      // 6. Refresh the request from Supabase after approval rather than relying only on local state
      await fetchRequests();
    } catch (err) {
      console.error('[UsersManagement] Approval failed safely:', err);
      // Close modal on failure so the user returns to the queue view
      setIsApproveModalOpen(false);
      setSelectedRequest(null);

      // Keep request strictly as pending! Do NOT update request state to approved!
      addToast({
        type: 'error',
        title: 'Approval Failed - Invitation Not Sent',
        message: err.message || 'The invitation email was not sent. The request remains pending.',
        duration: 7000
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute Rejection: Updates status to rejected with comment
  const handleConfirmReject = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);

    try {
      const commentPayload = reviewComment.trim() || 'Declined during administrative review.';
      const reviewerId = user?.rawProfile?.employee_id || user?.dbId || null;

      // Attempt live database update if authenticated
      if (isSupabaseConfigured && isSupabaseAuth) {
        try {
          const { error } = await supabase
            .from('registration_requests')
            .update({
              status: 'rejected',
              reviewed_by: reviewerId,
              reviewed_at: new Date().toISOString(),
              review_comment: commentPayload
            })
            .eq('id', selectedRequest.id);

          if (error) {
            console.warn('[UsersManagement] Live rejection update warning:', error);
          }
        } catch (dbErr) {
          console.warn('[UsersManagement] Supabase rejection error:', dbErr);
        }
      }

      // Update state locally
      updateRequestStatusLocally(selectedRequest.id, 'rejected', commentPayload);

      addToast({
        type: 'info',
        title: 'Access Request Rejected',
        message: `Registration for ${selectedRequest.full_name} (${selectedRequest.email}) was declined.`
      });

      addAuditLog?.(
        `Rejected registration for ${selectedRequest.full_name} (${selectedRequest.email}): ${commentPayload}`,
        'Warning',
        'Security',
        null,
        null,
        { requestId: selectedRequest.id, email: selectedRequest.email, reason: commentPayload }
      );

      setIsRejectModalOpen(false);
      setSelectedRequest(null);
      await fetchRequests();
    } catch (err) {
      console.error('[UsersManagement] Error rejecting registration:', err);
      addToast({
        type: 'error',
        title: 'Rejection Failed',
        message: err.message || 'Failed to reject request.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Calculations & Filtering
  // ---------------------------------------------------------------------------
  const pendingRequestsCount = useMemo(
    () => registrationRequests.filter((r) => r.status?.toLowerCase() === 'pending').length,
    [registrationRequests]
  );
  const approvedRequestsCount = useMemo(
    () => registrationRequests.filter((r) => r.status?.toLowerCase() === 'approved').length,
    [registrationRequests]
  );
  const rejectedRequestsCount = useMemo(
    () => registrationRequests.filter((r) => r.status?.toLowerCase() === 'rejected').length,
    [registrationRequests]
  );

  const filteredRequests = useMemo(() => {
    return registrationRequests.filter((r) => {
      const statusLower = (r.status || '').toLowerCase();
      const matchesStatus =
        requestStatusFilter === 'All' || statusLower === requestStatusFilter.toLowerCase();

      const matchesRole =
        requestRoleFilter === 'All' || r.requested_role === requestRoleFilter;

      const searchLower = requestSearch.toLowerCase();
      const matchesSearch =
        (r.full_name || '').toLowerCase().includes(searchLower) ||
        (r.email || '').toLowerCase().includes(searchLower) ||
        (r.department || '').toLowerCase().includes(searchLower) ||
        (r.designation || '').toLowerCase().includes(searchLower) ||
        (r.location || '').toLowerCase().includes(searchLower);

      return matchesStatus && matchesRole && matchesSearch;
    });
  }, [registrationRequests, requestStatusFilter, requestRoleFilter, requestSearch]);

  // ---------------------------------------------------------------------------
  // Security / Admin-Only Access Guard
  // ---------------------------------------------------------------------------
  if (role !== 'admin') {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-rose-200/80 shadow-subtle max-w-lg mx-auto mt-12">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Administrative Access Required</h3>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          You need System Administrator privileges to view user governance and access request controls.
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Table Columns Configurations
  // ---------------------------------------------------------------------------
  const userAccountColumns = [
    {
      header: 'User Account',
      render: (row) => (
        <div className="flex items-center gap-3">
          <img src={row.avatar} alt={row.name} className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200" />
          <div>
            <span className="font-bold text-slate-900 block text-xs">{row.name}</span>
            <span className="text-[11px] text-slate-500">{row.email}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Assigned Role',
      render: (row) => (
        <Badge
          variant={
            row.role === 'admin'
              ? 'danger'
              : row.role === 'hr' || row.role === 'hr_manager'
              ? 'purple'
              : 'primary'
          }
          size="sm"
        >
          {row.role?.toUpperCase()}
        </Badge>
      )
    },
    { header: 'Department', accessor: 'department', cellClassName: 'text-xs text-slate-600' },
    {
      header: 'State',
      render: (row) => {
        const st = userStatuses[row.id] || 'Active';
        return (
          <Badge variant={st === 'Active' ? 'success' : 'danger'} size="sm" dot>
            {st}
          </Badge>
        );
      }
    },
    {
      header: '2FA Auth',
      render: () => (
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
          Enforced
        </span>
      )
    },
    {
      header: 'Governance',
      render: (row) => {
        const st = userStatuses[row.id] || 'Active';
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleResetPassword(row.name)}
              className="text-xs py-1 px-2.5"
            >
              Reset Pass
            </Button>
            <Button
              size="sm"
              variant={st === 'Active' ? 'danger' : 'success'}
              onClick={() => toggleStatus(row.id, row.name)}
              className="text-xs py-1 px-2.5"
            >
              {st === 'Active' ? 'Suspend' : 'Activate'}
            </Button>
          </div>
        );
      }
    }
  ];

  const registrationColumns = [
    {
      header: 'Applicant Dossier',
      render: (row) => {
        const initials = (row.full_name || 'U')
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs ring-1 ring-slate-200">
              {initials}
            </div>
            <div>
              <span className="font-bold text-slate-900 block text-xs">{row.full_name}</span>
              <span className="text-[11px] text-slate-500 font-mono">{row.email}</span>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Department & Designation',
      render: (row) => (
        <div>
          <span className="text-xs font-semibold text-slate-800 block">{row.department || 'Not Specified'}</span>
          <span className="text-[11px] text-slate-500">{row.designation || 'General Staff'}</span>
        </div>
      )
    },
    {
      header: 'Requested Role',
      render: (row) => {
        const isHr = row.requested_role === 'hr_manager';
        return (
          <Badge variant={isHr ? 'purple' : 'primary'} size="sm">
            {isHr ? 'HR Manager' : 'Employee'}
          </Badge>
        );
      }
    },
    {
      header: 'Location & Start Date',
      render: (row) => (
        <div className="text-xs text-slate-600">
          <span className="block font-medium">{row.location || 'Remote'}</span>
          <span className="text-[11px] text-slate-400">
            {row.joining_date ? `Starts: ${row.joining_date}` : 'Immediate'}
          </span>
        </div>
      )
    },
    {
      header: 'Submitted',
      render: (row) => {
        const dateStr = row.created_at
          ? new Date(row.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })
          : 'Recent';
        return <span className="text-xs text-slate-500">{dateStr}</span>;
      }
    },
    {
      header: 'Status',
      render: (row) => {
        const st = (row.status || 'pending').toLowerCase();
        return (
          <Badge
            variant={st === 'approved' ? 'success' : st === 'rejected' ? 'danger' : 'warning'}
            size="sm"
            dot
          >
            {st === 'approved' ? 'Approved' : st === 'rejected' ? 'Rejected' : 'Pending Review'}
          </Badge>
        );
      }
    },
    {
      header: 'Actions',
      render: (row) => {
        const isPending = (row.status || '').toLowerCase() === 'pending';

        return (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenReview(row)}
              leftIcon={<Eye className="w-3.5 h-3.5" />}
              className="text-xs py-1 px-2.5"
            >
              {isPending ? 'Review' : 'View'}
            </Button>

            {isPending && (
              <>
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => handleOpenApproveModal(row)}
                  className="text-xs py-1 px-2.5"
                  title="Approve access request"
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleOpenRejectModal(row)}
                  className="text-xs py-1 px-2.5"
                  title="Reject access request"
                >
                  Reject
                </Button>
              </>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">User Identity & Access Governance</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Administer DigiX corporate identity profiles, credentials, and review applicant registration requests.
          </p>
        </div>

        {/* Actions & Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <Link
            to="/admin/roles-permissions?tab=roles"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-digix-700 bg-digix-50 border border-digix-200/80 hover:bg-digix-100 transition-colors shadow-xs"
            title="Manage and assign personnel roles"
          >
            <KeyRound className="w-3.5 h-3.5 text-digix-600" />
            <span>Manage Roles</span>
          </Link>

          {/* Tab Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setActiveTab('accounts')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'accounts'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>User Accounts</span>
              <span className="text-[10px] bg-slate-200/70 text-slate-700 px-1.5 py-0.2 rounded-full font-medium">
                {employees.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('requests')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'requests'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Access Requests</span>
              {pendingRequestsCount > 0 && (
                <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.2 rounded-full font-bold animate-pulse">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: USER ACCOUNTS GOVERNANCE                                        */}
      {/* ===================================================================== */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-subtle">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
              placeholder="Filter by name, email, or employee ID..."
              className="w-full sm:w-80"
            />

            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              {['All', 'employee', 'hr', 'admin'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize whitespace-nowrap ${
                    roleFilter === r
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <Table columns={userAccountColumns} data={filteredAccounts} />
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: PENDING REGISTRATION REQUESTS                                   */}
      {/* ===================================================================== */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Stat Cards Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Pending Verification"
              value={pendingRequestsCount}
              subtitle="Awaiting administrative review"
              icon={Clock}
              color="amber"
            />
            <StatCard
              title="Approved Accounts"
              value={approvedRequestsCount}
              subtitle="Provisioned to DigiX directory"
              icon={CheckCircle2}
              color="emerald"
            />
            <StatCard
              title="Declined Submissions"
              value={rejectedRequestsCount}
              subtitle="Failed verification check"
              icon={XCircle}
              color="rose"
            />
            <StatCard
              title="Total Submissions"
              value={registrationRequests.length}
              subtitle="Immutable audit trail"
              icon={ShieldCheck}
              color="purple"
            />
          </div>

          {/* Filter & Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-subtle">
            <SearchInput
              value={requestSearch}
              onChange={(e) => setRequestSearch(e.target.value)}
              onClear={() => setRequestSearch('')}
              placeholder="Search by applicant name, email, department, role..."
              className="w-full sm:w-80"
            />

            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {['All', 'Pending', 'Approved', 'Rejected'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setRequestStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                      requestStatusFilter === st
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Role Filter Selector */}
              <select
                value={requestRoleFilter}
                onChange={(e) => setRequestRoleFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="All">All Roles</option>
                <option value="employee">Employee</option>
                <option value="hr_manager">HR Manager</option>
              </select>

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRequests}
                isLoading={isLoadingRequests}
                leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingRequests ? 'animate-spin' : ''}`} />}
                className="py-1 px-2.5 text-xs ml-1"
                title="Refresh requests queue"
              >
                Refresh
              </Button>
            </div>
          </div>

          {/* Error Banner if any */}
          {requestsError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>Notice: {requestsError} (displaying cached registration requests)</span>
              </div>
              <Button size="sm" variant="outline" onClick={fetchRequests} className="text-xs py-0.5 px-2">
                Retry
              </Button>
            </div>
          )}

          {/* Requests Table / Loading / Empty State */}
          {isLoadingRequests && filteredRequests.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span>Loading access requests from Supabase...</span>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200">
              <EmptyState
                icon={Clock}
                title="No Access Requests Found"
                description={
                  requestSearch || requestStatusFilter !== 'All' || requestRoleFilter !== 'All'
                    ? 'No requests match your current search or status filter criteria.'
                    : 'All registration requests have been processed.'
                }
                actionLabel={requestSearch || requestStatusFilter !== 'All' ? 'Reset Filters' : null}
                onAction={() => {
                  setRequestSearch('');
                  setRequestStatusFilter('All');
                  setRequestRoleFilter('All');
                }}
              />
            </div>
          ) : (
            <Table columns={registrationColumns} data={filteredRequests} />
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: APPLICANT DETAILS VIEW                                       */}
      {/* ===================================================================== */}
      {selectedRequest && !isApproveModalOpen && !isRejectModalOpen && (
        <Modal
          isOpen={Boolean(selectedRequest)}
          onClose={() => setSelectedRequest(null)}
          title="Applicant Registration Dossier"
          subtitle={`Submission ID: ${selectedRequest.id || 'N/A'}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4">
            {/* Header Persona Card */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-100 border border-amber-200 text-amber-900 font-bold text-base flex items-center justify-center">
                  {(selectedRequest.full_name || 'U')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{selectedRequest.full_name}</h4>
                  <p className="text-xs text-slate-500 font-mono">{selectedRequest.email}</p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <Badge
                  variant={
                    (selectedRequest.status || '').toLowerCase() === 'approved'
                      ? 'success'
                      : (selectedRequest.status || '').toLowerCase() === 'rejected'
                      ? 'danger'
                      : 'warning'
                  }
                  size="sm"
                  dot
                >
                  {(selectedRequest.status || 'pending').toUpperCase()}
                </Badge>
                <Badge
                  variant={selectedRequest.requested_role === 'hr_manager' ? 'purple' : 'primary'}
                  size="sm"
                >
                  {selectedRequest.requested_role === 'hr_manager' ? 'HR Manager' : 'Employee'}
                </Badge>
              </div>
            </div>

            {/* Dossier Grid Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  Department
                </span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  {selectedRequest.department || 'Not Assigned'}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  Designation / Role Title
                </span>
                <span className="font-semibold text-slate-800">
                  {selectedRequest.designation || 'Staff Associate'}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  Work Location
                </span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {selectedRequest.location || 'Remote'}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  Contact Phone
                </span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {selectedRequest.phone || 'None provided'}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  Target Joining Date
                </span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {selectedRequest.joining_date || 'Immediate'}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  Submitted At
                </span>
                <span className="font-semibold text-slate-800">
                  {selectedRequest.created_at
                    ? new Date(selectedRequest.created_at).toLocaleString('en-US')
                    : 'Recently'}
                </span>
              </div>
            </div>

            {/* Applicant Access Justification */}
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 border border-slate-100">
              <span className="font-bold text-slate-700 block">Applicant Access Justification:</span>
              <p className="text-slate-600 leading-relaxed italic whitespace-pre-line">
                "{selectedRequest.reason || 'Account access requested for DigiX corporate services.'}"
              </p>
            </div>

            {/* Review Decision Summary (if already decided) */}
            {(selectedRequest.status || '').toLowerCase() !== 'pending' ? (
              <div className="p-3 bg-slate-100 rounded-xl text-xs space-y-1.5 border border-slate-200">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span className="flex items-center gap-1.5">
                    {selectedRequest.status?.toLowerCase() === 'approved' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    )}
                    Decision: {selectedRequest.status?.toUpperCase()}
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {selectedRequest.reviewed_at
                      ? new Date(selectedRequest.reviewed_at).toLocaleString('en-US')
                      : ''}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  Reviewed By: {selectedRequest.reviewer_name || selectedRequest.reviewed_by || 'System Administrator'}
                </p>
                {selectedRequest.review_comment && (
                  <p className="text-slate-800 italic text-xs pt-1 border-t border-slate-200">
                    "{selectedRequest.review_comment}"
                  </p>
                )}
              </div>
            ) : (
              /* Review Actions for Pending Request */
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setSelectedRequest(null)}>
                  Close
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  leftIcon={<XCircle className="w-4 h-4" />}
                  onClick={() => setIsRejectModalOpen(true)}
                >
                  Reject Request
                </Button>
                <Button
                  variant="success"
                  size="sm"
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  onClick={() => setIsApproveModalOpen(true)}
                >
                  Approve Account
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: APPROVE CONFIRMATION DIALOG                                  */}
      {/* ===================================================================== */}
      {selectedRequest && isApproveModalOpen && (
        <Modal
          isOpen={isApproveModalOpen}
          onClose={() => setIsApproveModalOpen(false)}
          title="Approve Access Request?"
          subtitle={`Applicant: ${selectedRequest.full_name} (${selectedRequest.email})`}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Confirming Administrative Approval</span>
              </div>
              <p className="leading-relaxed">
                Approving this request will invoke the secure backend Edge Function to provision an account for{' '}
                <strong>{selectedRequest.full_name}</strong> as{' '}
                <strong>{selectedRequest.requested_role === 'hr_manager' ? 'HR Manager' : 'Employee'}</strong>.
              </p>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Role:</span>
                <span className="font-semibold text-slate-800">
                  {selectedRequest.requested_role === 'hr_manager' ? 'HR Manager (HR)' : 'Employee'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Department:</span>
                <span className="font-semibold text-slate-800">{selectedRequest.department || 'Technology'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Designation:</span>
                <span className="font-semibold text-slate-800">{selectedRequest.designation || 'Software Developer'}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Verification Notes / Audit Comment (Optional)
              </label>
              <textarea
                rows={2}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Enter approval rationale or verification notes..."
                className="w-full rounded-xl border border-slate-300 text-xs p-2.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsApproveModalOpen(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={handleConfirmApprove}
                isLoading={isProcessing}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Confirm Approval & Provision
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: REJECT CONFIRMATION DIALOG                                   */}
      {/* ===================================================================== */}
      {selectedRequest && isRejectModalOpen && (
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title="Reject Access Request?"
          subtitle={`Applicant: ${selectedRequest.full_name} (${selectedRequest.email})`}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-rose-900">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Confirming Administrative Rejection</span>
              </div>
              <p className="leading-relaxed">
                Are you sure you want to decline registration access for <strong>{selectedRequest.full_name}</strong>?
                The applicant will remain unprovisioned.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Rejection Rationale / Internal Comment
              </label>
              <textarea
                rows={2}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Specify reason for declining (e.g., Unverified employee ID, duplicate submission)..."
                className="w-full rounded-xl border border-slate-300 text-xs p-2.5 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRejectModalOpen(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmReject}
                isLoading={isProcessing}
                leftIcon={<XCircle className="w-4 h-4" />}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
