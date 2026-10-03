import React, { useState, useMemo } from 'react';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card, StatCard } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Table } from '../../components/common/Table';
import {
  Download,
  FileSpreadsheet,
  Users,
  CalendarOff,
  CalendarCheck,
  Briefcase,
  GraduationCap,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

// Client-side CSV generator for Supabase live datasets
const exportToCsv = (filename, rows, columns) => {
  if (!rows || rows.length === 0) return false;
  const headerLine = columns.map((c) => `"${(c.header || '').replace(/"/g, '""')}"`).join(',');
  const rowLines = rows.map((row) =>
    columns
      .map((c) => {
        let val = typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor];
        if (val === null || val === undefined) val = '';
        val = String(val);
        // Formula injection mitigation (OWASP): neutralize leading =, +, -, @, \t, \r
        if (/^[=+\-@\t\r]/.test(val)) {
          val = `'${val}`;
        }
        val = val.replace(/"/g, '""');
        return `"${val}"`;
      })
      .join(',')
  );
  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
};

export const HRReports = () => {
  const {
    employees,
    leaveRequests,
    candidates,
    attendance,
    trainings,
    fetchEmployees,
    fetchLeaveRequests,
    fetchCandidates,
    fetchAttendanceRecords,
    fetchTrainings
  } = usePortalData();

  const { addToast } = useToast();

  const [activeReportKey, setActiveReportKey] = useState('workforce');
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Department choices derived from actual employees
  const availableDepts = useMemo(() => {
    const set = new Set(employees.map((e) => e.department).filter(Boolean));
    return Array.from(set).sort();
  }, [employees]);

  // Refresh all relevant datasets from Supabase
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.allSettled([
        fetchEmployees && fetchEmployees(),
        fetchLeaveRequests && fetchLeaveRequests(),
        fetchCandidates && fetchCandidates(),
        fetchAttendanceRecords && fetchAttendanceRecords(),
        fetchTrainings && fetchTrainings()
      ]);
      addToast({
        type: 'info',
        title: 'Datasets Refreshed',
        message: 'Live reports updated with latest Supabase records.'
      });
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false);
    }
  };

  // Define reports with live datasets and column mappings
  const reportConfigs = {
    workforce: {
      name: 'Global Workforce Directory',
      description: 'Active personnel, departments, role titles, and contact information.',
      icon: Users,
      badge: `${employees.length} records`,
      data: employees,
      columns: [
        { header: 'Employee ID', accessor: (r) => r.badgeNumber || r.id },
        { header: 'Name', accessor: 'name' },
        { header: 'Email', accessor: 'email' },
        { header: 'Department', accessor: 'department' },
        { header: 'Designation', accessor: (r) => r.roleTitle || r.designation || r.role },
        { header: 'Status', accessor: 'status' },
        { header: 'Join Date', accessor: (r) => r.joinDate || r.joiningDate || '--' }
      ],
      filterFn: (item) => {
        const matchesSearch =
          !searchTerm ||
          item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.roleTitle?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = deptFilter === 'all' || item.department === deptFilter;
        const matchesStatus =
          statusFilter === 'all' ||
          item.status?.toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesDept && matchesStatus;
      }
    },
    leaves: {
      name: 'Leave Requests & Utilization',
      description: 'Employee leave applications, types, duration, and approval states.',
      icon: CalendarOff,
      badge: `${leaveRequests.length} records`,
      data: leaveRequests,
      columns: [
        { header: 'Request ID', accessor: 'id' },
        { header: 'Employee', accessor: 'employeeName' },
        { header: 'Department', accessor: 'department' },
        { header: 'Leave Type', accessor: 'type' },
        { header: 'Start Date', accessor: 'startDate' },
        { header: 'End Date', accessor: 'endDate' },
        { header: 'Days', accessor: 'days' },
        { header: 'Status', accessor: 'status' },
        { header: 'Reason', accessor: 'reason' }
      ],
      filterFn: (item) => {
        const matchesSearch =
          !searchTerm ||
          item.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.reason?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = deptFilter === 'all' || item.department === deptFilter;
        const matchesStatus =
          statusFilter === 'all' ||
          item.status?.toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesDept && matchesStatus;
      }
    },
    recruitment: {
      name: 'Recruitment & ATS Pipeline',
      description: 'Candidates in hiring stages, evaluated positions, and review status.',
      icon: Briefcase,
      badge: `${candidates.length} candidates`,
      data: candidates,
      columns: [
        { header: 'Candidate ID', accessor: 'id' },
        { header: 'Name', accessor: 'name' },
        { header: 'Position Applied', accessor: 'roleApplied' },
        { header: 'Department', accessor: 'department' },
        { header: 'Stage', accessor: 'stage' },
        { header: 'Experience', accessor: (r) => r.experience || '--' },
        { header: 'Applied Date', accessor: (r) => r.appliedDate || '--' }
      ],
      filterFn: (item) => {
        const matchesSearch =
          !searchTerm ||
          item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.roleApplied?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = deptFilter === 'all' || item.department === deptFilter;
        const matchesStatus =
          statusFilter === 'all' ||
          item.stage?.toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesDept && matchesStatus;
      }
    },
    attendance: {
      name: 'Workforce Attendance Log',
      description: 'Historical check-ins, check-outs, shift durations, and statuses.',
      icon: CalendarCheck,
      badge: `${attendance.length} sessions`,
      data: attendance,
      columns: [
        { header: 'Log ID', accessor: 'id' },
        { header: 'Employee', accessor: 'employeeName' },
        { header: 'Date', accessor: (r) => r.date || r.dateKey },
        { header: 'Check In', accessor: 'checkIn' },
        { header: 'Check Out', accessor: 'checkOut' },
        { header: 'Hours Worked', accessor: (r) => r.workingHours || '--' },
        { header: 'Status', accessor: 'status' }
      ],
      filterFn: (item) => {
        const matchesSearch =
          !searchTerm ||
          item.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.date?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
          statusFilter === 'all' ||
          item.status?.toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
      }
    },
    trainings: {
      name: 'Training & Skill Compliance',
      description: 'Available enterprise skill modules, department domains, and levels.',
      icon: GraduationCap,
      badge: `${trainings.length} programs`,
      data: trainings,
      columns: [
        { header: 'Course ID', accessor: 'id' },
        { header: 'Title', accessor: 'title' },
        { header: 'Department', accessor: 'department' },
        { header: 'Category', accessor: 'category' },
        { header: 'Level', accessor: 'level' },
        { header: 'Duration', accessor: 'duration' },
        { header: 'Status', accessor: (r) => r.status || 'Active' }
      ],
      filterFn: (item) => {
        const matchesSearch =
          !searchTerm ||
          item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.category?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = deptFilter === 'all' || item.department === deptFilter;
        return matchesSearch && matchesDept;
      }
    }
  };

  const currentConfig = reportConfigs[activeReportKey];

  // Filter the active report data
  const filteredData = useMemo(() => {
    if (!currentConfig || !Array.isArray(currentConfig.data)) return [];
    return currentConfig.data.filter(currentConfig.filterFn);
  }, [currentConfig]);

  // Export current filtered report
  const handleExportCurrent = () => {
    if (filteredData.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Data to Export',
        message: 'There are no records matching your current filter criteria.'
      });
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const filename = `DigiX_${currentConfig.name.replace(/[^a-zA-Z0-9]/g, '_')}_${todayStr}.csv`;
    const success = exportToCsv(filename, filteredData, currentConfig.columns);
    if (success) {
      addToast({
        type: 'success',
        title: 'Report Exported Successfully',
        message: `${filteredData.length} records saved to ${filename}`
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Workforce Intelligence & Reports</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time Supabase analytics, compliance records, and verified CSV exports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            loading={isRefreshing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            Refresh Data
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportCurrent}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV ({filteredData.length})
          </Button>
        </div>
      </div>

      {/* Live Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Workforce"
          value={employees.length}
          subtitle={`${employees.filter((e) => e.status === 'Active' || e.status === 'active').length} active records`}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Leave Requests"
          value={leaveRequests.length}
          subtitle={`${leaveRequests.filter((l) => l.status === 'Pending').length} pending action`}
          icon={CalendarOff}
          color="amber"
        />
        <StatCard
          title="Recruitment Pipeline"
          value={candidates.length}
          subtitle={`${candidates.filter((c) => c.stage !== 'Hired').length} in active review`}
          icon={Briefcase}
          color="emerald"
        />
        <StatCard
          title="Training Modules"
          value={trainings.length}
          subtitle="Curated internal courses"
          icon={GraduationCap}
          color="purple"
        />
      </div>

      {/* Report Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {Object.entries(reportConfigs).map(([key, config]) => {
          const Icon = config.icon;
          const isActive = activeReportKey === key;
          return (
            <button
              key={key}
              onClick={() => {
                setActiveReportKey(key);
                setSearchTerm('');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-digix-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{config.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {config.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Report Table & Filter Bar */}
      <Card
        title={currentConfig.name}
        subtitle={currentConfig.description}
        action={
          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-900">{filteredData.length}</span> of {currentConfig.data.length} records
          </div>
        }
      >
        {/* Filter Toolbar */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search in this report..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-digix-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {activeReportKey !== 'attendance' && availableDepts.length > 0 && (
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-digix-500"
              >
                <option value="all">All Departments</option>
                {availableDepts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}

            {activeReportKey === 'workforce' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-digix-500"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="On Leave">On Leave</option>
              </select>
            )}

            {activeReportKey === 'leaves' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-digix-500"
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            )}

            {activeReportKey === 'recruitment' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-digix-500"
              >
                <option value="all">All Stages</option>
                <option value="Screening">Screening</option>
                <option value="Interview">Interview</option>
                <option value="Offer Sent">Offer Sent</option>
                <option value="Hired">Hired</option>
                <option value="Rejected">Rejected</option>
              </select>
            )}

            {(searchTerm || deptFilter !== 'all' || statusFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setDeptFilter('all');
                  setStatusFilter('all');
                }}
                className="text-xs text-slate-500"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>

        {/* Data Table */}
        {filteredData.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-xl">
            <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No records found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              No matching live rows in Supabase for the current filter criteria. Try clearing search filters or refreshing.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/80">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                  {currentConfig.columns.map((c, i) => (
                    <th key={i} className="px-3.5 py-3 whitespace-nowrap">
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredData.slice(0, 50).map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/70 transition-colors">
                    {currentConfig.columns.map((c, cIdx) => {
                      const val = typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor];
                      return (
                        <td key={cIdx} className="px-3.5 py-2.5 text-slate-700 whitespace-nowrap">
                          {c.header === 'Status' || c.header === 'Stage' ? (
                            <Badge
                              variant={
                                val === 'Active' || val === 'Approved' || val === 'Hired' || val === 'PRESENT'
                                  ? 'success'
                                  : val === 'Pending' || val === 'Screening' || val === 'Interview'
                                  ? 'warning'
                                  : val === 'Rejected'
                                  ? 'danger'
                                  : 'neutral'
                              }
                              size="sm"
                            >
                              {val || '--'}
                            </Badge>
                          ) : (
                            val || '--'
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredData.length > 50 && (
          <div className="mt-3 text-center text-xs text-slate-400">
            Showing first 50 rows in preview. Click "Export CSV" above to download the complete {filteredData.length} records dataset.
          </div>
        )}
      </Card>
    </div>
  );
};
