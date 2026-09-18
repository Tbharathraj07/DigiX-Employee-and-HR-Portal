import React, { useState } from 'react';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { CheckCircle2, XCircle, Clock, Check, X } from 'lucide-react';

export const HRLeaveRequests = () => {
  const { leaveRequests, updateLeaveStatus } = usePortalData();
  const { addToast } = useToast();
  const [filter, setFilter] = useState('All');

  const [selectedReq, setSelectedReq] = useState(null);
  const [modalType, setModalType] = useState(null); // 'approve' | 'reject'
  const [note, setNote] = useState('');

  const handleOpenAction = (req, type) => {
    setSelectedReq(req);
    setModalType(type);
    setNote(type === 'approve' ? 'Approved by People Operations.' : 'Declined due to coverage constraints.');
  };

  const handleConfirmAction = () => {
    if (!selectedReq) return;
    const newStatus = modalType === 'approve' ? 'Approved' : 'Rejected';
    updateLeaveStatus(selectedReq.id, newStatus, note);

    addToast({
      type: modalType === 'approve' ? 'success' : 'error',
      title: `Leave ${newStatus}`,
      message: `${selectedReq.employeeName}'s ${selectedReq.type} has been updated.`
    });

    setSelectedReq(null);
    setModalType(null);
    setNote('');
  };

  const filtered = leaveRequests.filter((r) => {
    if (filter === 'All') return true;
    return r.status === filter;
  });

  const columns = [
    { header: 'Request ID', accessor: 'id', cellClassName: 'font-mono text-xs font-bold text-slate-800' },
    {
      header: 'Employee',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 text-xs block">{row.employeeName}</span>
          <span className="text-[11px] text-slate-500">{row.department}</span>
        </div>
      )
    },
    { header: 'Category', accessor: 'type', cellClassName: 'text-xs font-semibold text-slate-800' },
    {
      header: 'Dates',
      render: (row) => (
        <div className="text-xs text-slate-600">
          <div>{row.startDate} → {row.endDate}</div>
          <span className="text-slate-400 font-medium">({row.days} working {row.days === 1 ? 'day' : 'days'})</span>
        </div>
      )
    },
    { header: 'Reason', accessor: 'reason', cellClassName: 'text-xs text-slate-600 max-w-xs' },
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
        row.status === 'Pending' ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="success"
              onClick={() => handleOpenAction(row, 'approve')}
              className="py-1 px-2.5 text-xs"
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleOpenAction(row, 'reject')}
              className="py-1 px-2.5 text-xs"
            >
              Reject
            </Button>
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">Completed</span>
        )
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Leave Requests Portal</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review and take decisions on paid time-off applications from employees across all divisions.
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
          {['All', 'Pending', 'Approved', 'Rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === st
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <Table columns={columns} data={filtered} />

      {/* Decision Modal */}
      {selectedReq && (
        <Modal
          isOpen={!!selectedReq}
          onClose={() => setSelectedReq(null)}
          title={`${modalType === 'approve' ? 'Approve' : 'Reject'} Leave Request`}
          subtitle={`Decision for ${selectedReq.employeeName} (${selectedReq.type})`}
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div><strong>Dates:</strong> {selectedReq.startDate} to {selectedReq.endDate} ({selectedReq.days} days)</div>
              <div><strong>Reason:</strong> {selectedReq.reason}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Manager / HR Feedback Note
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-lg border border-slate-300 text-sm p-2.5 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedReq(null)}>
                Cancel
              </Button>
              <Button
                variant={modalType === 'approve' ? 'success' : 'danger'}
                size="sm"
                onClick={handleConfirmAction}
              >
                Confirm {modalType === 'approve' ? 'Approval' : 'Rejection'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
