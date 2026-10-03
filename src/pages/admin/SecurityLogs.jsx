import React, { useState } from 'react';
import { usePortalData } from '../../context/DataContext';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { SearchInput } from '../../components/common/SearchInput';
import { ShieldAlert, Download, RotateCw, AlertTriangle } from 'lucide-react';

export const SecurityLogs = () => {
  const { auditLogs, fetchAuditLogs, isLoadingAuditLogs, auditLogsError } = usePortalData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filtered = auditLogs.filter((log) => {
    const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
    const matchesSearch =
      (log.action || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.user || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.ip || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.module || '').toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleExportCSV = () => {
    if (!filtered.length) return;
    const headers = ['Event ID', 'Timestamp', 'Actor', 'Action', 'IP', 'Module', 'Status'];
    const rows = filtered.map((log) => [
      `"${log.id || ''}"`,
      `"${log.timestamp || ''}"`,
      `"${(log.user || '').replace(/"/g, '""')}"`,
      `"${(log.action || '').replace(/"/g, '""')}"`,
      `"${log.ip || ''}"`,
      `"${log.module || ''}"`,
      `"${log.status || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(',')).join('\n')];
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    {
      header: 'Event ID',
      accessor: 'id',
      cellClassName: 'font-mono text-xs font-bold text-slate-800',
      render: (row) => (
        <span className="font-mono text-xs text-slate-700" title={row.id}>
          {typeof row.id === 'string' && row.id.length > 12 ? `${row.id.substring(0, 8)}...` : row.id}
        </span>
      )
    },
    { header: 'Timestamp', accessor: 'timestamp', cellClassName: 'font-mono text-xs text-slate-500' },
    { header: 'Actor / User', accessor: 'user', cellClassName: 'text-xs font-semibold text-slate-900' },
    { header: 'Event Action', accessor: 'action', cellClassName: 'text-xs text-slate-700' },
    { header: 'Origin IP', accessor: 'ip', cellClassName: 'font-mono text-xs text-slate-500' },
    { header: 'Target Subsystem', accessor: 'module', cellClassName: 'text-xs text-slate-600 font-medium' },
    {
      header: 'Severity / Result',
      accessor: 'status',
      render: (row) => (
        <Badge
          variant={row.status === 'Success' ? 'success' : row.status === 'Warning' ? 'warning' : 'danger'}
          size="sm"
          dot
        >
          {row.status}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-digix-500" />
            Security & Activity Audit Logs
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable audit record of user logins, role modifications, and system state transitions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAuditLogs?.()}
            disabled={isLoadingAuditLogs}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50"
            title="Refresh logs from Supabase"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoadingAuditLogs ? 'animate-spin text-digix-500' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50"
            title="Export filtered logs as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {auditLogsError && (
        <div className="flex items-center justify-between p-3.5 bg-red-50/80 border border-red-200 rounded-xl text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span>Failed to load latest audit logs: {auditLogsError}</span>
          </div>
          <button
            onClick={() => fetchAuditLogs?.()}
            className="px-2.5 py-1 bg-white border border-red-200 text-red-700 font-medium rounded-lg hover:bg-red-50 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-subtle">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          placeholder="Filter logs by actor, action, IP, module..."
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-2">
          {['All', 'Success', 'Warning', 'Failed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <Table
        columns={columns}
        data={filtered}
        isLoading={isLoadingAuditLogs}
        emptyMessage={
          search || statusFilter !== 'All'
            ? 'No audit logs found matching criteria.'
            : 'No audit logs recorded yet.'
        }
      />
    </div>
  );
};
