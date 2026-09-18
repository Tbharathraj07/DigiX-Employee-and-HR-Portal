import React from 'react';
import { useToast } from '../../context/ToastContext';
import { Card, StatCard } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Table } from '../../components/common/Table';
import { Download, FileSpreadsheet, TrendingUp, Users, CalendarCheck, Award } from 'lucide-react';

export const HRReports = () => {
  const { addToast } = useToast();

  const handleExport = (reportName) => {
    addToast({
      type: 'success',
      title: 'Report Generated',
      message: `${reportName} downloaded as CSV.`
    });
  };

  const reportItems = [
    { name: 'Global Headcount & Department Distribution', period: 'Monthly (Aug 2026)', size: '1.4 MB', records: '248 staff' },
    { name: 'Annual Leave Utilization & Liability Summary', period: 'FY 2025-2026', size: '890 KB', records: '1,240 records' },
    { name: 'Voluntary & Involuntary Attrition Analysis', period: 'Q2 2026', size: '420 KB', records: '11 exits' },
    { name: 'Recruitment Funnel & Cost-per-Hire Audit', period: 'H1 2026', size: '2.1 MB', records: '48 positions' },
    { name: 'Mandatory Compliance & SOC2 Training Completion', period: 'Current Quarter', size: '560 KB', records: '100% compliance' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Workforce Intelligence & Reports</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Key operational metrics, attrition insights, and exportable compliance summaries.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Annual Attrition Rate" value="4.2%" subtitle="Below industry benchmark (9.8%)" icon={TrendingUp} color="emerald" />
        <StatCard title="Average Retention" value="3.4 yrs" subtitle="+8 months vs 2024" icon={Award} color="blue" />
        <StatCard title="Gender Diversity Ratio" value="44% / 56%" subtitle="Target: 50% parity by 2027" icon={Users} color="purple" />
        <StatCard title="Avg Time to Hire" value="23 Days" subtitle="-4 days improvement" icon={CalendarCheck} color="amber" />
      </div>

      <Card title="Executive Reports Archive" subtitle="Ready-to-export enterprise datasets">
        <div className="divide-y divide-slate-100">
          {reportItems.map((r, idx) => (
            <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{r.name}</h4>
                  <p className="text-xs text-slate-400">
                    Period: {r.period} • Scope: {r.records} • File size: {r.size}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={() => handleExport(r.name)}
              >
                Export CSV
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
