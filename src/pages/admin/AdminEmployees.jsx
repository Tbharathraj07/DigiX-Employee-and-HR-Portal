import React from 'react';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Building, Upload, Download, RefreshCw } from 'lucide-react';

export const AdminEmployees = () => {
  const { employees } = usePortalData();
  const { addToast } = useToast();

  const columns = [
    {
      header: 'Employee Dossier',
      render: (row) => (
        <div className="flex items-center gap-3">
          <img src={row.avatar} alt={row.name} className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200" />
          <div>
            <span className="font-bold text-slate-900 text-xs block">{row.name}</span>
            <span className="font-mono text-[10px] text-slate-400">{row.id} • {row.badgeNumber}</span>
          </div>
        </div>
      )
    },
    { header: 'Department', accessor: 'department', cellClassName: 'text-xs text-slate-700' },
    { header: 'Manager', accessor: 'manager', cellClassName: 'text-xs text-slate-600' },
    { header: 'Band', accessor: 'band', cellClassName: 'text-xs font-semibold text-slate-700' },
    { header: 'Compensation', accessor: 'salary', cellClassName: 'text-xs font-mono font-medium text-slate-800' },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <Badge variant="success" size="sm" dot>{row.status}</Badge>
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Master Employee Records</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            System-level administrative registry of all organizational headcount and contracts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={() =>
              addToast({
                type: 'info',
                title: 'Bulk Sync Ready',
                message: 'Supported formats: CSV, Workday XML, Active Directory sync.'
              })
            }
          >
            Bulk HR Import
          </Button>

          <Button
            size="sm"
            variant="outline"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() =>
              addToast({
                type: 'success',
                title: 'Master Export Complete',
                message: 'Full master employee database exported.'
              })
            }
          >
            Export All
          </Button>
        </div>
      </div>

      <Table columns={columns} data={employees} />
    </div>
  );
};
