import React from 'react';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { FileText, Download, Upload, ShieldCheck, Eye } from 'lucide-react';

export const DocumentsPage = () => {
  const { documents } = usePortalData();
  const { addToast } = useToast();

  const handleDownload = (doc) => {
    addToast({
      type: 'success',
      title: 'Downloading Document',
      message: `Fetching verified file: ${doc.name} (${doc.fileSize})`
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Documents & Records</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Access payslips, tax certificates, and verified corporate agreements.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          leftIcon={<Upload className="w-4 h-4" />}
          onClick={() =>
            addToast({
              type: 'info',
              title: 'Upload Request',
              message: 'Personal document uploads (reimbursements, tax proofs) open during quarterly audit windows.'
            })
          }
        >
          Upload Document
        </Button>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-digix-50 text-digix-600 flex items-center justify-center border border-digix-100">
                  <FileText className="w-5 h-5" />
                </div>
                <Badge variant="neutral" size="sm">
                  {doc.type}
                </Badge>
              </div>

              <h4 className="text-sm font-bold text-slate-900 mt-3">
                {doc.name}
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Category: <span className="text-slate-600 font-medium">{doc.category}</span>
              </p>

              <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Size: {doc.fileSize}</span>
                <span>Date: {doc.uploadDate}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={() => handleDownload(doc)}
              >
                Download PDF
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
