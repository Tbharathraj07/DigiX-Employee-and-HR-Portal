import React, { useState } from 'react';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/common/Button';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { SearchInput } from '../../components/common/SearchInput';
import { KeyRound, Shield, UserCheck, CheckCircle2, XCircle } from 'lucide-react';

export const UsersManagement = () => {
  const { employees } = usePortalData();
  const { addToast } = useToast();
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
  };

  const handleResetPassword = (name) => {
    addToast({
      type: 'info',
      title: 'Reset Link Dispatched',
      message: `A temporary password token was sent to ${name}'s verified corporate inbox.`
    });
  };

  const filtered = employees.filter((emp) => {
    const matchesRole = roleFilter === 'All' || emp.role === roleFilter;
    const matchesSearch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.id.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const columns = [
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
          variant={row.role === 'admin' ? 'danger' : row.role === 'hr' ? 'purple' : 'primary'}
          size="sm"
        >
          {row.role.toUpperCase()}
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">User Accounts Governance</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Administer DigiX identity profiles, access states, and credential resets.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-subtle">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          placeholder="Filter by name, email, or employee ID..."
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-2">
          {['All', 'employee', 'hr', 'admin'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
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

      <Table columns={columns} data={filtered} />
    </div>
  );
};
