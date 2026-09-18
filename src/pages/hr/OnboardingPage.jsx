import React from 'react';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { CheckSquare, UserPlus, Users, Calendar, ArrowRight } from 'lucide-react';

export const OnboardingPage = () => {
  const { onboarding } = usePortalData();
  const { addToast } = useToast();

  const sampleTasks = [
    { title: 'Provision MacBook Pro & YubiKey Hardware', done: true },
    { title: 'Grant Google Workspace & Slack Enterprise Access', done: true },
    { title: 'Assign Corporate Mentor / Buddy', done: true },
    { title: 'Complete SOC2 & InfoSec Mandatory Training', done: false },
    { title: '30-Day Manager Performance Alignment Check-in', done: false }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">New Hire Onboarding Tracker</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor orientation progress, equipment provisioning, and buddy allocations.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() =>
            addToast({
              type: 'success',
              title: 'Onboarding Cohort Created',
              message: 'October 2026 onboarding orientation scheduled.'
            })
          }
        >
          New Orientation Cohort
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {onboarding.map((hire) => (
          <div
            key={hire.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded">
                  {hire.id}
                </span>
                <Badge variant="primary" size="sm">
                  {hire.department}
                </Badge>
              </div>

              <h3 className="text-base font-bold text-slate-900 mt-3">{hire.employeeName}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{hire.role}</p>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Start Date:</span>
                  <span className="font-semibold text-slate-800">{hire.joinDate}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Assigned Buddy:</span>
                  <span className="font-semibold text-purple-700">{hire.buddy}</span>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>Milestone Completion</span>
                  <span className="font-bold text-slate-900">{hire.progress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full" style={{ width: `${hire.progress}%` }} />
                </div>
              </div>

              <div className="mt-4 space-y-1.5 pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Checklist Progress:
                </span>
                {sampleTasks.slice(0, 3).map((t, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                    <span className={`w-1.5 h-1.5 rounded-full ${t.done ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className={t.done ? 'line-through text-slate-400' : ''}>{t.title}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() =>
                  addToast({
                    type: 'info',
                    title: 'Checklist Opened',
                    message: `Detailed orientation dossier for ${hire.employeeName}`
                  })
                }
              >
                Manage Checklist
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
