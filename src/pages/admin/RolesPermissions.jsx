import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { SearchInput } from '../../components/common/SearchInput';
import {
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Save,
  RotateCw,
  UserCheck,
  User,
  Users,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

const ROLE_OPTIONS = [
  {
    id: 'employee',
    label: 'Employee',
    badgeVariant: 'primary',
    badgeLabel: 'Employee',
    description: 'Standard portal privileges: attendance, tasks, projects, documents, and training modules.',
    icon: User
  },
  {
    id: 'hr_manager',
    label: 'HR Manager',
    badgeVariant: 'purple',
    badgeLabel: 'HR Manager',
    description: 'People Operations: employee records, leave approvals, recruitment pipeline, and policy documents.',
    icon: UserCheck
  },
  {
    id: 'admin',
    label: 'System Admin',
    badgeVariant: 'warning',
    badgeLabel: 'Admin',
    description: 'Full system administrator privileges: user governance, security logs, RBAC matrix, and system settings.',
    icon: ShieldCheck
  }
];

export const RolesPermissions = () => {
  const { user: currentAuthUser, refreshProfile } = useAuth();
  const {
    employees,
    fetchEmployees,
    rolePermissions,
    toggleRolePermission,
    saveRolePermissions,
    fetchSystemSettings,
    isLoadingSystemSettings,
    addAuditLog
  } = usePortalData();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab: 'roles' (Role Management) | 'matrix' (Permission Matrix)
  const activeTab = searchParams.get('tab') === 'matrix' ? 'matrix' : 'roles';
  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  // ---------------------------------------------------------------------------
  // Role Management State
  // ---------------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [profileRolesMap, setProfileRolesMap] = useState({});
  const [totalDbAdmins, setTotalDbAdmins] = useState(1);

  // Modal State
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNewRole, setSelectedNewRole] = useState('employee');
  const [isAdminTransfer, setIsAdminTransfer] = useState(false);
  const [replacementRole, setReplacementRole] = useState('employee');
  const [confirmationStep, setConfirmationStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Permission Matrix Saving State
  const [isSavingMatrix, setIsSavingMatrix] = useState(false);

  // ---------------------------------------------------------------------------
  // Load Live Profile Roles from Supabase
  // ---------------------------------------------------------------------------
  const fetchLiveRoles = useCallback(async () => {
    setIsRefreshing(true);
    const map = {};
    let adminCount = 0;
    try {
      if (isSupabaseConfigured) {
        // Refresh employees list from database
        try {
          await fetchEmployees?.();
        } catch (_) {}
        // 1. Try invoking change-user-role Edge Function with list action
        try {
          const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke('change-user-role', {
            body: { action: 'list' }
          });

          if (!edgeErr && edgeRes?.data && Array.isArray(edgeRes.data)) {
            edgeRes.data.forEach((p) => {
              if (p.id) map[p.id] = p.role;
              if (p.employee_id) map[p.employee_id] = p.role;
              if (p.employee_code) map[p.employee_code] = p.role;
              if (p.role === 'admin') adminCount++;
            });
            setProfileRolesMap(map);
            setTotalDbAdmins(Math.max(adminCount, 1));
            return map;
          }
        } catch (_) {
          // Edge Function might not be deployed yet; fallback to RPC and direct queries
        }

        // 2. Try RPC get_users_with_roles
        try {
          const { data: rpcRows, error: rpcErr } = await supabase.rpc('get_users_with_roles');
          if (!rpcErr && rpcRows && Array.isArray(rpcRows)) {
            rpcRows.forEach((r) => {
              if (r.user_id) map[r.user_id] = r.role;
              if (r.employee_id) map[r.employee_id] = r.role;
              if (r.role === 'admin') adminCount++;
            });
            setProfileRolesMap(map);
            setTotalDbAdmins(Math.max(adminCount, 1));
            return map;
          }
        } catch (_) {}

        // 3. Direct lookup: Query profiles (for current authenticated user)
        const { data: profs, error: profErr } = await supabase
          .from('profiles')
          .select('id, employee_id, role');

        if (!profErr && profs) {
          profs.forEach((p) => {
            if (p.id) map[p.id] = p.role;
            if (p.employee_id) map[p.employee_id] = p.role;
            if (p.role === 'admin') adminCount++;
          });
        }

        // 4. Query employees table (Admins have full SELECT access to employees)
        const { data: empRows, error: empErr } = await supabase
          .from('employees')
          .select('id, employee_id, user_id, name, department, designation');

        if (!empErr && empRows) {
          empRows.forEach((e) => {
            const hasExisting =
              (e.user_id && map[e.user_id]) ||
              (e.id && map[e.id]) ||
              (e.employee_id && map[e.employee_id]);
            if (!hasExisting) {
              const inferred =
                e.designation?.toLowerCase().includes('admin') || e.employee_id?.startsWith('ADM')
                  ? 'admin'
                  : e.department === 'Human Resources' ||
                    e.employee_id?.startsWith('HR') ||
                    e.designation?.toLowerCase().includes('hr')
                  ? 'hr_manager'
                  : 'employee';
              if (e.user_id) map[e.user_id] = inferred;
              if (e.id) map[e.id] = inferred;
              if (e.employee_id) map[e.employee_id] = inferred;
              if (inferred === 'admin') adminCount++;
            }
          });
        }

        setProfileRolesMap(map);
        setTotalDbAdmins(Math.max(adminCount, 1));
      }
    } catch (err) {
      console.warn('[RolesPermissions] Error refreshing profile roles:', err);
    } finally {
      setIsRefreshing(false);
    }
    return map;
  }, []);

  useEffect(() => {
    fetchLiveRoles();
  }, [fetchLiveRoles]);

  // Resolve effective role for an employee record
  const getEmployeeEffectiveRole = useCallback(
    (emp) => {
      // 1. Check profileRolesMap by user_id
      if (emp.userId && profileRolesMap[emp.userId]) {
        return profileRolesMap[emp.userId];
      }
      // 2. Check profileRolesMap by employee dbId or code
      if (emp.dbId && profileRolesMap[emp.dbId]) {
        return profileRolesMap[emp.dbId];
      }
      if (emp.id && profileRolesMap[emp.id]) {
        return profileRolesMap[emp.id];
      }
      // 3. Fallback to mapped employee role
      if (emp.role === 'hr' || emp.role === 'hr_manager') return 'hr_manager';
      if (emp.role === 'admin') return 'admin';
      return 'employee';
    },
    [profileRolesMap]
  );

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const empRole = getEmployeeEffectiveRole(emp);
      const matchesSearch =
        (emp.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.department || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (roleFilter === 'All') return true;
      if (roleFilter === 'Admin') return empRole === 'admin';
      if (roleFilter === 'HR') return empRole === 'hr_manager';
      if (roleFilter === 'Employee') return empRole === 'employee';
      return true;
    });
  }, [employees, searchQuery, roleFilter, getEmployeeEffectiveRole]);

  // Statistics
  const stats = useMemo(() => {
    let adminCount = 0;
    let hrCount = 0;
    let empCount = 0;

    employees.forEach((e) => {
      const r = getEmployeeEffectiveRole(e);
      if (r === 'admin') adminCount++;
      else if (r === 'hr_manager') hrCount++;
      else empCount++;
    });

    return {
      total: employees.length,
      admins: Math.max(adminCount, totalDbAdmins),
      hrManagers: hrCount,
      employees: empCount
    };
  }, [employees, getEmployeeEffectiveRole, totalDbAdmins]);

  // Open Change Role Modal
  const handleOpenChangeRole = (emp) => {
    const currentRole = getEmployeeEffectiveRole(emp);
    setSelectedEmployee(emp);
    setSelectedNewRole(currentRole);
    setIsAdminTransfer(false);
    setReplacementRole('employee');
    setConfirmationStep(false);
    setActionError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setSelectedEmployee(null);
    setConfirmationStep(false);
    setActionError(null);
  };

  // Helper check: Is the target currently the only admin?
  const isTargetOnlyAdmin = useMemo(() => {
    if (!selectedEmployee) return false;
    const currentRole = getEmployeeEffectiveRole(selectedEmployee);
    return currentRole === 'admin' && stats.admins <= 1;
  }, [selectedEmployee, getEmployeeEffectiveRole, stats.admins]);

  // Handle Role Change Submission
  const handleConfirmRoleChange = async () => {
    if (!selectedEmployee) return;
    setActionError(null);

    const targetEmp = selectedEmployee;
    const currentRole = getEmployeeEffectiveRole(targetEmp);

    // Accidental Last Admin Removal Validation
    if (currentRole === 'admin' && selectedNewRole !== 'admin' && stats.admins <= 1 && !isAdminTransfer) {
      setActionError('At least one system administrator must remain active. You cannot remove the last administrator without first appointing another active administrator.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        target_user_id: targetEmp.userId || targetEmp.dbId,
        target_employee_id: targetEmp.id,
        new_role: selectedNewRole,
        is_admin_transfer: isAdminTransfer,
        replacement_role: replacementRole
      };

      let mutationConfirmed = false;
      let responseMessage = '';
      let mutationError = null;

      // 1. Invoke change-user-role Edge Function
      try {
        const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('change-user-role', {
          body: payload
        });

        if (edgeErr) {
          throw new Error(edgeErr.message || 'Edge Function execution failed.');
        }

        if (edgeData && edgeData.success === false) {
          throw new Error(edgeData.error || 'Server rejected role modification request.');
        }

        if (edgeData && edgeData.success) {
          mutationConfirmed = true;
          responseMessage = edgeData.message || `Role for ${targetEmp.name} updated to ${selectedNewRole}.`;
        }
      } catch (edgeInvocationErr) {
        mutationError = edgeInvocationErr;
      }

      // 2. If Edge Function was not available, try secure RPC execution
      if (!mutationConfirmed && isSupabaseConfigured) {
        try {
          if (isAdminTransfer) {
            const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_transfer_system_role', {
              target_user_id: targetEmp.userId,
              replacement_role: replacementRole
            });
            if (rpcErr) throw rpcErr;
            if (rpcRes && rpcRes.success) {
              mutationConfirmed = true;
              responseMessage = `Admin privileges successfully transferred to ${targetEmp.name}. Old administrator updated to ${replacementRole}.`;
            }
          } else {
            const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_change_user_role', {
              target_user_id: targetEmp.userId,
              new_role: selectedNewRole
            });
            if (rpcErr) throw rpcErr;
            if (rpcRes && rpcRes.success) {
              mutationConfirmed = true;
              responseMessage = `Role for ${targetEmp.name} changed from ${currentRole} to ${selectedNewRole}.`;
            }
          }
        } catch (rpcCallErr) {
          console.warn('[RolesPermissions] RPC fallback call failed:', rpcCallErr);
          if (!mutationError) mutationError = rpcCallErr;
        }
      }

      // 3. Strict failure check: Do NOT show false success if backend did not confirm
      if (!mutationConfirmed) {
        const failureReason = mutationError?.message?.includes('ROLE_UPDATE_NOT_PERSISTED')
          ? 'Role Update Failed — The database did not confirm the requested role change.'
          : mutationError?.message || 'Role Update Failed — The database did not confirm the requested role change.';
        throw new Error(failureReason);
      }

      // 4. Re-fetch the complete live role directory from the database
      const freshRoles = await fetchLiveRoles();

      // 5. Verification: Read target role back from refreshed database data
      const targetKeys = [targetEmp.userId, targetEmp.dbId, targetEmp.id].filter(Boolean);
      const verifiedRole = targetKeys.map((k) => freshRoles[k]).find(Boolean);

      if (verifiedRole !== selectedNewRole) {
        throw new Error('Role Update Failed — The database did not confirm the requested role change.');
      }

      // If admin transfer, verify previous administrator was also demoted
      if (isAdminTransfer && currentAuthUser?.authId) {
        const callerKeys = [currentAuthUser.authId, currentAuthUser.id].filter(Boolean);
        const verifiedCallerRole = callerKeys.map((k) => freshRoles[k]).find(Boolean);
        if (verifiedCallerRole && verifiedCallerRole !== replacementRole) {
          throw new Error('Role Update Failed — The database did not confirm the requested role change for previous administrator.');
        }
      }

      // 6. Success toast is displayed ONLY after Edge Function/RPC success + Database verification + Fresh directory fetch confirmation
      addToast({
        type: 'success',
        title: 'Role Successfully Updated',
        message: responseMessage || `Role for ${targetEmp.name} changed from ${currentRole} to ${selectedNewRole}.`
      });

      handleCloseModal();

      // If current admin transferred role, refresh current profile session
      if (isAdminTransfer || targetEmp.userId === currentAuthUser?.authId) {
        await refreshProfile?.();
      }
    } catch (err) {
      console.error('[RolesPermissions] Role change error:', err);
      const displayMsg = err.message?.includes('ROLE_UPDATE_NOT_PERSISTED')
        ? 'Role Update Failed — The database did not confirm the requested role change.'
        : err.message || 'Role Update Failed — The database did not confirm the requested role change.';
      setActionError(displayMsg);
      addToast({
        type: 'error',
        title: 'Role Update Failed',
        message: displayMsg
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Permission Matrix Save Handler
  // ---------------------------------------------------------------------------
  const handleSaveMatrix = async () => {
    setIsSavingMatrix(true);
    try {
      await saveRolePermissions();
      addToast({
        type: 'success',
        title: 'Permissions Synchronized',
        message: 'Role Access Control (RBAC) policies persisted in Supabase.'
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Failed to update role permissions in Supabase.'
      });
    } finally {
      setIsSavingMatrix(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-digix-500" />
            Roles & Permissions Governance
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage organizational user roles, transfer administrator authority, and configure module-level RBAC policies.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'roles'
                ? 'bg-white text-digix-700 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Role Management
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'matrix'
                ? 'bg-white text-digix-700 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Permission Matrix
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: ROLE MANAGEMENT
          ========================================================================= */}
      {activeTab === 'roles' && (
        <div className="space-y-5">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="p-4 border-slate-200/80 shadow-subtle">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Personnel</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-amber-200/60 bg-gradient-to-br from-amber-50/40 to-white shadow-subtle">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">System Admins</p>
                  <p className="text-2xl font-bold text-amber-900 mt-1">{stats.admins}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-purple-200/60 bg-gradient-to-br from-purple-50/40 to-white shadow-subtle">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">HR Managers</p>
                  <p className="text-2xl font-bold text-purple-900 mt-1">{stats.hrManagers}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-blue-200/60 bg-gradient-to-br from-blue-50/40 to-white shadow-subtle">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-digix-700 uppercase tracking-wider">Standard Employees</p>
                  <p className="text-2xl font-bold text-digix-900 mt-1">{stats.employees}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-digix-100 flex items-center justify-center text-digix-600">
                  <User className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="flex-1 max-w-md">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
                placeholder="Search by name, employee ID, email, department..."
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
                {['All', 'Admin', 'HR', 'Employee'].map((filt) => (
                  <button
                    key={filt}
                    type="button"
                    onClick={() => setRoleFilter(filt)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      roleFilter === filt
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {filt}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={fetchLiveRoles}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50"
                title="Refresh roles from database"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-digix-500' : ''}`} />
                Refresh Roles
              </button>
            </div>
          </div>

          {/* Role Governance Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Personnel Role Directory
                </h3>
                <p className="text-[11px] text-slate-500">
                  Showing {filteredEmployees.length} of {employees.length} enterprise users
                </p>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>Protected by Edge Function & Role Escalation Triggers</span>
              </div>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Employee ID</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Current Role</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        No employees found matching your search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const effectiveRole = getEmployeeEffectiveRole(emp);
                      const isCurrentCaller = emp.userId === currentAuthUser?.authId || emp.email === currentAuthUser?.email;

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Employee */}
                          <td className="py-3.5 px-4 font-medium text-slate-900">
                            <div className="flex items-center gap-3">
                              <img
                                src={emp.avatar}
                                alt={emp.name}
                                className="w-9 h-9 rounded-full object-cover border border-slate-200 flex-shrink-0"
                              />
                              <div>
                                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                  <span>{emp.name}</span>
                                  {isCurrentCaller && (
                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-normal border border-slate-200">
                                      You
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-500 font-normal">
                                  {emp.roleTitle || 'Personnel'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Employee ID */}
                          <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200/60">
                              {emp.id}
                            </span>
                          </td>

                          {/* Email */}
                          <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                            {emp.email}
                          </td>

                          {/* Department */}
                          <td className="py-3.5 px-4 text-slate-700">
                            {emp.department || 'Technology'}
                          </td>

                          {/* Current Role */}
                          <td className="py-3.5 px-4">
                            {effectiveRole === 'admin' ? (
                              <Badge variant="warning" size="sm" dot>
                                Admin
                              </Badge>
                            ) : effectiveRole === 'hr_manager' ? (
                              <Badge variant="purple" size="sm" dot>
                                HR Manager
                              </Badge>
                            ) : (
                              <Badge variant="primary" size="sm" dot>
                                Employee
                              </Badge>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={<KeyRound className="w-3.5 h-3.5 text-digix-600" />}
                              onClick={() => handleOpenChangeRole(emp)}
                            >
                              Change Role
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: PERMISSION MATRIX
          ========================================================================= */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-subtle">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-digix-500" />
                Module Access Control Policies
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Toggle granular view, edit, and deletion privileges for each system module by role.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchSystemSettings?.()}
                disabled={isLoadingSystemSettings}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50"
                title="Refresh permissions from Supabase"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLoadingSystemSettings ? 'animate-spin text-digix-500' : ''}`} />
                Refresh
              </button>
              <Button
                size="sm"
                leftIcon={<Save className="w-4 h-4" />}
                onClick={handleSaveMatrix}
                isLoading={isSavingMatrix}
              >
                Save Policy Changes
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-x-auto w-full">
            <table className="w-full min-w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">System Module</th>
                  <th className="py-3 px-4 text-center">Employee (View / Edit)</th>
                  <th className="py-3 px-4 text-center">HR Manager (View / Edit / Del)</th>
                  <th className="py-3 px-4 text-center">System Admin (Full Access)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {rolePermissions.map((item, modIdx) => (
                  <tr key={modIdx} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {item.module}
                    </td>

                    {/* Employee Permissions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-3">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.employee.view}
                            onChange={() => toggleRolePermission(modIdx, 'employee', 'view')}
                            className="rounded text-digix-600 focus:ring-digix-500"
                          />
                          <span className="text-slate-600">View</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.employee.edit}
                            onChange={() => toggleRolePermission(modIdx, 'employee', 'edit')}
                            className="rounded text-digix-600 focus:ring-digix-500"
                          />
                          <span className="text-slate-600">Edit</span>
                        </label>
                      </div>
                    </td>

                    {/* HR Permissions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-3">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.hr.view}
                            onChange={() => toggleRolePermission(modIdx, 'hr', 'view')}
                            className="rounded text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-slate-600">View</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.hr.edit}
                            onChange={() => toggleRolePermission(modIdx, 'hr', 'edit')}
                            className="rounded text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-slate-600">Edit</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.hr.delete}
                            onChange={() => toggleRolePermission(modIdx, 'hr', 'delete')}
                            className="rounded text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-slate-600">Del</span>
                        </label>
                      </div>
                    </td>

                    {/* Admin Permissions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-3">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.admin.view}
                            onChange={() => toggleRolePermission(modIdx, 'admin', 'view')}
                            className="rounded text-amber-600 focus:ring-amber-500"
                          />
                          <span className="text-slate-600">View</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.admin.edit}
                            onChange={() => toggleRolePermission(modIdx, 'admin', 'edit')}
                            className="rounded text-amber-600 focus:ring-amber-500"
                          />
                          <span className="text-slate-600">Edit</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.admin.delete}
                            onChange={() => toggleRolePermission(modIdx, 'admin', 'delete')}
                            className="rounded text-amber-600 focus:ring-amber-500"
                          />
                          <span className="text-slate-600">Del</span>
                        </label>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          CHANGE USER ROLE MODAL & CONFIRMATION
          ========================================================================= */}
      {selectedEmployee && (
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={confirmationStep ? 'Confirm Role Modification' : 'Change User Role'}
          subtitle={
            confirmationStep
              ? 'Please verify and confirm the role assignment.'
              : `Modify portal and administrative privileges for ${selectedEmployee.name}.`
          }
          maxWidth="max-w-lg"
          footer={
            confirmationStep ? (
              <div className="flex items-center justify-end gap-2 w-full">
                <Button
                  variant="outline"
                  onClick={() => setConfirmationStep(false)}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button
                  variant={selectedNewRole === 'admin' ? 'warning' : 'primary'}
                  onClick={handleConfirmRoleChange}
                  isLoading={isSubmitting}
                  leftIcon={
                    selectedNewRole === 'admin' ? (
                      <ShieldCheck className="w-4 h-4" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )
                  }
                >
                  Confirm Change
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2 w-full">
                <Button variant="outline" onClick={handleCloseModal} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setActionError(null);
                    // Accidental last admin removal validation
                    const currentRole = getEmployeeEffectiveRole(selectedEmployee);
                    if (currentRole === 'admin' && selectedNewRole !== 'admin' && stats.admins <= 1 && !isAdminTransfer) {
                      setActionError('At least one system administrator must remain active. You cannot remove your administrator privileges without transferring the Admin role to another employee first.');
                      return;
                    }
                    setConfirmationStep(true);
                  }}
                  disabled={
                    selectedNewRole === getEmployeeEffectiveRole(selectedEmployee) && !isAdminTransfer
                  }
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Review & Confirm
                </Button>
              </div>
            )
          }
        >
          {/* STEP 1: ROLE SELECTION */}
          {!confirmationStep && (
            <div className="space-y-4">
              {/* Target Employee Identity Card */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedEmployee.avatar}
                    alt={selectedEmployee.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      {selectedEmployee.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {selectedEmployee.id} • {selectedEmployee.email}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Current Role</span>
                  {getEmployeeEffectiveRole(selectedEmployee) === 'admin' ? (
                    <Badge variant="warning" size="sm">Admin</Badge>
                  ) : getEmployeeEffectiveRole(selectedEmployee) === 'hr_manager' ? (
                    <Badge variant="purple" size="sm">HR Manager</Badge>
                  ) : (
                    <Badge variant="primary" size="sm">Employee</Badge>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Role Selection Options */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 block">
                  Select New Role:
                </label>
                <div className="space-y-2">
                  {ROLE_OPTIONS.map((opt) => {
                    const isSelected = selectedNewRole === opt.id;
                    const IconComp = opt.icon;

                    return (
                      <div
                        key={opt.id}
                        onClick={() => {
                          setSelectedNewRole(opt.id);
                          setActionError(null);
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                          isSelected
                            ? 'border-digix-500 bg-digix-50/40 ring-1 ring-digix-500 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50/80 hover:border-slate-300'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isSelected
                              ? 'bg-digix-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">{opt.label}</span>
                            <Badge variant={opt.badgeVariant} size="sm">
                              {opt.badgeLabel}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            {opt.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Transfer Administrator Access Option (If Target selected as Admin and caller is Admin) */}
              {selectedNewRole === 'admin' &&
                getEmployeeEffectiveRole(selectedEmployee) !== 'admin' &&
                currentAuthUser?.role === 'admin' && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAdminTransfer}
                        onChange={(e) => setIsAdminTransfer(e.target.checked)}
                        className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-amber-900 block">
                          Transfer System Administrator Role
                        </span>
                        <span className="text-[11px] text-amber-700 block leading-tight mt-0.5">
                          Appoint {selectedEmployee.name} as primary Administrator and transition your account to a replacement role.
                        </span>
                      </div>
                    </label>

                    {isAdminTransfer && (
                      <div className="pt-2 border-t border-amber-200/80 flex items-center gap-2">
                        <span className="text-[11px] font-medium text-amber-900">Your New Role:</span>
                        <select
                          value={replacementRole}
                          onChange={(e) => setReplacementRole(e.target.value)}
                          className="text-xs bg-white border border-amber-300 rounded px-2 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="employee">Employee</option>
                          <option value="hr_manager">HR Manager</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

              {/* Warning for Demoting Last Admin */}
              {isTargetOnlyAdmin && selectedNewRole !== 'admin' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
                  <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Accidental Demotion Prevented</span>
                    <span className="text-[11px] mt-0.5 block leading-relaxed">
                      At least one system administrator must remain active. You cannot remove your administrator privileges without transferring the Admin role to another employee first.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: EXPLICIT CONFIRMATION */}
          {confirmationStep && (
            <div className="space-y-4">
              {/* Prominent Question */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Confirmation Required
                </p>
                <h4 className="text-sm sm:text-base font-bold text-slate-900">
                  Are you sure you want to change {selectedEmployee.name}'s role from{' '}
                  <span className="capitalize font-mono text-digix-600">
                    {getEmployeeEffectiveRole(selectedEmployee) === 'hr_manager'
                      ? 'HR Manager'
                      : getEmployeeEffectiveRole(selectedEmployee)}
                  </span>{' '}
                  to{' '}
                  <span className="capitalize font-mono text-amber-600">
                    {selectedNewRole === 'hr_manager' ? 'HR Manager' : selectedNewRole}
                  </span>
                  ?
                </h4>
              </div>

              {/* Specific Warnings */}
              {selectedNewRole === 'admin' && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-900">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-amber-900">
                      Privilege Elevation Warning
                    </span>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      This will give this user full system administrator access. They will receive unrestricted governance privileges including user accounts, security logs, and role modifications.
                    </p>
                  </div>
                </div>
              )}

              {isAdminTransfer && (
                <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl flex items-start gap-3 text-xs text-purple-900">
                  <RotateCw className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-purple-900">
                      Administrator Transfer Sequence
                    </span>
                    <p className="text-[11px] text-purple-800 mt-0.5 leading-relaxed">
                      1. {selectedEmployee.name} will be promoted to System Admin.
                      <br />
                      2. Upon promotion confirmation, your administrator access will transition to {replacementRole === 'hr_manager' ? 'HR Manager' : 'Employee'}.
                    </p>
                  </div>
                </div>
              )}

              {/* Verification Checklist */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 text-xs space-y-1.5 text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Target: {selectedEmployee.name} ({selectedEmployee.id})</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Auth User ID: {selectedEmployee.userId || selectedEmployee.dbId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Audit Event: <code className="text-[10px] bg-slate-200 px-1 py-0.5 rounded">ROLE_CHANGED</code> logged to tamper-evident audit logs</span>
                </div>
              </div>

              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{actionError}</span>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
