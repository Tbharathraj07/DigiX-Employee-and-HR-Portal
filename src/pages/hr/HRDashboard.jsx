import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card, StatCard } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Users,
  CalendarOff,
  UserPlus,
  TrendingUp,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Clock,
  Briefcase
} from 'lucide-react';

export const HRDashboard = () => {
  const { user } = useAuth();
  const { employees, leaveRequests, updateLeaveStatus, candidates, onboarding, profileRequests } = usePortalData();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const pendingLeaves = leaveRequests.filter((r) => r.status === 'Pending');
  const activeCandidates = candidates.filter((c) => c.stage !== 'Hired');
  const pendingProfileRequests = profileRequests.filter((r) => r.status === 'Pending');

  const handleApproveLeave = (req) => {
    updateLeaveStatus(req.id, 'Approved', 'Approved by People Ops.');
    addToast({
      type: 'success',
      title: 'Leave Approved',
      message: `${req.type} for ${req.employeeName} has been approved.`
    });
  };

  const handleRejectLeave = (req) => {
    updateLeaveStatus(req.id, 'Rejected', 'Conflicting company delivery milestones.');
    addToast({
      type: 'error',
      title: 'Leave Rejected',
      message: `Request for ${req.employeeName} has been declined.`
    });
  };

  // Department distribution
  const departments = {};
  employees.forEach((emp) => {
    departments[emp.department] = (departments[emp.department] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-700 via-purple-600 to-digix-600 text-white p-6 sm:p-8 shadow-card">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Human Resources & Talent Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            People Operations Dashboard
          </h1>
          <p className="text-purple-100 text-xs sm:text-sm max-w-xl">
            Welcome, <span className="font-semibold text-white">{user?.name}</span>. Manage global talent, approve leave requests, and oversee employee profile change requests.
          </p>
        </div>
      </div>

      {/* High-level HR Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Workforce"
          value={employees.length + 238} // Realistic corporate headcount
          subtitle="Full-time employees globally"
          icon={Users}
          color="blue"
          onClick={() => navigate('/hr/employees')}
        />
        <StatCard
          title="Pending Leaves"
          value={pendingLeaves.length}
          subtitle="Awaiting manager sign-off"
          icon={CalendarOff}
          color="amber"
          onClick={() => navigate('/hr/leave-requests')}
        />
        <StatCard
          title="Profile Requests"
          value={pendingProfileRequests.length}
          subtitle="Amendments awaiting verification"
          icon={UserPlus}
          color="purple"
          onClick={() => navigate('/hr/profile-requests')}
        />
        <StatCard
          title="Active Candidates"
          value={activeCandidates.length}
          subtitle="In recruitment pipeline"
          icon={Briefcase}
          color="emerald"
          onClick={() => navigate('/hr/recruitment')}
        />
      </div>

      {/* Main Grid: Pending Leave Requests & Department Headcount */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Quick Leave Approval Queue */}
        <div className="lg:col-span-7 space-y-6">
          <Card
            title="Pending Leave Approval Queue"
            subtitle={`${pendingLeaves.length} requests needing prompt administrative action`}
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/hr/leave-requests')}
                rightIcon={<ArrowUpRight className="w-4 h-4" />}
              >
                View All
              </Button>
            }
          >
            {pendingLeaves.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                All leave applications have been reviewed.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingLeaves.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {req.employeeName}
                        </span>
                        <Badge variant="primary" size="sm">
                          {req.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {req.startDate} to {req.endDate} ({req.days} days) • {req.department}
                      </p>
                      <p className="text-xs text-slate-600 mt-1 italic">
                        "{req.reason}"
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleApproveLeave(req)}
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleRejectLeave(req)}
                        leftIcon={<XCircle className="w-3.5 h-3.5" />}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* New Hires Onboarding Status */}
          <Card
            title="New Joiners & Onboarding Milestones"
            subtitle="Recent hires undergoing corporate orientation"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/hr/onboarding')}
                rightIcon={<ArrowUpRight className="w-4 h-4" />}
              >
                Tracker
              </Button>
            }
          >
            <div className="space-y-3">
              {onboarding.map((item) => (
                <div key={item.id} className="p-3.5 rounded-xl border border-slate-100 bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{item.employeeName}</h4>
                      <p className="text-xs text-slate-500">{item.role} • {item.department}</p>
                    </div>
                    <span className="text-xs font-bold text-slate-700">{item.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-purple-600 rounded-full" style={{ width: `${item.progress}%` }} />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 mt-2">
                    <span>Buddy: {item.buddy}</span>
                    <span>Join Date: {item.joinDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right 5 Cols: Department Distribution & Candidate Stages */}
        <div className="lg:col-span-5 space-y-6">
          <Card title="Department Distribution">
            <div className="space-y-3">
              {Object.entries(departments).map(([dept, count]) => (
                <div key={dept} className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span className="font-semibold">{dept}</span>
                    <span>{count * 24} staff</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-digix-500 rounded-full"
                      style={{ width: `${(count / employees.length) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Recruitment Snapshot */}
          <Card
            title="Recruitment Pipeline"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/hr/recruitment')}
              >
                ATS Board
              </Button>
            }
          >
            <div className="space-y-2.5">
              {candidates.slice(0, 4).map((cand) => (
                <div
                  key={cand.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">{cand.name}</span>
                    <span className="text-slate-500">{cand.roleApplied}</span>
                  </div>
                  <Badge variant="purple" size="sm">
                    {cand.stage}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
