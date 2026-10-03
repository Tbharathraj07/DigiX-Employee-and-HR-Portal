import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePortalData } from '../../context/DataContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  Mail,
  MapPin,
  Users,
  Search,
  Building,
  RotateCw,
  AlertCircle,
  Briefcase,
  UserCheck,
  ShieldCheck
} from 'lucide-react';

export const MyTeam = () => {
  const { user, isSupabaseAuth } = useAuth();
  const {
    employeeDirectory,
    employees,
    isLoadingDirectory,
    isLoadingEmployees,
    directoryError,
    fetchEmployeeDirectory
  } = usePortalData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('my_dept');

  // Trigger directory fetch on mount
  useEffect(() => {
    if (isSupabaseAuth && fetchEmployeeDirectory) {
      fetchEmployeeDirectory();
    }
  }, [isSupabaseAuth, fetchEmployeeDirectory]);

  // Consolidate directory entries strictly from secure Supabase source
  const directory = useMemo(() => {
    if (isSupabaseAuth) {
      // Prioritize the dedicated secure employeeDirectory
      if (employeeDirectory && employeeDirectory.length > 0) {
        return employeeDirectory;
      }
      // If employees array is populated, strictly filter for real Supabase records
      if (employees && employees.length > 0) {
        const supabaseRecords = employees.filter((m) => m.isDirectoryUser || m.isSupabaseEmp);
        if (supabaseRecords.length > 0) return supabaseRecords;
      }
      return [];
    }
    // Offline demo mode only when not connected to Supabase
    return employees || [];
  }, [employeeDirectory, employees, isSupabaseAuth]);

  const userDept = user?.department || 'Technology';

  // Extract distinct departments from live directory
  const distinctDepartments = useMemo(() => {
    const set = new Set(directory.map((m) => m.department).filter(Boolean));
    return Array.from(set).sort();
  }, [directory]);

  // Identify direct reporting manager or departmental leader dynamically
  const reportingManager = useMemo(() => {
    if (!directory.length) return null;

    // 1. Direct match on user.manager or user.managerId
    if (user?.managerId || user?.manager) {
      const match = directory.find(
        (m) =>
          (m.dbId && m.dbId === user.managerId) ||
          (m.id && m.id === user.manager) ||
          (m.name && m.name === user.manager)
      );
      if (match) return match;
    }

    // 2. Department manager or lead
    const deptLead = directory.find(
      (m) =>
        m.department === userDept &&
        (m.roleTitle?.toLowerCase().includes('manager') ||
          m.roleTitle?.toLowerCase().includes('lead') ||
          m.roleTitle?.toLowerCase().includes('director'))
    );
    if (deptLead) return deptLead;

    // 3. Fallback to HR Manager in directory
    const hrLead = directory.find(
      (m) =>
        m.department === 'Human Resources' &&
        m.roleTitle?.toLowerCase().includes('manager')
    );
    if (hrLead) return hrLead;

    return null;
  }, [directory, user?.managerId, user?.manager, userDept]);

  // Filter department colleagues based on active filter and search query
  const filteredMembers = useMemo(() => {
    return directory.filter((member) => {
      // Department filter
      if (selectedDeptFilter === 'my_dept') {
        if (member.department !== userDept) return false;
      } else if (selectedDeptFilter !== 'all') {
        if (member.department !== selectedDeptFilter) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = member.name?.toLowerCase().includes(q);
        const roleMatch = member.roleTitle?.toLowerCase().includes(q);
        const deptMatch = member.department?.toLowerCase().includes(q);
        const idMatch = member.id?.toLowerCase().includes(q);
        return nameMatch || roleMatch || deptMatch || idMatch;
      }

      return true;
    });
  }, [directory, selectedDeptFilter, userDept, searchQuery]);

  const isLoading = isLoadingDirectory || isLoadingEmployees;
  const myDeptCount = directory.filter((m) => m.department === userDept).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">My Team & Department</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Discover departmental colleagues, team structure, and corporate directory.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchEmployeeDirectory && fetchEmployeeDirectory()}
          disabled={isLoading}
          leftIcon={<RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
        >
          {isLoading ? 'Syncing...' : 'Refresh Directory'}
        </Button>
      </div>

      {/* Error Alert */}
      {directoryError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Could not load live directory: {directoryError}</span>
          </div>
          <button
            onClick={() => fetchEmployeeDirectory && fetchEmployeeDirectory()}
            className="text-amber-900 font-bold hover:underline ml-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* Reporting Manager Hero Card */}
      {reportingManager && (
        <Card title="Direct Reporting Manager">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2">
            <div className="flex items-center gap-4">
              <img
                src={
                  reportingManager.avatar ||
                  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
                }
                alt={reportingManager.name}
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-200 flex-shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 truncate">
                    {reportingManager.name}
                  </h3>
                  <Badge variant="purple" size="sm">
                    Manager
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  {reportingManager.roleTitle} • {reportingManager.department}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-2">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> {reportingManager.email}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {reportingManager.location}
                  </span>
                </div>
              </div>
            </div>

            <a
              href={`mailto:${reportingManager.email}`}
              className="inline-flex items-center justify-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap self-start sm:self-center"
            >
              Contact Manager
            </a>
          </div>
        </Card>
      )}

      {/* Search & Department Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-subtle space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, role, or employee ID..."
              className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-digix-500 focus:ring-1 focus:ring-digix-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Stats Pill */}
          <div className="text-xs text-slate-500 flex items-center gap-1.5 self-end sm:self-center">
            <Users className="w-4 h-4 text-digix-500" />
            <span>
              Showing <strong>{filteredMembers.length}</strong> of {directory.length} employees
            </span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-0.5">
          <button
            onClick={() => setSelectedDeptFilter('my_dept')}
            className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap ${
              selectedDeptFilter === 'my_dept'
                ? 'bg-digix-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            My Department: {userDept} ({myDeptCount})
          </button>

          <button
            onClick={() => setSelectedDeptFilter('all')}
            className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap ${
              selectedDeptFilter === 'all'
                ? 'bg-digix-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Departments ({directory.length})
          </button>

          {distinctDepartments
            .filter((dept) => dept !== userDept)
            .map((dept) => {
              const count = directory.filter((m) => m.department === dept).length;
              return (
                <button
                  key={dept}
                  onClick={() => setSelectedDeptFilter(dept)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap ${
                    selectedDeptFilter === dept
                      ? 'bg-digix-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {dept} ({count})
                </button>
              );
            })}
        </div>
      </div>

      {/* Team Members Grid */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4 text-digix-500" />
            <span>
              {selectedDeptFilter === 'my_dept'
                ? `${userDept} Colleagues`
                : selectedDeptFilter === 'all'
                ? 'All Team Members'
                : `${selectedDeptFilter} Team`}
            </span>
          </span>
          <span className="text-xs font-normal text-slate-400">
            {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'}
          </span>
        </h3>

        {/* Loading State */}
        {isLoading && directory.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle animate-pulse space-y-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 bg-slate-200 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                    <div className="h-2.5 bg-slate-100 rounded w-1/4" />
                  </div>
                </div>
                <div className="h-8 bg-slate-100 rounded-lg mt-3" />
              </div>
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-subtle">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No team members found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No results matching "${searchQuery}". Try clearing your search.`
                : `No active employees found in the selected department.`}
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setSearchQuery('')}
              >
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          /* Members Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start gap-3.5">
                    <img
                      src={
                        member.avatar ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                      }
                      alt={member.name}
                      className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-200 flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {member.name}
                        </h4>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {member.roleTitle}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-digix-600 font-semibold bg-digix-50 px-1.5 py-0.5 rounded">
                          {member.id}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {member.department}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" /> Location
                      </span>
                      <span className="font-medium text-slate-700">{member.location}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-slate-400" /> Work Mode
                      </span>
                      <span className="font-medium text-slate-700">{member.workType}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <a
                    href={`mailto:${member.email}`}
                    className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg text-center transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> Email
                  </a>
                  <span className="text-[11px] px-2 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-medium">
                    {member.department === 'Technology' ? 'Engineering' : member.department}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
