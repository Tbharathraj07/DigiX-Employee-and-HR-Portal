import React from 'react';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { FolderKanban, Plus, DollarSign, Calendar } from 'lucide-react';

export const AdminProjects = () => {
  const { projects } = usePortalData();
  const { addToast } = useToast();

  const columns = [
    {
      header: 'Strategic Initiative',
      render: (row) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
              {row.code}
            </span>
            <span className="font-bold text-slate-900 text-xs">{row.name}</span>
          </div>
          <span className="text-[11px] text-slate-500">{row.category}</span>
        </div>
      )
    },
    { header: 'Project Lead', accessor: 'lead', cellClassName: 'text-xs text-slate-700 font-medium' },
    {
      header: 'Budget & Burn',
      render: (row) => (
        <div className="text-xs">
          <span className="font-bold text-slate-900">{row.spent}</span>
          <span className="text-slate-400"> / {row.budget}</span>
        </div>
      )
    },
    {
      header: 'Completion',
      render: (row) => (
        <div className="w-28">
          <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
            <span>{row.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${row.progress}%` }} />
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <Badge
          variant={row.status === 'Completed' ? 'success' : row.status === 'Review' ? 'purple' : 'primary'}
          size="sm"
        >
          {row.status}
        </Badge>
      )
    },
    {
      header: 'Health',
      accessor: 'health',
      render: (row) => (
        <Badge variant={row.health === 'Good' ? 'success' : 'warning'} size="sm" dot>
          {row.health}
        </Badge>
      )
    },
    { header: 'Target', accessor: 'deadline', cellClassName: 'text-xs text-slate-500' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Enterprise Project Governance</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Portfolio monitoring, capital allocation, and executive roadmap tracking.
          </p>
        </div>

        <Button
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() =>
            addToast({
              type: 'info',
              title: 'Project Intake',
              message: 'Corporate Project Intake Form opened.'
            })
          }
        >
          New Strategic Project
        </Button>
      </div>

      <Table columns={columns} data={projects} />
    </div>
  );
};
