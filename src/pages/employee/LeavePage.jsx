import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePortalData, calculateLeaveDays } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Table } from '../../components/common/Table';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { CalendarOff, Plus, Clock, CheckCircle2, XCircle, RotateCw } from 'lucide-react';

export const LeavePage = () => {
  const { user, isSupabaseAuth } = useAuth();
  const {
    leaveBalances,
    leaveRequests,
    submitLeaveRequest,
    fetchLeaveRequests,
    fetchLeaveBalances,
    isLoadingLeaves
  } = usePortalData();
  const { addToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [daysCount, setDaysCount] = useState(1);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isSupabaseAuth) {
      if (typeof fetchLeaveRequests === 'function') fetchLeaveRequests();
      if (typeof fetchLeaveBalances === 'function') fetchLeaveBalances();
    }
  }, [isSupabaseAuth, fetchLeaveRequests, fetchLeaveBalances]);

  const handleStartDateChange = (val) => {
    setStartDate(val);
    if (val && endDate && val <= endDate) {
      setDaysCount(calculateLeaveDays(val, endDate));
    }
  };

  const handleEndDateChange = (val) => {
    setEndDate(val);
    if (startDate && val && startDate <= val) {
      setDaysCount(calculateLeaveDays(startDate, val));
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) {
      addToast({
        type: 'warning',
        title: 'Missing Fields',
        message: 'Please fill out all required fields.'
      });
      return;
    }

    if (endDate < startDate) {
      addToast({
        type: 'warning',
        title: 'Invalid Date Range',
        message: 'End date cannot be earlier than start date.'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await submitLeaveRequest({
        employeeId: user?.id,
        employeeName: user?.name,
        department: user?.department,
        type: leaveType,
        startDate,
        endDate,
        days: Number(daysCount),
        reason: reason.trim()
      });

      setIsModalOpen(false);
      setReason('');
      setStartDate('');
      setEndDate('');
      setDaysCount(1);
      addToast({
        type: 'success',
        title: 'Leave Application Submitted',
        message: 'Your leave request has been submitted to People Operations for review.'
      });
    } catch (err) {
      console.error('[LeavePage] Error submitting leave application:', err);
      addToast({
        type: 'error',
        title: 'Submission Failed',
        message: err.message || 'Failed to submit leave request. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const userRequests = isSupabaseAuth
    ? leaveRequests
    : leaveRequests.filter(
        (r) =>
          r.employeeUuid === user?.dbId ||
          r.employeeId === user?.id ||
          r.employeeName === user?.name ||
          r.employeeId === user?.dbId
      );

  const columns = [
    {
      header: 'Request ID',
      accessor: 'id',
      cellClassName: 'font-mono text-xs font-semibold text-slate-800',
      render: (row) => <span>{row.displayId || row.id}</span>
    },
    { header: 'Leave Type', accessor: 'type', cellClassName: 'text-xs font-medium text-slate-800' },
    {
      header: 'Duration',
      render: (row) => (
        <span className="text-xs text-slate-600">
          {row.startDate} to {row.endDate} ({row.days} {row.days === 1 ? 'day' : 'days'})
        </span>
      )
    },
    { header: 'Reason', accessor: 'reason', cellClassName: 'text-xs text-slate-500 max-w-xs truncate' },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <Badge
          variant={
            row.status?.toLowerCase() === 'approved'
              ? 'success'
              : row.status?.toLowerCase() === 'rejected'
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
      header: 'HR Notes',
      render: (row) => (
        <span className="text-xs text-slate-500 italic">
          {row.managerNote || 'Pending review'}
        </span>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Leave Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor accrued PTO balances and submit time-off requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSupabaseAuth && (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<RotateCw className={`w-3.5 h-3.5 ${isLoadingLeaves ? 'animate-spin' : ''}`} />}
              onClick={() => {
                if (fetchLeaveRequests) fetchLeaveRequests();
                if (fetchLeaveBalances) fetchLeaveBalances();
              }}
              disabled={isLoadingLeaves}
            >
              Refresh
            </Button>
          )}

          <Button
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Apply for Leave
          </Button>
        </div>
      </div>

      {/* Leave Balances Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(leaveBalances).map(([key, balance]) => (
          <div
            key={key}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle"
          >
            <span className="text-xs font-semibold text-slate-500">{balance.label}</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {balance.available}
              </span>
              <span className="text-xs text-slate-400">/ {balance.total} days</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-digix-500 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, (balance.available / (balance.total || 1)) * 100))}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Leave History */}
      <Card
        title="My Leave Applications & History"
        subtitle="Historical records of approved, pending, and rejected leave requests"
      >
        <Table columns={columns} data={userRequests} />
      </Card>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Apply for Time Off"
        subtitle="Submit a formal leave request to your manager"
      >
        <form onSubmit={handleApplyLeave} className="space-y-4">
          <Select
            label="Leave Category"
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value)}
            options={[
              'Casual Leave',
              'Sick & Medical Leave',
              'Earned Privilege Leave',
              'Special / Parental Leave'
            ]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              required
            />
          </div>

          <Input
            label="Total Working Days"
            type="number"
            min="1"
            max="30"
            value={daysCount}
            onChange={(e) => setDaysCount(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Reason / Coverage Plan
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide reason and who will be covering critical sprint duties..."
              className="w-full rounded-lg border border-slate-300 text-sm p-3 focus:outline-none focus:border-digix-500 focus:ring-1 focus:ring-digix-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Submit Application
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
