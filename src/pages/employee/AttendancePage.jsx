import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePortalData, getLocalDateKey, getLiveWorkingDuration } from '../../context/DataContext';
import { Card, StatCard } from '../../components/common/Card';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Timer,
  ShieldCheck,
  Activity,
  LogIn,
  LogOut,
  Calendar,
  Sparkles
} from 'lucide-react';

export const AttendancePage = () => {
  const { user } = useAuth();
  const { attendance, ATTENDANCE_CONFIG } = usePortalData();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time ticking interval for active session duration
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const todayKey = getLocalDateKey(currentTime);

  // Filter attendance records specifically for the logged-in employee
  const employeeRecords = attendance.filter(
    (rec) =>
      rec.employeeId === user?.id ||
      rec.employeeId === user?.badgeNumber ||
      rec.employeeName === user?.name
  );

  // Find today's attendance record
  const todayRecord = employeeRecords.find(
    (rec) => rec.dateKey === todayKey || rec.dateKey === 'TODAY'
  );

  const isActive = todayRecord?.isActive ?? false;
  const liveDuration = todayRecord
    ? getLiveWorkingDuration(todayRecord, currentTime)
    : { formatted: '00h 00m', minutes: 0 };

  const columns = [
    {
      header: 'Date',
      accessor: 'date',
      cellClassName: 'font-mono text-xs font-semibold text-slate-900',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{row.date === 'TODAY' || row.date === 'Today' ? todayRecord?.date || 'Today' : row.date}</span>
        </div>
      )
    },
    {
      header: 'Check In',
      accessor: 'checkIn',
      cellClassName: 'text-xs font-mono font-medium text-slate-800',
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-700">
          <LogIn className="w-3.5 h-3.5 text-emerald-500" />
          {row.checkIn || '--'}
        </span>
      )
    },
    {
      header: 'Check Out',
      accessor: 'checkOut',
      cellClassName: 'text-xs font-mono font-medium text-slate-800',
      render: (row) => {
        if (row.isActive) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Currently Active
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-700">
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
            {row.checkOut || '--'}
          </span>
        );
      }
    },
    {
      header: 'Working Hours',
      accessor: 'workingHours',
      cellClassName: 'text-xs font-bold text-slate-900',
      render: (row) => {
        if (row.isActive) {
          return (
            <span className="font-mono text-xs font-bold text-digix-700">
              {liveDuration.formatted} (Live)
            </span>
          );
        }
        return <span className="font-mono text-xs font-semibold text-slate-800">{row.workingHours || '--'}</span>;
      }
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => {
        if (row.isActive) {
          return (
            <Badge variant="success" size="sm" dot>
              ACTIVE
            </Badge>
          );
        }
        const st = (row.status || 'PRESENT').toUpperCase();
        return (
          <Badge
            variant={
              st === 'PRESENT'
                ? 'success'
                : st === 'LATE'
                ? 'warning'
                : st === 'ON LEAVE'
                ? 'primary'
                : 'neutral'
            }
            size="sm"
            dot
          >
            {st}
          </Badge>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Real-Time Today's Attendance Hero Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-200 ring-4 ring-emerald-50'
                  : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}
            >
              {isActive ? (
                <Timer className="w-8 h-8 text-emerald-600" />
              ) : (
                <Clock className="w-8 h-8 text-slate-500" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Today's Attendance Session
                </h2>
                {isActive ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="w-2 h-2 rounded-full bg-emerald-500 -ml-3.5" />
                    Logged In & Active
                  </span>
                ) : (
                  <Badge variant="neutral" size="sm" dot>
                    Shift Completed / Offline
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Real-time automated biometric & session tracking for <span className="font-semibold text-slate-700">{user?.name}</span> ({user?.id}).
              </p>
            </div>
          </div>

          {/* Real-time Metric Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Check In
              </span>
              <span className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                {todayRecord?.checkIn || '--'}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Check Out
              </span>
              <span className="text-sm font-bold font-mono mt-0.5">
                {isActive ? (
                  <span className="text-emerald-600 flex items-center gap-1 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active Now
                  </span>
                ) : (
                  <span className="text-slate-900">{todayRecord?.checkOut || '--'}</span>
                )}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Working Hours
              </span>
              <span className="text-sm font-extrabold text-digix-700 font-mono mt-0.5">
                {isActive ? liveDuration.formatted : todayRecord?.workingHours || '00h 00m'}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Status
              </span>
              <div className="mt-0.5">
                <Badge
                  variant={
                    isActive
                      ? 'success'
                      : todayRecord?.status === 'LATE'
                      ? 'warning'
                      : todayRecord?.status === 'ON LEAVE'
                      ? 'primary'
                      : 'success'
                  }
                  size="sm"
                  dot
                >
                  {isActive ? 'ACTIVE' : todayRecord?.status || 'PRESENT'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Security & System-Generated Notice */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-digix-500" />
            <span>
              Attendance is strictly system-generated upon portal login and logout. Manual time editing is restricted per corporate security policy.
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
            <span>Workday Standard: 09:00 AM</span>
            <span>•</span>
            <span>Grace Window: 15m</span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Days Present"
          value={`${employeeRecords.filter((r) => r.status === 'PRESENT' || r.isActive).length} Days`}
          subtitle="Current calendar cycle"
          icon={CalendarCheck}
          color="emerald"
        />
        <StatCard
          title="Average Daily Hours"
          value="8h 58m"
          subtitle="+14m vs company target"
          icon={Clock}
          color="blue"
        />
        <StatCard
          title="Late Check-ins"
          value={`${employeeRecords.filter((r) => r.status === 'LATE').length}`}
          subtitle="Threshold: > 09:15 AM"
          icon={AlertCircle}
          color="amber"
        />
        <StatCard
          title="Active Sessions"
          value={isActive ? '1 Online' : '0 Active'}
          subtitle={isActive ? 'Logged into workstation' : 'Shift logged out'}
          icon={Activity}
          color="purple"
        />
      </div>

      {/* Attendance History Table */}
      <Card
        title="Attendance Records (Current Cycle)"
        subtitle="Chronological audit records captured on login and logout events"
      >
        <Table columns={columns} data={employeeRecords} emptyMessage="No attendance records found for current cycle." />
      </Card>
    </div>
  );
};
