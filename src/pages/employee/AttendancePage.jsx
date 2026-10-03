import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePortalData, getLocalDateKey, getLiveWorkingDuration, formatDateDisplay } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card, StatCard } from '../../components/common/Card';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
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
  Sparkles,
  RotateCw
} from 'lucide-react';

export const AttendancePage = () => {
  const { user, isSupabaseAuth } = useAuth();
  const {
    attendance,
    isPunchedIn,
    recordLoginAttendance,
    recordLogoutAttendance,
    fetchAttendanceRecords,
    isLoadingAttendance,
    attendanceError,
    ATTENDANCE_CONFIG
  } = usePortalData();
  const { addToast } = useToast();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Real-time ticking interval for active session duration
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Supabase attendance on mount for real employees
  useEffect(() => {
    if (isSupabaseAuth && user?.dbId) {
      fetchAttendanceRecords();
    }
  }, [isSupabaseAuth, user?.dbId, fetchAttendanceRecords]);

  const todayKey = getLocalDateKey(currentTime);

  // Filter attendance records specifically for the logged-in employee
  const employeeRecords = attendance.filter(
    (rec) =>
      rec.employeeUuid === user?.dbId ||
      rec.employeeId === user?.id ||
      rec.employeeId === user?.badgeNumber ||
      rec.employeeName === user?.name
  );

  // Find today's attendance record
  const todayRecord = employeeRecords.find(
    (rec) => rec.dateKey === todayKey || rec.dateKey === 'TODAY'
  );

  const isActive = todayRecord?.isActive ?? isPunchedIn;
  const isShiftCompleted = Boolean(!isActive && todayRecord && (todayRecord.checkOutIso || (todayRecord.checkOut && todayRecord.checkOut !== '--')));

  const liveDuration = todayRecord
    ? getLiveWorkingDuration(todayRecord, currentTime)
    : { formatted: '00h 00m', minutes: 0 };

  // Manual Check In Handler
  const handleCheckIn = async () => {
    if (isActionLoading) return;
    setIsActionLoading(true);
    try {
      const res = await recordLoginAttendance(user);
      if (res) {
        addToast({
          type: 'success',
          title: 'Checked In Successfully',
          message: `Shift started at ${res.checkIn || 'now'}. Status: ${res.status || 'Active'}`
        });
      } else {
        addToast({
          type: 'error',
          title: 'Check-In Failed',
          message: 'Unable to record check-in. Please try again.'
        });
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Check-In Error',
        message: err.message || 'An unexpected error occurred during check-in.'
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Manual Check Out Handler
  const handleCheckOut = async () => {
    if (isActionLoading) return;
    setIsActionLoading(true);
    try {
      const res = await recordLogoutAttendance(user);
      if (res) {
        addToast({
          type: 'success',
          title: 'Checked Out Successfully',
          message: `Shift completed at ${res.checkOut}. Total working duration: ${res.workingHours || '--'}`
        });
      } else {
        addToast({
          type: 'error',
          title: 'Check-Out Failed',
          message: 'Unable to record check-out. Please try again.'
        });
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Check-Out Error',
        message: err.message || 'An unexpected error occurred during check-out.'
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Compute stats from filtered employee records
  const daysPresent = employeeRecords.filter((r) => r.status === 'PRESENT' || r.isActive).length;
  const completedRecords = employeeRecords.filter((r) => r.totalWorkingMinutes > 0);
  const avgMinutes = completedRecords.length > 0
    ? Math.round(completedRecords.reduce((acc, r) => acc + r.totalWorkingMinutes, 0) / completedRecords.length)
    : 0;
  const avgHoursFormatted = avgMinutes > 0
    ? `${String(Math.floor(avgMinutes / 60)).padStart(2, '0')}h ${String(avgMinutes % 60).padStart(2, '0')}m`
    : '08h 30m';
  const lateCount = employeeRecords.filter((r) => r.status === 'LATE').length;

  const columns = [
    {
      header: 'Date',
      accessor: 'date',
      cellClassName: 'font-mono text-xs font-semibold text-slate-900',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{row.date === 'TODAY' || row.date === 'Today' ? todayRecord?.date || formatDateDisplay(currentTime) : row.date}</span>
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
    },
    {
      header: 'Work Mode',
      accessor: 'workMode',
      cellClassName: 'text-xs text-slate-600',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
          {row.workMode || 'On-Site'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header with Live Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Attendance & Work Hours</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time biometric and login/logout attendance records for DigiX Technologies.
          </p>
        </div>

        {isSupabaseAuth && (
          <Button
            size="sm"
            variant="outline"
            leftIcon={<RotateCw className={`w-4 h-4 ${isLoadingAttendance ? 'animate-spin' : ''}`} />}
            onClick={() => fetchAttendanceRecords()}
            disabled={isLoadingAttendance}
            className="text-xs font-semibold self-start sm:self-auto"
          >
            {isLoadingAttendance ? 'Syncing...' : 'Refresh Records'}
          </Button>
        )}
      </div>

      {/* Error state banner */}
      {attendanceError && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Unable to sync latest attendance records. Please verify your connection.</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => fetchAttendanceRecords()} className="text-xs">
            Retry
          </Button>
        </div>
      )}

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
                ) : isShiftCompleted ? (
                  <Badge variant="neutral" size="sm" dot>
                    Shift Completed
                  </Badge>
                ) : (
                  <Badge variant="warning" size="sm" dot>
                    Not Checked In
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Real-time automated biometric & session tracking for <span className="font-semibold text-slate-700">{user?.name}</span> ({user?.id || user?.badgeNumber}).
              </p>
            </div>
          </div>

          {/* Metric Indicators + Check In / Check Out Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
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
                    {isActive ? 'ACTIVE' : todayRecord?.status || (todayRecord ? 'PRESENT' : 'OFFLINE')}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Check-In / Check-Out Action Button */}
            <div className="flex flex-col justify-center">
              {isActive ? (
                <Button
                  size="md"
                  variant="danger"
                  leftIcon={<LogOut className="w-4 h-4" />}
                  onClick={handleCheckOut}
                  disabled={isActionLoading}
                  className="font-semibold text-xs shadow-sm bg-rose-600 hover:bg-rose-700 text-white border-rose-600 w-full sm:w-auto"
                >
                  {isActionLoading ? 'Checking Out...' : 'Check Out'}
                </Button>
              ) : isShiftCompleted ? (
                <div className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Shift Completed</span>
                </div>
              ) : (
                <Button
                  size="md"
                  variant="primary"
                  leftIcon={<LogIn className="w-4 h-4" />}
                  onClick={handleCheckIn}
                  disabled={isActionLoading}
                  className="font-semibold text-xs shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 w-full sm:w-auto"
                >
                  {isActionLoading ? 'Checking In...' : 'Check In'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Security & System-Generated Notice */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-digix-500" />
            <span>
              Attendance records are cryptographically verified and synchronized with Supabase core schema.
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
          value={`${daysPresent} Days`}
          subtitle="Current calendar cycle"
          icon={CalendarCheck}
          color="emerald"
        />
        <StatCard
          title="Average Daily Hours"
          value={avgHoursFormatted}
          subtitle="Computed from shift logs"
          icon={Clock}
          color="blue"
        />
        <StatCard
          title="Late Check-ins"
          value={`${lateCount}`}
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
        <Table
          columns={columns}
          data={employeeRecords}
          emptyMessage={
            isLoadingAttendance
              ? "Fetching attendance records from Supabase..."
              : "No attendance records found for current cycle. Your check-in history will appear here."
          }
        />
      </Card>
    </div>
  );
};
