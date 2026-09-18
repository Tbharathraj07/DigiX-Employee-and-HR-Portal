import React, { useState } from 'react';
import { usePortalData } from '../../context/DataContext';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { SearchInput } from '../../components/common/SearchInput';
import { ShieldAlert, Download } from 'lucide-react';

export const SecurityLogs = () => {
  const { auditLogs } = usePortalData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filtered = auditLogs.filter((log) => {
    const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
    const matchesSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.ip.toLowerCase().includes(search.toLowerCase()) ||
      log.module.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const columns = [
    { header: 'Event ID', accessor: 'id', cellClassName: 'font-mono text-xs font-bold text-slate-800' },
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
          <h2 className="text-xl font-bold text-slate-900">Security & Activity Audit Logs</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable audit record of user logins, role modifications, and system state transitions.
          </p>
        </div>
      </div>

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

      <Table columns={columns} data={filtered} />
    </div>
  );
};
