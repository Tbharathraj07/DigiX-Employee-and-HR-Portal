import React from 'react';
import { useToast } from '../../context/ToastContext';
import { Card, StatCard } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ShieldCheck, FileSpreadsheet, Download, Activity } from 'lucide-react';

export const AdminReports = () => {
  const { addToast } = useToast();

  const handleDownload = (name) => {
    addToast({
      type: 'success',
      title: 'Compliance Report Exported',
      message: `${name} downloaded successfully.`
    });
  };

  const auditPackages = [
    { title: 'SOC2 Type II Annual Access Certification Evidence', period: '2026 Audit Window', format: 'ZIP / PDF' },
    { title: 'ISO/IEC 27001 ISMS Continuous Monitoring Dossier', period: 'Q3 2026', format: 'PDF' },
    { title: 'GDPR / CCPA Data Access & Subject Rights Request Log', period: 'Last 12 Months', format: 'CSV' },
    { title: 'AWS CloudTrail & VPC Flow Log Retention Verification', period: 'Real-time', format: 'JSON Dump' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">System Compliance & Security Reports</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Download certified audit packages for external auditors and enterprise customer security reviews.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {auditPackages.map((pkg, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <span className="text-xs font-semibold text-slate-500">{pkg.period}</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 mt-2">{pkg.title}</h4>
              <p className="text-xs text-slate-400 mt-1">Export format: {pkg.format}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={() => handleDownload(pkg.title)}
              >
                Download Package
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
