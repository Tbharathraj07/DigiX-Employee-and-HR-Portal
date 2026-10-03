import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePortalData, getLocalDateKey, getLiveWorkingDuration, formatDateDisplay } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { SearchInput } from '../../components/common/SearchInput';
import {
  CalendarCheck,
  Users,
  AlertTriangle,
  Download,
  Clock,
  Activity,
  UserCheck,
  UserX,
  CalendarOff,
  LogIn,
  LogOut,
  Timer,
  CheckCircle2,
  Building,
  Filter,
  Eye,
  Calendar,
  RotateCw,
  Mail,
  Briefcase
} from 'lucide-react';

export const HRAttendance = () => {
  const { isSupabaseAuth } = useAuth();
  const {
    employees,
    attendance,
    leaveRequests,
    fetchAttendanceRecords,
    isLoadingAttendance,
    attendanceError
  } = usePortalData();
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('Today');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live timer update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Supabase attendance on mount for HR/Admin
  useEffect(() => {
    if (isSupabaseAuth) {
      fetchAttendanceRecords();
    }
  }, [isSupabaseAuth, fetchAttendanceRecords]);

  const todayKey = getLocalDateKey(currentTime);

  // Derive Today's Comprehensive Roster
  const todayAttendanceList = attendance.filter(
    (a) => a.dateKey === todayKey || a.dateKey === 'TODAY' || a.date === 'Today' || a.date === formatDateDisplay(currentTime)
  );

  // Compute Summary Metrics for Today
  const totalEmployeesCount = employees.length || new Set(attendance.map((a) => a.employeeUuid || a.employeeId)).size || 1;
  const currentlyActiveCount = todayAttendanceList.filter((a) => a.isActive).length;
  const lateTodayCount = todayAttendanceList.filter((a) => a.status === 'LATE').length;
  const presentTodayCount = todayAttendanceList.filter((a) => a.status === 'PRESENT' || a.status === 'LATE' || a.isActive).length;

  const onLeaveTodayCount = leaveRequests.filter(
    (req) => req.status === 'Approved' && req.startDate <= todayKey && req.endDate >= todayKey
  ).length;

  const absentTodayCount = Math.max(0, totalEmployeesCount - presentTodayCount - onLeaveTodayCount);

  // Filtered dataset for Table
  let displayData = attendance;
  if (dateFilter === 'Today') {
    displayData = todayAttendanceList;
  }

  const filteredAttendance = displayData.filter((row) => {
    const matchesDept = deptFilter === 'All' || row.department === deptFilter;
    const matchesSearch =
      (row.employeeName || '').toLowerCase().includes(search.toLowerCase()) ||
      (row.employeeId || '').toLowerCase().includes(search.toLowerCase()) ||
      (row.department || '').toLowerCase().includes(search.toLowerCase());

    let matchesStatus = true;
    if (statusFilter === 'Active') {
      matchesStatus = row.isActive;
    } else if (statusFilter === 'Present') {
      matchesStatus = row.status === 'PRESENT' || row.isActive;
    } else if (statusFilter === 'Late') {
      matchesStatus = row.status === 'LATE';
    } else if (statusFilter === 'On Leave') {
      matchesStatus = row.status === 'ON LEAVE';
    } else if (statusFilter === 'Absent') {
      matchesStatus = row.status === 'ABSENT';
    }

    return matchesDept && matchesSearch && matchesStatus;
  });

  // Export Attendance to CSV
  const handleExportCsv = () => {
    if (!filteredAttendance || filteredAttendance.length === 0) {
      addToast({
        type: 'warning',
        title: 'Export Empty',
        message: 'No attendance records available to export for current filter.'
      });
      return;
    }

    const headers = ['Date', 'Employee ID', 'Employee Name', 'Department', 'Check In', 'Check Out', 'Working Hours', 'Status', 'Work Mode'];
    const rows = filteredAttendance.map((row) => [
      `"${row.date || ''}"`,
      `"${row.employeeId || ''}"`,
      `"${row.employeeName || ''}"`,
      `"${row.department || ''}"`,
      `"${row.checkIn || '--'}"`,
      `"${row.isActive ? 'Currently Active' : row.checkOut || '--'}"`,
      `"${row.isActive ? getLiveWorkingDuration(row, currentTime).formatted : row.workingHours || '--'}"`,
      `"${row.isActive ? 'ACTIVE' : row.status || 'PRESENT'}"`,
      `"${row.workMode || 'On-Site'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `digix_attendance_${dateFilter.toLowerCase()}_${todayKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast({
      type: 'success',
      title: 'Report Exported',
      message: `Downloaded CSV roster with ${filteredAttendance.length} attendance records.`
    });
  };

  const columns = [
    {
      header: 'Employee',
      render: (row) => (
        <div className="flex items-center gap-3">
          <img
            src={row.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={row.employeeName}
            className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200"
          />
          <div>
            <span className="font-bold text-slate-900 block text-xs">{row.employeeName}</span>
            <span className="text-[10px] text-slate-400 font-mono">{row.employeeId}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Employee ID',
      accessor: 'employeeId',
      cellClassName: 'text-xs font-mono font-medium text-slate-600'
    },
    {
      header: 'Department',
      accessor: 'department',
      cellClassName: 'text-xs text-slate-600 font-medium'
    },
    {
      header: 'Date',
      accessor: 'date',
      cellClassName: 'text-xs font-mono text-slate-700',
      render: (row) => (
        <span>{row.date === 'TODAY' || row.date === 'Today' ? formatDateDisplay(currentTime) : row.date}</span>
      )
    },
    {
      header: 'Check In',
      accessor: 'checkIn',
      cellClassName: 'text-xs font-mono font-medium text-slate-800',
      render: (row) => (
        <span className="inline-flex items-center gap-1.5">
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
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Currently Active
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5">
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
            {row.checkOut || '--'}
          </span>
        );
      }
    },
    {
      header: 'Working Hours',
      accessor: 'workingHours',
      cellClassName: 'text-xs font-mono font-semibold text-slate-900',
      render: (row) => {
        if (row.isActive) {
          const live = getLiveWorkingDuration(row, currentTime);
          return (
            <span className="font-bold text-digix-700">
              {live.formatted} (Live)
            </span>
          );
        }
        return <span>{row.workingHours || '--'}</span>;
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
                : 'danger'
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
      cellClassName: 'text-xs text-slate-500',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200">
          {row.workMode || 'On-Site'}
        </span>
      )
    },
    {
      header: 'Action',
      render: (row) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedRecord(row);
          }}
          className="text-xs text-digix-600 hover:text-digix-800 py-1 px-2"
        >
          <Eye className="w-3.5 h-3.5 mr-1" />
          Details
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Organization Attendance System</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time biometric and browser login/logout attendance feeds across DigiX Technologies.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isSupabaseAuth && (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<RotateCw className={`w-4 h-4 ${isLoadingAttendance ? 'animate-spin' : ''}`} />}
              onClick={() => fetchAttendanceRecords()}
              disabled={isLoadingAttendance}
              className="text-xs font-semibold"
            >
              {isLoadingAttendance ? 'Syncing...' : 'Refresh'}
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportCsv}
            className="text-xs font-semibold"
          >
            Export Attendance
          </Button>
        </div>
      </div>

      {/* Error State Banner */}
      {attendanceError && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Unable to sync organizational attendance records. Please verify your connection.</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => fetchAttendanceRecords()} className="text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Top 6 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Employees</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-slate-900">{totalEmployeesCount}</span>
            <p className="text-[10px] text-slate-400 mt-0.5">Global Headcount</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Present Today</span>
            <CalendarCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-emerald-600">{presentTodayCount}</span>
            <p className="text-[10px] text-emerald-700/70 mt-0.5">Checked In Today</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-subtle flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Currently Active
            </span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-extrabold text-emerald-700">{currentlyActiveCount}</span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                Live
              </span>
            </div>
            <p className="text-[10px] text-emerald-700 mt-0.5">Online Workstations</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Late Today</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-amber-600">{lateTodayCount}</span>
            <p className="text-[10px] text-amber-700/70 mt-0.5">After 09:15 AM</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">On Leave</span>
            <CalendarOff className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-blue-600">{onLeaveTodayCount}</span>
            <p className="text-[10px] text-blue-700/70 mt-0.5">Approved PTO & Sick</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Absent</span>
            <UserX className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-rose-600">{absentTodayCount}</span>
            <p className="text-[10px] text-rose-700/70 mt-0.5">Unrecorded Shifts</p>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            placeholder="Search employee name or ID..."
            className="w-full sm:w-64"
          />

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-slate-300 text-xs py-2 px-3 bg-white font-medium text-slate-700"
          >
            <option value="All">All Departments</option>
            <option value="Technology">Technology</option>
            <option value="Engineering">Engineering</option>
            <option value="Product Design">Product Design</option>
            <option value="Human Resources">Human Resources</option>
            <option value="Data & AI">Data & AI</option>
            <option value="IT & Security">IT & Security</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-slate-300 text-xs py-2 px-3 bg-white font-medium text-slate-700"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Now</option>
            <option value="Present">Present</option>
            <option value="Late">Late</option>
            <option value="On Leave">On Leave</option>
            <option value="Absent">Absent</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200">
            <button
              onClick={() => setDateFilter('Today')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                dateFilter === 'Today'
                  ? 'bg-white text-digix-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today's Feed
            </button>
            <button
              onClick={() => setDateFilter('All')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                dateFilter === 'All'
                  ? 'bg-white text-digix-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Records History
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Roster Table */}
      <Card
        title={dateFilter === 'Today' ? `Live Attendance Roster (${formatDateDisplay(currentTime)})` : 'Organization Attendance History'}
        subtitle={`Showing ${filteredAttendance.length} attendance records. Click any row to view full session details and activity timeline.`}
      >
        <Table
          columns={columns}
          data={filteredAttendance}
          onRowClick={(row) => setSelectedRecord(row)}
          emptyMessage={
            isLoadingAttendance
              ? "Fetching organizational attendance roster from Supabase..."
              : "No attendance records match the selected filters."
          }
        />
      </Card>

      {/* Attendance Details Modal */}
      {selectedRecord && (
        <Modal
          isOpen={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          title="Attendance Record Dossier"
          subtitle={`Audit trail & session metrics for ${selectedRecord.employeeName}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5">
            {/* Employee Profile Header */}
            <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <img
                src={selectedRecord.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={selectedRecord.employeeName}
                className="w-12 h-12 rounded-xl object-cover ring-2 ring-white shadow-xs"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">{selectedRecord.employeeName}</h4>
                  <Badge
                    variant={
                      selectedRecord.isActive
                        ? 'success'
                        : selectedRecord.status === 'LATE'
                        ? 'warning'
                        : selectedRecord.status === 'ON LEAVE'
                        ? 'primary'
                        : 'success'
                    }
                    size="sm"
                    dot
                  >
                    {selectedRecord.isActive ? 'ACTIVE' : selectedRecord.status || 'PRESENT'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                  <span className="font-mono text-slate-700 font-semibold">{selectedRecord.employeeId}</span>
                  {selectedRecord.email && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-600">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {selectedRecord.email}
                      </span>
                    </>
                  )}
                  {selectedRecord.designation && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-600">
                        <Briefcase className="w-3 h-3 text-slate-400" />
                        {selectedRecord.designation}
                      </span>
                    </>
                  )}
                  <span>•</span>
                  <span>{selectedRecord.department}</span>
                  <span>•</span>
                  <span className="text-digix-600 font-medium">{selectedRecord.workMode || 'On-Site'}</span>
                </div>
              </div>
            </div>

            {/* Timings & Duration Breakdown */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Check In</span>
                <p className="text-sm font-bold font-mono text-slate-900 mt-1 flex items-center gap-1">
                  <LogIn className="w-3.5 h-3.5 text-emerald-500" />
                  {selectedRecord.checkIn || '--'}
                </p>
                <span className="text-[10px] text-slate-400">
                  {selectedRecord.status === 'LATE' ? 'Late arrival (> 09:15 AM)' : 'On-time standard'}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Check Out</span>
                <p className="text-sm font-bold font-mono text-slate-900 mt-1 flex items-center gap-1">
                  <LogOut className="w-3.5 h-3.5 text-slate-400" />
                  {selectedRecord.isActive ? 'Currently Active' : selectedRecord.checkOut || '--'}
                </p>
                <span className="text-[10px] text-slate-400">
                  {selectedRecord.isActive ? 'Session in progress' : 'Shift completed'}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Working Hours</span>
                <p className="text-sm font-extrabold font-mono text-digix-700 mt-1">
                  {selectedRecord.isActive
                    ? getLiveWorkingDuration(selectedRecord, currentTime).formatted
                    : selectedRecord.workingHours || '--'}
                </p>
                <span className="text-[10px] text-slate-400">Standard: 09h 00m</span>
              </div>
            </div>

            {/* Activity Timeline */}
            <div>
              <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                Session Activity Timeline
              </h5>
              <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 space-y-3">
                {selectedRecord.activities && selectedRecord.activities.length > 0 ? (
                  selectedRecord.activities.map((act, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            act.type === 'login'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {act.type === 'login' ? <LogIn className="w-3.5 h-3.5" /> : <LogOut className="w-3.5 h-3.5" />}
                        </div>
                        <span className="font-semibold capitalize text-slate-800">
                          {act.type === 'login' ? 'Login / Check-In' : 'Logout / Check-Out'}
                        </span>
                      </div>
                      <span className="font-mono text-slate-600 font-medium">{act.time}</span>
                    </div>
                  ))
                ) : (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-700">
                        <LogIn className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Login Check-In</span>
                      </div>
                      <span className="font-mono font-medium">{selectedRecord.checkIn}</span>
                    </div>
                    {selectedRecord.checkOut && selectedRecord.checkOut !== '--' && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-700">
                          <LogOut className="w-3.5 h-3.5 text-slate-400" />
                          <span>Logout Check-Out</span>
                        </div>
                        <span className="font-mono font-medium">{selectedRecord.checkOut}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Sessions Detail (if multi-session) */}
            {selectedRecord.sessions && selectedRecord.sessions.length > 1 && (
              <div>
                <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Multi-Session Breakdown
                </h5>
                <div className="space-y-1.5">
                  {selectedRecord.sessions.map((ses, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="font-medium text-slate-700">Session {idx + 1}</span>
                      <span className="font-mono text-slate-600">
                        {ses.checkIn} → {ses.checkOut || 'Active'}
                      </span>
                      <span className="font-mono font-semibold text-digix-700">
                        {Math.floor((ses.durationMinutes || 0) / 60)}h {(ses.durationMinutes || 0) % 60}m
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security Audit Stamp */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-mono">Record ID: {selectedRecord.id}</span>
              <span>Encrypted Biometric & Token Verified</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
