import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePortalData } from '../../context/DataContext';
import { Card, StatCard } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  ShieldCheck,
  Server,
  Users,
  Activity,
  ArrowUpRight,
  Lock,
  Database,
  Cpu
} from 'lucide-react';

export const AdminDashboard = () => {
  const { user } = useAuth();
  const { auditLogs, employees, projects, tasks, leaveRequests, candidates } = usePortalData();
  const navigate = useNavigate();

  const activeEmployees = employees.filter((e) => e.status === 'Active' || e.status === 'active');
  const pendingLeaves = leaveRequests.filter((r) => r.status === 'Pending');
  const activeCandidates = candidates.filter((c) => c.stage !== 'Hired');

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-amber-900 text-white p-6 sm:p-8 shadow-card">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>DigiX Infrastructure & Security Command</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            System Administration Console
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
            Signed in as <span className="font-semibold text-white">{user?.name}</span> ({user?.roleTitle}). Monitoring security posture, user permissions, and cloud cluster performance.
          </p>
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Cluster & DB Health"
          value="Operational"
          subtitle="Supabase Cloud connected"
          icon={Server}
          color="emerald"
        />
        <StatCard
          title="Active Portal Users"
          value={employees.length}
          subtitle={`${activeEmployees.length} active employee profiles`}
          icon={Users}
          color="blue"
          onClick={() => navigate('/admin/users')}
        />
        <StatCard
          title="Security Score"
          value="A+"
          subtitle="SOC2 & Supabase RLS Active"
          icon={ShieldCheck}
          color="purple"
          onClick={() => navigate('/admin/security-logs')}
        />
        <StatCard
          title="Audit Trail Logs"
          value={auditLogs.length}
          subtitle="Events recorded in Supabase"
          icon={Activity}
          color="amber"
          onClick={() => navigate('/admin/security-logs')}
        />
      </div>

      {/* Health Gauges & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Real-time System Audit Logs */}
        <div className="lg:col-span-7">
          <Card
            title="Real-Time System Audit Trail"
            subtitle="Latest security, authentication, and state events"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin/security-logs')}
                rightIcon={<ArrowUpRight className="w-4 h-4" />}
              >
                Full Audit Log
              </Button>
            }
          >
            <div className="space-y-2.5">
              {auditLogs.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No system audit events recorded yet.
                </div>
              ) : (
                auditLogs.slice(0, 6).map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl border border-slate-100 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          log.status === 'Success'
                            ? 'bg-emerald-500'
                            : log.status === 'Warning'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                      />
                      <div>
                        <p className="font-semibold text-slate-800">{log.action}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span className="font-mono">{log.ip}</span>
                          <span>•</span>
                          <span>{log.module}</span>
                          {log.userName && <span>• {log.userName}</span>}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                      {log.timestamp ? (log.timestamp.split(' ')[1] || log.timestamp) : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right 5 Cols: Cloud Nodes & Quick Admin Actions */}
        <div className="lg:col-span-5 space-y-6">
          <Card title="Infrastructure Nodes Status">
            <div className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>us-west-2 (Oregon Primary EKS)</span>
                  <span className="text-emerald-600">Operational</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Latency: 18ms</span>
                  <span>Load: 42%</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>us-east-1 (N. Virginia Failover)</span>
                  <span className="text-emerald-600">Standby (Warm)</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Latency: 24ms</span>
                  <span>Load: 12%</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>eu-central-1 (Frankfurt GDPR Node)</span>
                  <span className="text-emerald-600">Operational</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Latency: 82ms</span>
                  <span>Load: 31%</span>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Live System Entities">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Active Projects</span>
                <span className="text-sm font-bold text-slate-900">{projects.length}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Tracked Tasks</span>
                <span className="text-sm font-bold text-slate-900">{tasks.length}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Pending Leaves</span>
                <span className="text-sm font-bold text-slate-900">{pendingLeaves.length}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Active Candidates</span>
                <span className="text-sm font-bold text-slate-900">{activeCandidates.length}</span>
              </div>
            </div>
          </Card>

          <Card title="Administrative Actions">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate('/admin/roles-permissions')}
                className="p-3 text-left rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/50 transition-colors flex flex-col items-start"
              >
                <Lock className="w-5 h-5 text-amber-600 mb-1.5" />
                <span className="text-xs font-semibold text-slate-800">Permissions</span>
                <span className="text-[10px] text-slate-400">Role Matrix</span>
              </button>

              <button
                onClick={() => navigate('/admin/system-settings')}
                className="p-3 text-left rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/50 transition-colors flex flex-col items-start"
              >
                <Server className="w-5 h-5 text-digix-600 mb-1.5" />
                <span className="text-xs font-semibold text-slate-800">Settings</span>
                <span className="text-[10px] text-slate-400">Portal Config</span>
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
