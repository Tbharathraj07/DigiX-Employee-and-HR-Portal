import React from 'react';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Users, UserCheck, ShieldCheck, Mail } from 'lucide-react';

export const HRManagement = () => {
  const { employees } = usePortalData();
  const { addToast } = useToast();

  const fallbackHrStaff = [
    {
      name: "Priyanka",
      title: "HR Manager",
      division: "Human Resources Operations",
      employeesCovered: 140,
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
      status: "Active",
      email: "priyanka@digix.internal"
    },
    {
      name: "Julian Gomez",
      title: "Senior Technical Recruiter",
      division: "Engineering Hiring & Sourcing",
      employeesCovered: 65,
      avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
      status: "Active",
      email: "julian.gomez@digix.internal"
    },
    {
      name: "Elena Rostova",
      title: "Chief People Officer (Executive)",
      division: "Executive People Committee",
      employeesCovered: 248,
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
      status: "Active",
      email: "elena.rostova@digix.internal"
    }
  ];

  // Derive HR leads from live employees list if available
  const liveHrEmployees = (employees || []).filter(e =>
    e.department?.toLowerCase().includes('hr') ||
    e.department?.toLowerCase().includes('human') ||
    e.role === 'hr' ||
    e.role === 'hr_manager' ||
    e.roleTitle?.toLowerCase().includes('hr') ||
    e.roleTitle?.toLowerCase().includes('people')
  );

  const displayStaff = liveHrEmployees.length > 0
    ? liveHrEmployees.map(e => ({
        name: e.name,
        title: e.roleTitle || 'HR Manager',
        division: e.department || 'Human Resources',
        employeesCovered: employees.length,
        avatar: e.avatar,
        status: e.status || 'Active',
        email: e.email
      }))
    : fallbackHrStaff;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div>
          <h2 className="text-xl font-bold text-slate-900">HR Division Administration</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Oversight of People Operations managers, departmental coverage assignments, and compliance approvals.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() =>
            addToast({
              type: 'info',
              title: 'Assign Coverage',
              message: 'Departmental HR business partner reallocation opened.'
            })
          }
        >
          Assign Department Head
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {displayStaff.map((staff, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start gap-3.5">
                <img
                  src={staff.avatar}
                  alt={staff.name}
                  className="w-12 h-12 rounded-xl object-cover ring-2 ring-purple-100"
                />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{staff.name}</h4>
                  <p className="text-xs text-slate-500">{staff.title}</p>
                  <Badge variant="purple" size="sm" className="mt-1">
                    {staff.division}
                  </Badge>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Direct Coverage:</span>
                  <span className="font-semibold text-slate-800">{staff.employeesCovered} Employees</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Approval Power:</span>
                  <span className="font-semibold text-emerald-600">Full Authority</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
              <a
                href={`mailto:${staff.email}`}
                className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg text-center transition-colors flex items-center justify-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Contact HR Lead
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
