import React from 'react';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { FileText, Upload, Download, Eye, Plus } from 'lucide-react';

export const HRDocuments = () => {
  const { documents } = usePortalData();
  const { addToast } = useToast();

  const columns = [
    {
      header: 'Document Name',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <FileText className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <span className="text-xs font-bold text-slate-900">{row.name}</span>
        </div>
      )
    },
    { header: 'Category', accessor: 'category', cellClassName: 'text-xs text-slate-600' },
    { header: 'File Format', accessor: 'type', cellClassName: 'text-xs font-mono font-medium text-slate-700' },
    { header: 'Size', accessor: 'fileSize', cellClassName: 'text-xs text-slate-500' },
    { header: 'Upload Date', accessor: 'uploadDate', cellClassName: 'text-xs text-slate-400' },
    {
      header: 'Actions',
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          leftIcon={<Download className="w-3.5 h-3.5" />}
          onClick={() =>
            addToast({
              type: 'success',
              title: 'File Downloaded',
              message: `Saved: ${row.name}`
            })
          }
        >
          Download
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">HR Document Repository</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Central repository for employee policy guides, benefits brochures, and legal forms.
          </p>
        </div>

        <Button
          size="sm"
          leftIcon={<Upload className="w-4 h-4" />}
          onClick={() =>
            addToast({
              type: 'info',
              title: 'Upload Modal',
              message: 'Document distribution engine initialized.'
            })
          }
        >
          Publish Policy Document
        </Button>
      </div>

      <Table columns={columns} data={documents} />
    </div>
  );
};
