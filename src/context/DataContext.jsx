import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mapDbDirectoryEntryToUi } from '../lib/directoryMapper';
import { useAuth } from './AuthContext';
import {
  INITIAL_EMPLOYEES,
  INITIAL_PROJECTS,
  INITIAL_TASKS,
  INITIAL_ATTENDANCE,
  INITIAL_LEAVE_BALANCES,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_CANDIDATES,
  INITIAL_ONBOARDING,
  INITIAL_TRAINING_COURSES,
  INITIAL_DOCUMENTS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SYSTEM_SETTINGS,
  INITIAL_ROLE_PERMISSIONS,
  INITIAL_PROFILE_REQUESTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_HELPDESK_TICKETS,
  INITIAL_HELPDESK_MESSAGES,
  INITIAL_HOLIDAYS,
  INITIAL_CALENDAR_EVENTS
} from '../mock/initialData';

export const PROFILE_FIELD_LABELS = {
  phone: 'Contact Phone Number',
  location: 'Work Location / Office',
  name: 'Full Legal Name (Requires Govt ID / Gazette)',
  emergencyName: 'Emergency Contact - Name',
  emergencyRelation: 'Emergency Contact - Relationship',
  emergencyPhone: 'Emergency Contact - Phone',
  skills: 'Skills & Certifications (Comma-separated)'
};

const ALLOWED_EMPLOYEE_FIELDS = {
  phone: 'phone',
  location: 'location',
  name: 'name'
};

const ALLOWED_EMERGENCY_CONTACT_FIELDS = {
  emergencyName: 'name',
  emergencyRelation: 'relationship',
  emergencyPhone: 'phone'
};

const mapDbRequestToUi = (dbReq, defaultEmployee = null) => {
  const rawStatus = dbReq.status ? dbReq.status.toLowerCase() : 'pending';
  const statusFormatted = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
  const employee = dbReq.employee || defaultEmployee || {};

  return {
    id: dbReq.id,
    employeeId: employee.employee_id || dbReq.employee_id,
    employeeUuid: dbReq.employee_id,
    employeeName: employee.name || 'Employee',
    department: employee.department || 'Technology',
    avatar: employee.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    field: dbReq.field_name,
    fieldLabel: PROFILE_FIELD_LABELS[dbReq.field_name] || dbReq.field_name,
    currentValue: dbReq.current_value || '(Not Specified)',
    requestedValue: dbReq.requested_value || '',
    reason: dbReq.reason || '',
    documentName: dbReq.supporting_document_url || null,
    documentSize: dbReq.supporting_document_url ? '320 KB' : null,
    status: statusFormatted,
    rawStatus,
    submittedDate: dbReq.created_at ? new Date(dbReq.created_at).toISOString().replace('T', ' ').substring(0, 16) : '',
    reviewedBy: dbReq.reviewer?.name || dbReq.reviewed_by || (rawStatus !== 'pending' ? 'People Operations' : null),
    reviewedAt: dbReq.reviewed_at ? new Date(dbReq.reviewed_at).toISOString().replace('T', ' ').substring(0, 16) : null,
    hrComment: dbReq.hr_comment || ''
  };
};

export const LEAVE_TYPE_UI_TO_DB = {
  'Casual Leave': 'casual',
  'Sick & Medical Leave': 'sick',
  'Earned Privilege Leave': 'annual',
  'Special / Parental Leave': 'other',
  'Unpaid Leave': 'unpaid'
};

export const LEAVE_TYPE_DB_TO_UI = {
  casual: 'Casual Leave',
  sick: 'Sick & Medical Leave',
  annual: 'Earned Privilege Leave',
  other: 'Special / Parental Leave',
  unpaid: 'Unpaid Leave'
};

export const normalizeDbLeaveType = (type) => {
  if (!type) return 'casual';
  if (LEAVE_TYPE_UI_TO_DB[type]) return LEAVE_TYPE_UI_TO_DB[type];
  const lower = String(type).toLowerCase().trim();
  if (['casual', 'sick', 'annual', 'other', 'unpaid'].includes(lower)) return lower;
  if (lower.includes('casual')) return 'casual';
  if (lower.includes('sick') || lower.includes('medical')) return 'sick';
  if (lower.includes('privilege') || lower.includes('earned') || lower.includes('annual')) return 'annual';
  if (lower.includes('parental') || lower.includes('special')) return 'other';
  return 'casual';
};

export const normalizeUiLeaveType = (type) => {
  if (!type) return 'Casual Leave';
  if (LEAVE_TYPE_DB_TO_UI[type]) return LEAVE_TYPE_DB_TO_UI[type];
  const dbKey = normalizeDbLeaveType(type);
  return LEAVE_TYPE_DB_TO_UI[dbKey] || type;
};

export const calculateLeaveDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 1;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start) || isNaN(end) || end < start) return 1;
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
};

export const mapDbLeaveRequestToUi = (dbReq, fallbackEmp = null) => {
  const rawStatus = dbReq.status ? dbReq.status.toLowerCase() : 'pending';
  const statusFormatted = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
  const emp = dbReq.employee || fallbackEmp || {};
  const days = calculateLeaveDays(dbReq.start_date, dbReq.end_date);

  return {
    id: dbReq.id,
    rawId: dbReq.id,
    displayId: dbReq.id?.length > 15 ? `LR-${dbReq.id.slice(0, 8).toUpperCase()}` : dbReq.id,
    employeeId: emp.employee_id || dbReq.employee_id || fallbackEmp?.id || 'DGX001',
    employeeUuid: dbReq.employee_id,
    employeeName: emp.name || fallbackEmp?.name || 'Employee',
    department: emp.department || fallbackEmp?.department || 'Technology',
    type: normalizeUiLeaveType(dbReq.leave_type),
    dbLeaveType: normalizeDbLeaveType(dbReq.leave_type),
    startDate: dbReq.start_date,
    endDate: dbReq.end_date,
    days,
    reason: dbReq.reason || '',
    status: statusFormatted,
    rawStatus,
    appliedDate: dbReq.created_at ? dbReq.created_at.split('T')[0] : '',
    managerNote: dbReq.hr_comment || '',
    approvedBy: dbReq.approved_by || null,
    approvedAt: dbReq.approved_at || null,
    createdAt: dbReq.created_at,
    updatedAt: dbReq.updated_at
  };
};

export const mapDbLeaveBalancesToUi = (rows = []) => {
  const standard = {
    casual: { available: 8, total: 12, used: 4, label: 'Casual Leave', color: 'blue' },
    sick: { available: 6, total: 10, used: 4, label: 'Sick & Medical Leave', color: 'rose' },
    privilege: { available: 13, total: 18, used: 5, label: 'Earned Privilege Leave', color: 'emerald' },
    parental: { available: 10, total: 10, used: 0, label: 'Special / Parental Leave', color: 'purple' }
  };

  if (!rows || rows.length === 0) return standard;

  const result = { ...standard };
  for (const row of rows) {
    const total = Number(row.total_days) || 0;
    const used = Number(row.used_days) || 0;
    const available = Number(row.remaining_days) ?? Math.max(0, total - used);

    if (row.leave_type === 'casual') {
      result.casual = { available, total, used, label: 'Casual Leave', color: 'blue' };
    } else if (row.leave_type === 'sick') {
      result.sick = { available, total, used, label: 'Sick & Medical Leave', color: 'rose' };
    } else if (row.leave_type === 'annual') {
      result.privilege = { available, total, used, label: 'Earned Privilege Leave', color: 'emerald' };
    } else if (row.leave_type === 'other') {
      result.parental = { available, total, used, label: 'Special / Parental Leave', color: 'purple' };
    }
  }

  return result;
};

export const mapDbTrainingForHr = (row) => {
  const assignments = row.assignments || [];
  const enrolledEmployees = assignments.map((a) => {
    const empDisplayId = a.employee?.employee_id || a.employee_id;
    const empName = a.employee?.name || 'Employee';
    const progress = a.completion_percent ?? 0;
    const enrolledDate = a.assigned_at ? a.assigned_at.split('T')[0] : '2026-09-01';
    const completedDate = a.completed_at ? a.completed_at.split('T')[0] : null;
    return {
      id: empDisplayId,
      dbId: a.employee_id,
      assignmentId: a.id,
      name: empName,
      department: a.employee?.department || 'Technology',
      enrolledDate,
      progress,
      completedDate,
      status: a.status
    };
  });

  const progressByEmployee = {};
  assignments.forEach((a) => {
    const empDisplayId = a.employee?.employee_id || a.employee_id;
    progressByEmployee[empDisplayId] = a.completion_percent ?? 0;
    if (a.employee_id) {
      progressByEmployee[a.employee_id] = a.completion_percent ?? 0;
    }
  });

  const totalProgress = assignments.reduce((acc, a) => acc + (a.completion_percent || 0), 0);
  const avgCompletion = assignments.length > 0 ? Math.round(totalProgress / assignments.length) : 0;

  const assignedEmployees = enrolledEmployees.map((e) => e.id);
  const assignedDepts = Array.from(new Set(enrolledEmployees.map((e) => e.department).filter(Boolean)));

  const isMandatory =
    row.category === 'Security & Compliance' ||
    (row.title && (row.title.toLowerCase().includes('compliance') || row.title.toLowerCase().includes('security')));

  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    category: row.category || 'Technical',
    instructor: row.instructor || 'HR Operations',
    duration: row.duration || '2.0 hours',
    startDate: row.start_date || new Date().toISOString().split('T')[0],
    endDate: row.end_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    status: row.status === 'upcoming' ? 'Upcoming' : row.status === 'completed' ? 'Completed' : 'Active',
    isMandatory,
    assignmentType: assignments.length >= 4 ? 'all' : (assignedDepts.length === 1 ? 'department' : 'specific'),
    assignedDepartments: assignedDepts.length > 0 ? assignedDepts : ['Technology'],
    assignedEmployees,
    enrolledEmployees,
    completionPercentage: avgCompletion,
    progressByEmployee,
    createdBy: 'Priyanka, HR Manager',
    createdAt: row.created_at,
    certificate: isMandatory ? `CERT-DX-${row.id.slice(0, 8).toUpperCase()}-COMP` : null
  };
};

export const mapDbAssignmentForEmployee = (a, currentUser = null) => {
  const t = a.training || {};
  const currentUserId = currentUser?.id || 'DGX003';
  const currentUserName = currentUser?.name || 'Tarumani Bharath Raj';
  const currentUserDept = currentUser?.department || 'Technology';
  const progress = a.completion_percent ?? 0;
  const isEnrolledStatus = a.status === 'in_progress' || a.status === 'completed' || progress > 0;
  const enrolledDate = a.assigned_at ? a.assigned_at.split('T')[0] : '2026-09-01';
  const completedDate = a.completed_at ? a.completed_at.split('T')[0] : null;

  const isMandatory =
    t.category === 'Security & Compliance' ||
    (t.title && (t.title.toLowerCase().includes('compliance') || t.title.toLowerCase().includes('security')));

  const enrolledEmployees = isEnrolledStatus
    ? [
        {
          id: currentUserId,
          dbId: a.employee_id,
          name: currentUserName,
          enrolledDate,
          progress,
          completedDate,
          status: a.status
        }
      ]
    : [];

  return {
    id: t.id || a.training_id,
    assignmentId: a.id,
    title: t.title || 'Training Curriculum',
    description: t.description || '',
    category: t.category || 'Technical',
    instructor: t.instructor || 'DigiX Academy',
    duration: t.duration || '2.0 hours',
    startDate: t.start_date || '2026-09-01',
    endDate: t.end_date || '2026-10-30',
    status: t.status === 'upcoming' ? 'Upcoming' : t.status === 'completed' ? 'Completed' : 'Active',
    isMandatory,
    assignmentType: 'specific',
    assignedDepartments: [currentUserDept],
    assignedEmployees: [currentUserId],
    enrolledEmployees,
    completionPercentage: progress,
    progressByEmployee: {
      [currentUserId]: progress
    },
    createdBy: 'Priyanka, HR Manager',
    createdAt: t.created_at,
    certificate: progress === 100 ? `CERT-DX-${(t.id || a.training_id).slice(0, 8).toUpperCase()}-${currentUserId}` : null
  };
};

export const mapDbProjectToUi = (row, taskList = [], currentUser = null) => {
  let code = 'PRJ';
  if (row.name) {
    const parts = row.name.replace(/[^a-zA-Z0-9 ]/g, '').split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      code = parts.map((p) => p[0]).join('').toUpperCase().slice(0, 4);
    } else if (parts.length === 1) {
      code = parts[0].slice(0, 3).toUpperCase();
    }
  }

  const statusMap = {
    planned: 'Planning',
    active: 'In Progress',
    on_hold: 'On Hold',
    completed: 'Completed',
    cancelled: 'Cancelled'
  };
  const uiStatus =
    statusMap[row.status] ||
    (row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : 'In Progress');

  const lead =
    row.manager?.name ||
    (currentUser && row.project_manager_id === currentUser.dbId ? currentUser.name : 'Marcus Vance');

  const memberNames = (row.members || [])
    .map((m) => m.employee?.name)
    .filter(Boolean);

  if (currentUser?.name && !memberNames.includes(currentUser.name)) {
    memberNames.unshift(currentUser.name);
  }
  if (!memberNames.includes(lead)) {
    memberNames.unshift(lead);
  }

  const projTasks = (taskList || []).filter(
    (t) => t.projectId === row.id || t.project_id === row.id || t.project === row.name
  );
  let progress = 50;
  if (projTasks.length > 0) {
    const completedCount = projTasks.filter((t) => t.status === 'completed').length;
    progress = Math.round((completedCount / projTasks.length) * 100);
  } else if (row.status === 'completed') {
    progress = 100;
  } else if (row.status === 'planned') {
    progress = 25;
  } else if (row.status === 'active') {
    progress = 75;
  }

  const deadline = row.end_date
    ? new Date(row.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Dec 31, 2026';

  return {
    id: row.id,
    code,
    name: row.name,
    description: row.description || '',
    category: row.client_name || 'Strategic Initiative',
    lead,
    projectManagerId: row.project_manager_id,
    status: uiStatus,
    rawStatus: row.status,
    health: progress >= 60 ? 'Good' : 'Attention',
    progress,
    budget: '$350,000',
    spent: `$${Math.round(350000 * (progress / 100)).toLocaleString()}`,
    startDate: row.start_date || '2026-03-01',
    deadline,
    teamMembers: Array.from(new Set(memberNames))
  };
};

export const mapDbTaskToUi = (row, currentUser = null) => {
  const assigneeName =
    row.assignee?.name ||
    (currentUser && row.assigned_to === currentUser.dbId ? currentUser.name : 'Tarumani Bharath Raj');
  const assigneeEmpId =
    row.assignee?.employee_id ||
    (currentUser && row.assigned_to === currentUser.dbId ? currentUser.id : 'DGX003');
  const projectName = row.project?.name || 'Client Enterprise Portal V3';

  return {
    id: row.id,
    displayId: `TSK-${row.id.slice(0, 6).toUpperCase()}`,
    title: row.title,
    project: projectName,
    projectId: row.project_id,
    assignedTo: assigneeName,
    assignedToId: assigneeEmpId,
    assignedToDbId: row.assigned_to,
    status: row.status || 'todo',
    priority: row.priority || 'medium',
    dueDate: row.due_date || new Date().toISOString().split('T')[0],
    description: row.description || '',
    completedAt: row.completed_at,
    createdBy: row.created_by
  };
};

export const mapDbCandidateToUi = (row) => {
  return {
    id: row.id,
    code: row.candidate_code || `REC-${row.id.slice(0, 6).toUpperCase()}`,
    candidateCode: row.candidate_code || `REC-${row.id.slice(0, 6).toUpperCase()}`,
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    roleApplied: row.role_applied,
    department: row.department,
    stage: row.stage || 'Applied',
    rating: row.rating !== null && row.rating !== undefined ? Number(row.rating) : 4.5,
    experience: row.experience || '3 years',
    currentCompany: row.current_company || 'Confidential',
    salaryExpectation: row.salary_expectation || '$150,000',
    interviewerId: row.interviewer_id,
    interviewer: row.interviewer?.name || (row.interviewer_id ? 'Assigned Lead' : 'HR Operations'),
    appliedDate: row.applied_date || (row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
    resumeUrl: row.resume_url || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

export const mapDbAnnouncementToUi = (row) => {
  if (!row) return null;
  const authorObj = Array.isArray(row.author) ? row.author[0] : row.author;
  const authorName = authorObj?.name || 'DigiX Communications';
  const authorRole = authorObj?.designation || (authorObj?.department ? `${authorObj.department} Team` : 'Corporate Operations');

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category,
    priority: row.priority || 'medium',
    author: authorName,
    authorRole: authorRole,
    authorId: row.author_id,
    targetAudience: row.target_audience || 'All Employees',
    isPinned: Boolean(row.is_pinned),
    date: row.published_at ? row.published_at.split('T')[0] : (row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
    publishedAt: row.published_at || row.created_at,
    read: false
  };
};

export const mapDbNotificationToUi = (row) => {
  if (!row) return null;

  let formattedTime = 'Just now';
  if (row.created_at) {
    try {
      const diffMs = Date.now() - new Date(row.created_at).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      if (diffMins < 1) formattedTime = 'Just now';
      else if (diffMins < 60) formattedTime = `${diffMins}m ago`;
      else if (diffHours < 24) formattedTime = `${diffHours}h ago`;
      else formattedTime = `${diffDays}d ago`;
    } catch {
      formattedTime = row.created_at.split('T')[0];
    }
  }

  let normalizedRole = row.target_role;
  if (normalizedRole === 'hr_manager') normalizedRole = 'hr';

  return {
    id: row.id,
    title: row.title,
    message: row.message,
    read: Boolean(row.is_read),
    is_read: Boolean(row.is_read),
    link: row.action_url || '',
    action_url: row.action_url || '',
    targetRole: normalizedRole || 'all',
    targetDepartment: row.target_department,
    targetAssignmentType: row.target_department ? 'department' : (row.recipient_employee_id ? 'specific' : 'all'),
    targetDepartments: row.target_department ? [row.target_department] : [],
    targetEmployees: row.recipient_employee_id ? [row.recipient_employee_id] : [],
    recipientEmployeeId: row.recipient_employee_id,
    author: 'DigiX Portal',
    timestamp: formattedTime,
    createdAt: row.created_at
  };
};

export const mapDbOnboardingToUi = (row, empList = null) => {
  if (!row) return null;
  const empObj = Array.isArray(row.employee) ? row.employee[0] : row.employee;
  const buddyObj = Array.isArray(row.buddy) ? row.buddy[0] : row.buddy;
  const items = Array.isArray(row.checklist_items) ? row.checklist_items : [];
  const completedCount = items.filter(i => i.done || i.completed).length;

  const resolvedBuddy = buddyObj?.name ||
    (empList && row.buddy_id ? empList.find(e => (e.dbId || e.id) === row.buddy_id)?.name : null) ||
    'Assigned Mentor';

  return {
    id: row.id,
    dbId: row.id,
    employeeId: row.employee_id,
    employeeName: empObj?.name || 'New Employee',
    role: empObj?.designation || 'New Hire',
    department: empObj?.department || 'General',
    joinDate: empObj?.joining_date || (row.created_at ? row.created_at.split('T')[0] : '2026-10-01'),
    buddyId: row.buddy_id,
    buddy: resolvedBuddy,
    cohort: row.cohort_name || 'General Orientation',
    cohortName: row.cohort_name || 'General Orientation',
    progress: row.progress !== undefined ? row.progress : (items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0),
    status: row.status || 'in_progress',
    tasksCompleted: completedCount,
    totalTasks: items.length,
    checklistItems: items,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

export const mapDbAuditLogToUi = (row) => {
  if (!row) return null;
  const dateObj = row.created_at ? new Date(row.created_at) : new Date();
  const formattedTimestamp = dateObj.toISOString().replace('T', ' ').substring(0, 19);

  return {
    id: row.id,
    dbId: row.id,
    user: row.actor_name || 'System User',
    actorName: row.actor_name || 'System User',
    role: row.role || 'user',
    action: row.action,
    ip: row.ip_address || '192.168.1.100',
    ipAddress: row.ip_address || '192.168.1.100',
    timestamp: formattedTimestamp,
    createdAt: row.created_at,
    status: row.status || 'Success',
    module: row.module || 'System',
    details: row.details || null
  };
};

export const mapDbEmployeeToUi = (row, nameMap = null) => {
  if (!row) return null;

  const normRole = (row.designation?.toLowerCase().includes('admin') || row.employee_id?.startsWith('ADM'))
    ? 'admin'
    : (row.department === 'Human Resources' || row.employee_id?.startsWith('HR') || row.designation?.toLowerCase().includes('hr'))
    ? 'hr'
    : 'employee';

  const defaultAvatar = row.profile_photo || `https://images.unsplash.com/photo-${
    normRole === 'admin'
      ? '1507003211169-0a1dd7228f2d'
      : normRole === 'hr'
      ? '1573496359142-b8d87734a5a2'
      : '1534528741775-53994a69daeb'
  }?w=150&auto=format&fit=crop&q=80`;

  const capStatus = row.status
    ? row.status.charAt(0).toUpperCase() + row.status.slice(1).toLowerCase()
    : 'Active';

  const inferredBand = row.designation?.toLowerCase().includes('principal') || normRole === 'admin'
    ? 'L8 - Principal'
    : row.designation?.toLowerCase().includes('lead') || row.designation?.toLowerCase().includes('manager') || normRole === 'hr'
    ? 'L6 - Manager'
    : row.designation?.toLowerCase().includes('senior')
    ? 'L5 - Senior'
    : 'L4 - Associate';

  const inferredWorkType = row.location?.toLowerCase().includes('remote')
    ? 'Remote'
    : row.location?.toLowerCase().includes('office') || row.location?.toLowerCase().includes('headquarters')
    ? 'On-site'
    : 'Hybrid';

  const managerObj = Array.isArray(row.manager) ? row.manager[0] : row.manager;
  const managerName = managerObj?.name ||
    (nameMap && row.manager_id ? nameMap.get(row.manager_id) : null) ||
    (row.manager_id ? 'Assigned Lead' : (normRole === 'admin' ? 'Devon Clark (CTO)' : normRole === 'hr' ? 'Elena Rostova (CPO)' : 'Priyanka'));

  return {
    id: row.employee_id || row.id,
    dbId: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    role: normRole,
    roleTitle: row.designation || 'Specialist',
    department: row.department || 'Technology',
    team: row.department || 'Engineering',
    avatar: defaultAvatar,
    phone: row.phone || '+1 (555) 000-0000',
    location: row.location || 'Corporate Office',
    manager: managerName,
    managerId: row.manager_id,
    joinDate: row.joining_date || (row.created_at ? row.created_at.split('T')[0] : '2024-01-01'),
    band: inferredBand,
    badgeNumber: row.employee_id || `DX-${row.id?.slice(0, 5) || '00000'}`,
    status: capStatus,
    workType: inferredWorkType,
    skills: row.skills || ['Corporate Specialist', 'Enterprise Systems'],
    performanceScore: 4.8,
    salary: row.salary || (normRole === 'admin' ? '$180,000' : normRole === 'hr' ? '$135,000' : '$125,000'),
    emergencyContact: null,
    isSupabaseEmp: true
  };
};

export { mapDbDirectoryEntryToUi };

export const ATTENDANCE_CONFIG = {
  workStartTime: '09:00',
  lateThreshold: '09:15',
  standardHours: 9
};

export const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDateDisplay = (date = new Date()) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

export const formatTime12h = (date = new Date()) => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const calculateDurationMinutes = (startIso, endIso) => {
  if (!startIso || !endIso) return 0;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return 1;
  return Math.max(1, Math.round((end - start) / (1000 * 60)));
};

export const formatDuration = (totalMinutes) => {
  if (!totalMinutes || totalMinutes <= 0) return '00h 01m';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
};

export const getLiveWorkingDuration = (record, currentTime = new Date()) => {
  if (!record) return { formatted: '00h 00m', minutes: 0 };
  if (!record.isActive) {
    return {
      formatted: record.workingHours || '00h 00m',
      minutes: record.totalWorkingMinutes || 0
    };
  }

  // Active record: calculate accumulated minutes
  let completedMinutes = 0;
  if (record.sessions && record.sessions.length > 0) {
    for (let i = 0; i < record.sessions.length - 1; i++) {
      completedMinutes += record.sessions[i].durationMinutes || 0;
    }
    const currentSession = record.sessions[record.sessions.length - 1];
    const sessionStart = currentSession?.checkInIso ? new Date(currentSession.checkInIso).getTime() : new Date(record.checkInIso).getTime();
    const now = currentTime.getTime();
    const liveMinutes = Math.max(1, Math.round((now - sessionStart) / (1000 * 60)));
    const totalMinutes = completedMinutes + liveMinutes;
    return {
      formatted: formatDuration(totalMinutes),
      minutes: totalMinutes
    };
  } else if (record.checkInIso) {
    const start = new Date(record.checkInIso).getTime();
    const now = currentTime.getTime();
    const liveMinutes = Math.max(1, Math.round((now - start) / (1000 * 60)));
    return {
      formatted: formatDuration(liveMinutes),
      minutes: liveMinutes
    };
  }

  return { formatted: record.workingHours || '00h 01m', minutes: 1 };
};

const DataContext = createContext(null);
const STORAGE_KEY = 'digix_portal_live_data_v4';

export const DataProvider = ({ children }) => {
  const loadSaved = (key, fallback) => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_${key}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(`Failed to read ${key} from storage`, e);
    }
    return fallback;
  };

  const { user, isSupabaseAuth, refreshProfile } = useAuth();
  const [employees, setEmployees] = useState(() => loadSaved('employees', INITIAL_EMPLOYEES));
  const [projects, setProjects] = useState(() => loadSaved('projects', INITIAL_PROJECTS));
  const [tasks, setTasks] = useState(() => loadSaved('tasks', INITIAL_TASKS));
  const [attendance, setAttendance] = useState(() => loadSaved('attendance', INITIAL_ATTENDANCE));
  const [isPunchedIn, setIsPunchedIn] = useState(true);
  const [leaveBalances, setLeaveBalances] = useState(() => loadSaved('leaveBalances', INITIAL_LEAVE_BALANCES));
  const [leaveRequests, setLeaveRequests] = useState(() => loadSaved('leaveRequests', INITIAL_LEAVE_REQUESTS));
  const [candidates, setCandidates] = useState(() => loadSaved('candidates', INITIAL_CANDIDATES));
  const [onboarding, setOnboarding] = useState(() => loadSaved('onboarding', INITIAL_ONBOARDING));
  const [trainings, setTrainings] = useState(() => loadSaved('trainings', INITIAL_TRAINING_COURSES));
  const [employeeDocuments, setEmployeeDocuments] = useState(() => loadSaved('employeeDocuments', INITIAL_DOCUMENTS.filter(d => !d.category.includes('Policy') && !d.category.includes('Benefits'))));
  const [companyDocuments, setCompanyDocuments] = useState(() => loadSaved('companyDocuments', INITIAL_DOCUMENTS.filter(d => d.category.includes('Policy') || d.category.includes('Benefits'))));
  const documents = useMemo(() => [...employeeDocuments, ...companyDocuments], [employeeDocuments, companyDocuments]);
  const [isLoadingEmployeeDocuments, setIsLoadingEmployeeDocuments] = useState(false);
  const [employeeDocumentsError, setEmployeeDocumentsError] = useState(null);
  const [isLoadingCompanyDocuments, setIsLoadingCompanyDocuments] = useState(false);
  const [companyDocumentsError, setCompanyDocumentsError] = useState(null);
  const isLoadingDocuments = isLoadingEmployeeDocuments || isLoadingCompanyDocuments;
  const documentsError = employeeDocumentsError || companyDocumentsError;
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState(null);
  const [isLoadingLeaves, setIsLoadingLeaves] = useState(false);
  const [leaveError, setLeaveError] = useState(null);
  const [isLoadingTrainings, setIsLoadingTrainings] = useState(false);
  const [trainingError, setTrainingError] = useState(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [projectError, setProjectError] = useState(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [taskError, setTaskError] = useState(null);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [candidateError, setCandidateError] = useState(null);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [employeesError, setEmployeesError] = useState(null);
  const [employeeDirectory, setEmployeeDirectory] = useState([]);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);
  const [directoryError, setDirectoryError] = useState(null);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false);
  const [announcementsError, setAnnouncementsError] = useState(null);
  const [announcements, setAnnouncements] = useState(() => loadSaved('announcements', INITIAL_ANNOUNCEMENTS));
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState(null);
  const [notifications, setNotifications] = useState(() => loadSaved('notifications', INITIAL_NOTIFICATIONS));
  const [isLoadingOnboarding, setIsLoadingOnboarding] = useState(false);
  const [onboardingError, setOnboardingError] = useState(null);
  const [profileRequests, setProfileRequests] = useState(() => loadSaved('profileRequests', INITIAL_PROFILE_REQUESTS));
  const [isLoadingProfileRequests, setIsLoadingProfileRequests] = useState(false);
  const [auditLogs, setAuditLogs] = useState(() => loadSaved('auditLogs', INITIAL_AUDIT_LOGS));
  const [isLoadingAuditLogs, setIsLoadingAuditLogs] = useState(false);
  const [auditLogsError, setAuditLogsError] = useState(null);
  const [systemSettings, setSystemSettings] = useState(() => loadSaved('systemSettings', INITIAL_SYSTEM_SETTINGS));
  const [rolePermissions, setRolePermissions] = useState(() => loadSaved('rolePermissions', INITIAL_ROLE_PERMISSIONS));
  const [leavePolicyQuotas, setLeavePolicyQuotas] = useState(() => loadSaved('leavePolicyQuotas', { casualLimit: 12, sickLimit: 10, privilegeLimit: 18, carryForward: 5 }));
  const [isLoadingSystemSettings, setIsLoadingSystemSettings] = useState(false);
  const [systemSettingsError, setSystemSettingsError] = useState(null);

  const [tickets, setTickets] = useState(() => loadSaved('helpdesk_tickets', INITIAL_HELPDESK_TICKETS));
  const [ticketMessages, setTicketMessages] = useState(() => loadSaved('helpdesk_messages', INITIAL_HELPDESK_MESSAGES));
  const ticketMessagesRef = useRef(ticketMessages);
  useEffect(() => {
    ticketMessagesRef.current = ticketMessages;
  }, [ticketMessages]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [ticketsError, setTicketsError] = useState(null);

  // Calendar & Holidays State
  const [holidays, setHolidays] = useState(() => loadSaved('company_holidays', INITIAL_HOLIDAYS));
  const [calendarEvents, setCalendarEvents] = useState(() => loadSaved('calendar_events', INITIAL_CALENDAR_EVENTS));
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState(null);

  // Mappers for Holidays and Calendar Events
  const mapDbHolidayToUi = useCallback((row) => {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      date: row.date,
      description: row.description || '',
      holidayType: row.holiday_type || 'public',
      location: row.location || 'All Locations',
      year: row.year || (row.date ? new Date(row.date).getFullYear() : 2026),
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }, []);

  const mapDbCalendarEventToUi = useCallback((row) => {
    if (!row) return null;
    const creator = row.creator || {};
    return {
      id: row.id,
      title: row.title,
      description: row.description || '',
      eventDate: row.event_date,
      startTime: row.start_time ? row.start_time.slice(0, 5) : null,
      endTime: row.end_time ? row.end_time.slice(0, 5) : null,
      eventType: row.event_type || 'company_event',
      targetAudience: row.target_audience || 'all',
      targetDepartment: row.target_department || null,
      targetEmployeeId: row.target_employee_id || null,
      location: row.location || '',
      createdBy: row.created_by,
      creatorName: creator.name || 'HR Operations',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }, []);

  // Mappers for Help Desk Tickets and Messages
  const mapDbTicketToUi = useCallback((dbTicket, defaultEmp = null) => {
    if (!dbTicket) return null;
    const emp = dbTicket.employee || defaultEmp || {};
    const assignee = dbTicket.assignee || {};
    return {
      id: dbTicket.id,
      ticketNumber: dbTicket.ticket_number || `HD-${dbTicket.id.slice(0, 8)}`,
      employeeId: emp.employee_id || dbTicket.employee_id,
      employeeUuid: dbTicket.employee_id,
      employeeName: emp.name || 'Employee',
      department: emp.department || 'Technology',
      avatar: emp.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      subject: dbTicket.subject,
      category: dbTicket.category,
      priority: dbTicket.priority || 'medium',
      status: dbTicket.status || 'open',
      description: dbTicket.description,
      assignedTo: assignee.name || null,
      assignedToId: dbTicket.assigned_to || null,
      initialAttachmentUrl: dbTicket.initial_attachment_url || null,
      initialAttachmentName: dbTicket.initial_attachment_name || null,
      initialAttachmentSize: dbTicket.initial_attachment_size || null,
      resolvedAt: dbTicket.resolved_at || null,
      closedAt: dbTicket.closed_at || null,
      createdAt: dbTicket.created_at,
      updatedAt: dbTicket.updated_at
    };
  }, []);

  const mapDbMessageToUi = useCallback((dbMsg, defaultSender = null) => {
    if (!dbMsg) return null;
    const sender = dbMsg.sender || defaultSender || {};
    return {
      id: dbMsg.id,
      ticketId: dbMsg.ticket_id,
      senderId: dbMsg.sender_id,
      senderName: sender.name || (dbMsg.sender_role === 'hr_manager' ? 'HR Operations' : dbMsg.sender_role === 'admin' ? 'System Administrator' : 'Employee'),
      senderRole: dbMsg.sender_role,
      senderAvatar: sender.profile_photo || null,
      message: dbMsg.message,
      attachmentUrl: dbMsg.attachment_url || null,
      attachmentName: dbMsg.attachment_name || null,
      attachmentSize: dbMsg.attachment_size || null,
      createdAt: dbMsg.created_at
    };
  }, []);


  // Helper to map Supabase public.employee_documents rows to UI-friendly document objects
  const mapDbDocumentToUi = useCallback((dbDoc, fallbackEmp = null) => {
    const formatCategory = (type) => {
      if (!type) return 'General Records';
      const map = {
        payslip: 'Payslips',
        tax: 'Tax Documents',
        policy: 'Company Policies',
        contract: 'Contracts',
        benefits: 'Benefits',
        identification: 'Identity & Legal',
        other: 'General Records'
      };
      return map[type.toLowerCase()] || (type.charAt(0).toUpperCase() + type.slice(1));
    };

    const formattedDate = dbDoc.uploaded_at
      ? new Date(dbDoc.uploaded_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const empObj = dbDoc.employee || fallbackEmp;
    const empName = empObj?.name || fallbackEmp?.name || 'Employee';

    return {
      id: dbDoc.id,
      dbId: dbDoc.id,
      name: dbDoc.document_name,
      category: formatCategory(dbDoc.document_type),
      documentType: dbDoc.document_type,
      type: 'PDF',
      fileSize: 'Verified',
      uploadDate: formattedDate,
      downloadUrl: dbDoc.document_url || dbDoc.storage_path || '#',
      url: dbDoc.document_url || dbDoc.storage_path || null,
      status: dbDoc.status || 'active',
      employeeId: dbDoc.employee_id,
      employeeName: empName,
      uploadedBy: dbDoc.uploaded_by,
      storagePath: dbDoc.storage_path,
      bucket: 'employee-documents',
      isCompanyDoc: false,
      isSupabaseDoc: true
    };
  }, []);

  const mapDbCompanyDocumentToUi = useCallback((dbDoc) => {
    if (!dbDoc) return null;
    const formattedDate = dbDoc.created_at
      ? new Date(dbDoc.created_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    const uploaderObj = Array.isArray(dbDoc.uploader) ? dbDoc.uploader[0] : dbDoc.uploader;

    return {
      id: dbDoc.id,
      dbId: dbDoc.id,
      name: dbDoc.title,
      title: dbDoc.title,
      category: dbDoc.category || 'Company Policy',
      fileName: dbDoc.file_name,
      fileSize: dbDoc.file_size || '1.0 MB',
      type: dbDoc.file_format || 'PDF',
      format: dbDoc.file_format || 'PDF',
      uploadDate: formattedDate,
      downloadUrl: dbDoc.download_url || dbDoc.storage_path || '#',
      url: dbDoc.download_url || dbDoc.storage_path || null,
      storagePath: dbDoc.storage_path,
      bucket: 'company-documents',
      uploadedBy: dbDoc.uploaded_by,
      uploaderName: uploaderObj?.name || 'HR Management',
      isActive: dbDoc.is_active,
      isCompanyDoc: true,
      isSupabaseDoc: true
    };
  }, []);

  // Helper to map Supabase public.attendance rows to UI-friendly attendance objects
  const mapDbAttendanceToUi = useCallback((dbRec, fallbackEmp = null) => {
    if (!dbRec) return null;

    const empObj = dbRec.employee || fallbackEmp || {};
    const employeeUuid = dbRec.employee_id || fallbackEmp?.dbId || fallbackEmp?.id;
    const badgeId = empObj.employee_id || fallbackEmp?.badgeNumber || fallbackEmp?.id || 'DX-EMP';
    const employeeName = empObj.name || fallbackEmp?.name || 'Employee';
    const department = empObj.department || fallbackEmp?.department || 'Technology';
    const avatar = empObj.profile_photo || fallbackEmp?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

    const email = empObj.email || fallbackEmp?.email || null;
    const designation = empObj.designation || fallbackEmp?.designation || fallbackEmp?.roleTitle || null;

    // Date parsing
    const dateKey = dbRec.attendance_date;
    let displayDate = dateKey;
    if (dateKey && typeof dateKey === 'string') {
      const parts = dateKey.split('-');
      if (parts.length === 3) {
        const parsedDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        displayDate = formatDateDisplay(parsedDate);
      }
    }

    // Active state: check_in exists and check_out is null
    const isActive = Boolean(dbRec.check_in && !dbRec.check_out);

    // Status mapping: DB is lowercase, UI is uppercase
    const rawStatus = (dbRec.status || 'present').toLowerCase();
    let statusUi = 'PRESENT';
    if (rawStatus === 'late') statusUi = 'LATE';
    else if (rawStatus === 'on_leave') statusUi = 'ON LEAVE';
    else if (rawStatus === 'absent') statusUi = 'ABSENT';

    // Work mode mapping
    const rawWorkMode = (dbRec.work_mode || 'office').toLowerCase();
    let workModeUi = 'On-Site';
    if (rawWorkMode === 'remote') workModeUi = 'Remote';
    else if (rawWorkMode === 'hybrid') workModeUi = 'Hybrid';

    // Timestamps & display strings
    const checkInIso = dbRec.check_in || null;
    const checkOutIso = dbRec.check_out || null;
    const checkIn = checkInIso ? formatTime12h(new Date(checkInIso)) : '--';
    const checkOut = isActive ? 'Currently Active' : (checkOutIso ? formatTime12h(new Date(checkOutIso)) : '--');

    // Working hours
    let totalWorkingMinutes = 0;
    let workingHours = '--';

    if (dbRec.total_hours != null && !isNaN(Number(dbRec.total_hours))) {
      totalWorkingMinutes = Math.round(Number(dbRec.total_hours) * 60);
      workingHours = formatDuration(totalWorkingMinutes);
    } else if (checkInIso && checkOutIso) {
      totalWorkingMinutes = calculateDurationMinutes(checkInIso, checkOutIso);
      workingHours = formatDuration(totalWorkingMinutes);
    } else if (isActive && checkInIso) {
      const startMs = new Date(checkInIso).getTime();
      const nowMs = Date.now();
      totalWorkingMinutes = Math.max(1, Math.round((nowMs - startMs) / (1000 * 60)));
      workingHours = formatDuration(totalWorkingMinutes);
    }

    return {
      id: dbRec.id,
      dbId: dbRec.id,
      employeeId: badgeId,
      employeeUuid: employeeUuid,
      employeeName: employeeName,
      email: email,
      designation: designation,
      employee: empObj,
      department: department,
      avatar: avatar,
      date: displayDate,
      dateKey: dateKey,
      checkIn: checkIn,
      checkInIso: checkInIso,
      checkOut: checkOut,
      checkOutIso: checkOutIso,
      workingHours: workingHours,
      totalWorkingMinutes: totalWorkingMinutes,
      status: statusUi,
      workMode: workModeUi,
      rawStatus: rawStatus,
      rawWorkMode: rawWorkMode,
      totalHours: dbRec.total_hours != null ? Number(dbRec.total_hours) : null,
      isActive: isActive,
      sessions: checkInIso ? [
        {
          sessionId: `SES-${dbRec.id}`,
          checkIn: checkIn,
          checkInIso: checkInIso,
          checkOut: checkOut,
          checkOutIso: checkOutIso,
          durationMinutes: totalWorkingMinutes
        }
      ] : [],
      activities: [
        ...(checkInIso ? [{ type: 'login', time: checkIn, timestamp: checkInIso }] : []),
        ...(checkOutIso ? [{ type: 'logout', time: checkOut, timestamp: checkOutIso }] : [])
      ],
      createdAt: dbRec.created_at,
      updatedAt: dbRec.updated_at
    };
  }, []);

  // Secure employee directory loader from Supabase (safe for all authenticated users)
  const fetchEmployeeDirectory = useCallback(async () => {
    if (!isSupabaseAuth || !isSupabaseConfigured) return [];
    setIsLoadingDirectory(true);
    setDirectoryError(null);
    try {
      // 1. Primary: query secure view public.employee_directory
      let { data, error } = await supabase
        .from('employee_directory')
        .select('id, employee_id, name, email, department, designation, location, profile_photo, status')
        .order('name', { ascending: true });

      // 2. Fallback: query secure RPC public.get_employee_directory()
      if (error && (error.code === 'PGRST205' || error.message?.includes('not find'))) {
        const rpcRes = await supabase.rpc('get_employee_directory');
        if (!rpcRes.error && rpcRes.data) {
          data = rpcRes.data;
          error = null;
        }
      }

      // 3. Fallback: if view/rpc awaiting remote execution, query public.employees safe fields
      if (error && (error.code === 'PGRST205' || error.message?.includes('not find'))) {
        const directRes = await supabase
          .from('employees')
          .select('id, employee_id, name, email, department, designation, location, profile_photo, status')
          .eq('status', 'active')
          .order('name', { ascending: true });
        if (!directRes.error && directRes.data) {
          data = directRes.data;
          error = null;
        }
      }

      if (error) {
        console.warn('[DataContext] Error fetching employee directory:', error);
        setDirectoryError(error.message);
        return [];
      } else if (data) {
        const mapped = data.map(mapDbDirectoryEntryToUi);
        setEmployeeDirectory(mapped);
        return mapped;
      }
      return [];
    } catch (err) {
      console.warn('[DataContext] Unexpected error loading directory:', err);
      setDirectoryError(err.message || 'Failed to load employee directory.');
      return [];
    } finally {
      setIsLoadingDirectory(false);
    }
  }, [isSupabaseAuth]);

  // Live employee directory loader from Supabase (HR and Admin query full records; regular employees query safe directory)
  const fetchEmployees = useCallback(async () => {
    if (!isSupabaseAuth || !isSupabaseConfigured) return [];
    const isHrOrAdmin =
      user?.role === 'hr' ||
      user?.role === 'admin' ||
      user?.role === 'hr_manager' ||
      user?.dbRole === 'hr_manager' ||
      user?.dbRole === 'admin';

    if (!isHrOrAdmin) {
      // Regular employees: fetch from secure employee directory instead of mock fallback!
      const dir = await fetchEmployeeDirectory();
      setEmployees(dir || []);
      return dir || [];
    }

    setIsLoadingEmployees(true);
    setEmployeesError(null);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('[DataContext] Error fetching employees from Supabase:', error);
        setEmployeesError(error.message);
        return [];
      } else if (data) {
        const nameMap = new Map();
        data.forEach((r) => {
          if (r.id && r.name) nameMap.set(r.id, r.name);
        });
        const mapped = data.map((r) => mapDbEmployeeToUi(r, nameMap));
        setEmployees(mapped);
        return mapped;
      }
      return [];
    } catch (err) {
      console.warn('[DataContext] Unexpected error loading employees:', err);
      setEmployeesError(err.message || 'Failed to load employee directory.');
      return [];
    } finally {
      setIsLoadingEmployees(false);
    }
  }, [isSupabaseAuth, user?.role, user?.dbRole, fetchEmployeeDirectory]);

  // Live employee documents loader from Supabase
  const fetchEmployeeDocuments = useCallback(async () => {
    if (!isSupabaseAuth || !isSupabaseConfigured) return [];
    setIsLoadingEmployeeDocuments(true);
    setEmployeeDocumentsError(null);
    try {
      const isHrOrAdmin = user?.role === 'hr' || user?.role === 'admin' || user?.role === 'hr_manager';
      let query = supabase
        .from('employee_documents')
        .select(`
          id,
          employee_id,
          document_type,
          document_name,
          storage_path,
          document_url,
          uploaded_by,
          status,
          uploaded_at,
          updated_at,
          employee:employees!employee_id (
            id,
            employee_id,
            name,
            email,
            department
          )
        `)
        .order('uploaded_at', { ascending: false });

      if (!isHrOrAdmin && user?.dbId) {
        query = query.eq('employee_id', user.dbId);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[DataContext] Error fetching employee documents:', error);
        setEmployeeDocumentsError(error.message);
        return [];
      } else if (data) {
        const mapped = data.map((d) => mapDbDocumentToUi(d, user));
        setEmployeeDocuments(mapped);
        return mapped;
      }
      return [];
    } catch (err) {
      console.warn('[DataContext] Unexpected error loading employee documents:', err);
      setEmployeeDocumentsError(err.message || 'Failed to load employee documents.');
      return [];
    } finally {
      setIsLoadingEmployeeDocuments(false);
    }
  }, [isSupabaseAuth, user?.dbId, user?.role, user?.name, mapDbDocumentToUi]);

  // Live company documents loader from Supabase
  const fetchCompanyDocuments = useCallback(async () => {
    if (!isSupabaseAuth || !isSupabaseConfigured) return [];
    setIsLoadingCompanyDocuments(true);
    setCompanyDocumentsError(null);
    try {
      const isHrOrAdmin = user?.role === 'hr' || user?.role === 'admin' || user?.role === 'hr_manager';
      let query = supabase
        .from('company_documents')
        .select(`
          id,
          title,
          category,
          file_name,
          file_size,
          file_format,
          storage_path,
          download_url,
          uploaded_by,
          is_active,
          created_at,
          updated_at,
          uploader:employees!uploaded_by (id, name, employee_id)
        `)
        .order('created_at', { ascending: false });

      if (!isHrOrAdmin) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[DataContext] Error fetching company documents:', error);
        setCompanyDocumentsError(error.message);
        return [];
      } else if (data) {
        const mapped = data.map(mapDbCompanyDocumentToUi);
        setCompanyDocuments(mapped);
        return mapped;
      }
      return [];
    } catch (err) {
      console.warn('[DataContext] Unexpected error loading company documents:', err);
      setCompanyDocumentsError(err.message || 'Failed to load company documents.');
      return [];
    } finally {
      setIsLoadingCompanyDocuments(false);
    }
  }, [isSupabaseAuth, user?.role, mapDbCompanyDocumentToUi]);

  // Live profile change requests loader from Supabase
  const fetchProfileRequests = useCallback(async () => {
    if (!isSupabaseAuth || !isSupabaseConfigured) return;
    setIsLoadingProfileRequests(true);
    try {
      const isHrOrAdmin = user?.role === 'hr' || user?.role === 'admin' || user?.role === 'hr_manager';
      if (isHrOrAdmin) {
        const { data, error } = await supabase
          .from('profile_change_requests')
          .select(`
            id,
            employee_id,
            field_name,
            current_value,
            requested_value,
            reason,
            supporting_document_url,
            status,
            reviewed_by,
            reviewed_at,
            hr_comment,
            created_at,
            updated_at,
            employee:employees!employee_id (
              id,
              employee_id,
              name,
              email,
              department,
              designation,
              profile_photo
            ),
            reviewer:employees!reviewed_by (
              id,
              name,
              employee_id
            )
          `)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setProfileRequests(data.map((r) => mapDbRequestToUi(r)));
        } else if (error) {
          console.warn('[DataContext] Error fetching HR profile requests from Supabase:', error);
        }
      } else if (user?.dbId) {
        const { data, error } = await supabase
          .from('profile_change_requests')
          .select('id, employee_id, field_name, current_value, requested_value, reason, supporting_document_url, status, reviewed_by, reviewed_at, hr_comment, created_at, updated_at')
          .eq('employee_id', user.dbId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setProfileRequests(data.map((r) => mapDbRequestToUi(r, user)));
        } else if (error) {
          console.warn('[DataContext] Error fetching employee profile requests from Supabase:', error);
        }
      }
    } catch (err) {
      console.warn('[DataContext] Unexpected error loading profile requests:', err);
    } finally {
      setIsLoadingProfileRequests(false);
    }
  }, [isSupabaseAuth, user?.dbId, user?.role, user?.name, user?.email, user?.department, user?.roleTitle, user?.avatar]);

  // Live attendance records loader from Supabase
  const fetchAttendanceRecords = useCallback(async () => {
    if (!isSupabaseAuth || !isSupabaseConfigured) return;
    setIsLoadingAttendance(true);
    setAttendanceError(null);

    try {
      const isHrOrAdmin =
        user?.role === 'hr' ||
        user?.role === 'admin' ||
        user?.role === 'hr_manager' ||
        user?.dbRole === 'admin' ||
        user?.dbRole === 'hr_manager';

      if (isHrOrAdmin) {
        const { data, error } = await supabase
          .from('attendance')
          .select(`
            id,
            employee_id,
            attendance_date,
            check_in,
            check_out,
            status,
            work_mode,
            total_hours,
            created_at,
            updated_at,
            employee:employees!employee_id (
              id,
              employee_id,
              name,
              email,
              department,
              designation,
              profile_photo
            )
          `)
          .order('attendance_date', { ascending: false });

        if (error) {
          console.warn('[DataContext] Error fetching attendance for HR/Admin:', error);
          setAttendanceError(error.message);
        } else if (data) {
          const mappedList = data.map((rec) => mapDbAttendanceToUi(rec));
          setAttendance(mappedList);
          const todayKey = getLocalDateKey();
          const myActive = mappedList.some(
            (r) => (r.employeeUuid === user?.dbId || r.employeeId === user?.id) && r.dateKey === todayKey && r.isActive
          );
          setIsPunchedIn(myActive);
        }
      } else if (user?.dbId) {
        const { data, error } = await supabase
          .from('attendance')
          .select(`
            id,
            employee_id,
            attendance_date,
            check_in,
            check_out,
            status,
            work_mode,
            total_hours,
            created_at,
            updated_at
          `)
          .eq('employee_id', user.dbId)
          .order('attendance_date', { ascending: false });

        if (error) {
          console.warn('[DataContext] Error fetching attendance for employee:', error);
          setAttendanceError(error.message);
        } else if (data) {
          const mappedList = data.map((rec) => mapDbAttendanceToUi(rec, user));
          setAttendance(mappedList);
          const todayKey = getLocalDateKey();
          const todayRecord = mappedList.find((r) => r.dateKey === todayKey);
          setIsPunchedIn(Boolean(todayRecord?.isActive));
        }
      }
    } catch (err) {
      console.warn('[DataContext] Unexpected error loading attendance records:', err);
      setAttendanceError(err.message || 'Failed to load attendance.');
    } finally {
      setIsLoadingAttendance(false);
    }
  }, [isSupabaseAuth, user?.dbId, user?.role, user?.dbRole, user?.name, user?.id, user?.badgeNumber, user?.department, user?.avatar, mapDbAttendanceToUi]);

  // Live Leave Requests loader from Supabase
  const fetchLeaveRequests = useCallback(async () => {
    if (!isSupabaseAuth || !isSupabaseConfigured) return;
    setIsLoadingLeaves(true);
    setLeaveError(null);
    try {
      const isHrOrAdmin =
        user?.role === 'hr' ||
        user?.role === 'admin' ||
        user?.role === 'hr_manager' ||
        user?.dbRole === 'admin' ||
        user?.dbRole === 'hr_manager';

      if (isHrOrAdmin) {
        const { data, error } = await supabase
          .from('leave_requests')
          .select(`
            id,
            employee_id,
            leave_type,
            start_date,
            end_date,
            reason,
            status,
            approved_by,
            approved_at,
            hr_comment,
            created_at,
            updated_at,
            employee:employees!employee_id (
              id,
              employee_id,
              name,
              department
            )
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('[DataContext] Error fetching leave requests for HR/Admin:', error);
          setLeaveError(error.message);
        } else if (data) {
          setLeaveRequests(data.map((r) => mapDbLeaveRequestToUi(r)));
        }
      } else if (user?.dbId) {
        const { data, error } = await supabase
          .from('leave_requests')
          .select('id, employee_id, leave_type, start_date, end_date, reason, status, approved_by, approved_at, hr_comment, created_at, updated_at')
          .eq('employee_id', user.dbId)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('[DataContext] Error fetching leave requests for employee:', error);
          setLeaveError(error.message);
        } else if (data) {
          setLeaveRequests(data.map((r) => mapDbLeaveRequestToUi(r, user)));
        }
      }
    } catch (err) {
      console.warn('[DataContext] Unexpected error loading leave requests:', err);
      setLeaveError(err.message || 'Failed to load leave requests.');
    } finally {
      setIsLoadingLeaves(false);
    }
  }, [isSupabaseAuth, user?.dbId, user?.role, user?.dbRole, user?.name, user?.department, user?.id]);

  // Live Leave Balances loader from Supabase
  const fetchLeaveBalances = useCallback(async () => {
    if (!isSupabaseAuth || !isSupabaseConfigured || !user?.dbId) return;
    try {
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', user.dbId)
        .eq('year', currentYear);

      if (error) {
        console.warn('[DataContext] Error fetching leave balances from Supabase:', error);
      } else if (data && data.length > 0) {
        setLeaveBalances(mapDbLeaveBalancesToUi(data));
      }
    } catch (err) {
      console.warn('[DataContext] Unexpected error loading leave balances:', err);
    }
  }, [isSupabaseAuth, user?.dbId]);

  // Live Trainings loader from Supabase
  const fetchTrainings = useCallback(async () => {
    if (!isSupabaseAuth || !isSupabaseConfigured) return;
    setIsLoadingTrainings(true);
    setTrainingError(null);
    try {
      const isHrOrAdmin =
        user?.role === 'hr' ||
        user?.role === 'admin' ||
        user?.role === 'hr_manager' ||
        user?.dbRole === 'admin' ||
        user?.dbRole === 'hr_manager';

      if (isHrOrAdmin) {
        const { data, error } = await supabase
          .from('training')
          .select(`
            id,
            title,
            description,
            category,
            instructor,
            duration,
            start_date,
            end_date,
            status,
            created_by,
            created_at,
            updated_at,
            assignments:training_assignments (
              id,
              employee_id,
              status,
              completion_percent,
              assigned_at,
              completed_at,
              employee:employees!employee_id (
                id,
                employee_id,
                name,
                department
              )
            )
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('[DataContext] Error fetching training programs for HR/Admin:', error);
          setTrainingError(error.message);
        } else if (data) {
          setTrainings(data.map(mapDbTrainingForHr));
        }
      } else if (user?.dbId) {
        const { data, error } = await supabase
          .from('training_assignments')
          .select(`
            id,
            training_id,
            employee_id,
            status,
            completion_percent,
            assigned_at,
            completed_at,
            training:training!training_id (
              id,
              title,
              description,
              category,
              instructor,
              duration,
              start_date,
              end_date,
              status,
              created_at
            )
          `)
          .eq('employee_id', user.dbId)
          .order('assigned_at', { ascending: false });

        if (error) {
          console.warn('[DataContext] Error fetching training assignments for employee:', error);
          setTrainingError(error.message);
        } else if (data) {
          setTrainings(data.map((a) => mapDbAssignmentForEmployee(a, user)));
        }
      }
    } catch (err) {
      console.warn('[DataContext] Unexpected error loading training data:', err);
      setTrainingError(err.message || 'Failed to load training data.');
    } finally {
      setIsLoadingTrainings(false);
    }
  }, [isSupabaseAuth, user?.dbId, user?.role, user?.dbRole, user?.name, user?.department, user?.id]);

  const fetchTasks = useCallback(async () => {
    if (!isSupabaseAuth || !isSupabaseConfigured) return [];
    setIsLoadingTasks(true);
    setTaskError(null);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          project_id,
          assigned_to,
          title,
          description,
          status,
          priority,
          due_date,
          completed_at,
          created_by,
          project:projects!project_id (id, name),
          assignee:employees!assigned_to (id, employee_id, name)
        `)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) {
        console.warn('[DataContext] Error fetching tasks from Supabase:', error);
        setTaskError(error.message);
        return [];
      } else if (data) {
        const mapped = data.map((t) => mapDbTaskToUi(t, user));
        setTasks(mapped);
        return mapped;
      }
      return [];
    } catch (err) {
      console.warn('[DataContext] Unexpected error loading tasks:', err);
      setTaskError(err.message || 'Failed to load tasks.');
      return [];
    } finally {
      setIsLoadingTasks(false);
    }
  }, [isSupabaseAuth, user]);

  const fetchProjects = useCallback(async (currentTasksList = null) => {
    if (!isSupabaseAuth || !isSupabaseConfigured) return [];
    setIsLoadingProjects(true);
    setProjectError(null);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          description,
          client_name,
          start_date,
          end_date,
          status,
          project_manager_id,
          manager:employees!project_manager_id (id, employee_id, name),
          members:project_members (
            id,
            employee_id,
            project_role,
            employee:employees!employee_id (id, employee_id, name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[DataContext] Error fetching projects from Supabase:', error);
        setProjectError(error.message);
        return [];
      } else if (data) {
        const taskRef = currentTasksList || tasks;
        const mapped = data.map((p) => mapDbProjectToUi(p, taskRef, user));
        setProjects(mapped);
        return mapped;
      }
      return [];
    } catch (err) {
      console.warn('[DataContext] Unexpected error loading projects:', err);
      setProjectError(err.message || 'Failed to load projects.');
      return [];
    } finally {
      setIsLoadingProjects(false);
    }
  }, [isSupabaseAuth, user?.id]);

  const fetchCandidates = useCallback(async () => {
    if (!isSupabaseAuth || !isSupabaseConfigured) return [];
    setIsLoadingCandidates(true);
    setCandidateError(null);
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select(`
          id,
          candidate_code,
          name,
          email,
          phone,
          role_applied,
          department,
          stage,
          rating,
          experience,
          current_company,
          salary_expectation,
          interviewer_id,
          resume_url,
          applied_date,
          created_at,
          updated_at,
          interviewer:employees!interviewer_id (id, employee_id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[DataContext] Error fetching candidates from Supabase:', error);
        setCandidateError(error.message);
        return [];
      } else if (data) {
        const mapped = data.map(mapDbCandidateToUi);
        setCandidates(mapped);
        return mapped;
      }
      return [];
    } catch (err) {
      console.warn('[DataContext] Unexpected error loading candidates:', err);
      setCandidateError(err.message || 'Failed to load candidates.');
      return [];
    } finally {
      setIsLoadingCandidates(false);
    }
  }, [isSupabaseAuth]);

  const fetchAnnouncements = useCallback(async () => {
    if (!isSupabaseAuth || !isSupabaseConfigured) return [];
    setIsLoadingAnnouncements(true);
    setAnnouncementsError(null);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          id,
          title,
          content,
          category,
          priority,
          author_id,
          target_audience,
          is_pinned,
          published_at,
          created_at,
          updated_at,
          author:employees!author_id (id, employee_id, name, designation, department)
        `)
        .order('is_pinned', { ascending: false })
        .order('published_at', { ascending: false });

      if (error) {
        console.warn('[DataContext] Error fetching announcements from Supabase:', error);
        setAnnouncementsError(error.message);
        return [];
      } else if (data) {
        const mapped = data.map(mapDbAnnouncementToUi);
        setAnnouncements(mapped);
        return mapped;
      }
      return [];
    } catch (err) {
      console.warn('[DataContext] Unexpected error loading announcements:', err);
      setAnnouncementsError(err.message || 'Failed to load announcements.');
      return [];
    } finally {
      setIsLoadingAnnouncements(false);
    }
  }, [isSupabaseAuth]);

  const fetchNotifications = useCallback(async () => {
    if (!isSupabaseAuth || !isSupabaseConfigured) return [];
    setIsLoadingNotifications(true);
    setNotificationsError(null);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[DataContext] Error fetching notifications from Supabase:', error);
        setNotificationsError(error.message);
        return [];
      } else if (data) {
        const mapped = data.map(mapDbNotificationToUi);
        setNotifications(mapped);
        return mapped;
      }
      return [];
    } catch (err) {
      console.warn('[DataContext] Unexpected error loading notifications:', err);
      setNotificationsError(err.message || 'Failed to load notifications.');
      return [];
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [isSupabaseAuth]);

  const fetchOnboardingChecklists = useCallback(async () => {
    if (!isSupabaseAuth || !isSupabaseConfigured) return [];
    setIsLoadingOnboarding(true);
    setOnboardingError(null);
    try {
      const { data, error } = await supabase
        .from('onboarding_checklists')
        .select(`
          id,
          employee_id,
          buddy_id,
          cohort_name,
          progress,
          status,
          checklist_items,
          created_at,
          updated_at,
          employee:employees!employee_id (id, employee_id, name, department, designation, joining_date),
          buddy:employees!buddy_id (id, employee_id, name, department, designation)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[DataContext] Error fetching onboarding checklists from Supabase:', error);
        setOnboardingError(error.message);
        return [];
      } else if (data) {
        const mapped = data.map(row => mapDbOnboardingToUi(row, employees));
        setOnboarding(mapped);
        return mapped;
      }
      return [];
    } catch (err) {
      console.warn('[DataContext] Unexpected error loading onboarding checklists:', err);
      setOnboardingError(err.message || 'Failed to load onboarding checklists.');
      return [];
    } finally {
      setIsLoadingOnboarding(false);
    }
  }, [isSupabaseAuth]);

  const fetchAuditLogs = useCallback(async () => {
    if (!isSupabaseAuth || !isSupabaseConfigured) return [];
    setIsLoadingAuditLogs(true);
    setAuditLogsError(null);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        console.warn('[DataContext] Error fetching audit logs from Supabase:', error);
        setAuditLogsError(error.message);
        return [];
      } else if (data) {
        const mapped = data.map(mapDbAuditLogToUi);
        setAuditLogs(mapped);
        return mapped;
      }
      return [];
    } catch (err) {
      console.warn('[DataContext] Unexpected error loading audit logs:', err);
      setAuditLogsError(err.message || 'Failed to load audit logs.');
      return [];
    } finally {
      setIsLoadingAuditLogs(false);
    }
  }, [isSupabaseAuth]);

  const fetchSystemSettings = useCallback(async () => {
    if (!isSupabaseAuth || !isSupabaseConfigured) return;
    setIsLoadingSystemSettings(true);
    setSystemSettingsError(null);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*');

      if (error) {
        console.warn('[DataContext] Error fetching system_settings:', error.message);
        setSystemSettingsError(error.message);
        return;
      }

      if (data && data.length > 0) {
        data.forEach((row) => {
          if (row.config_key === 'system_settings' && row.config_value) {
            setSystemSettings((prev) => ({ ...prev, ...row.config_value }));
          } else if (row.config_key === 'role_permissions' && Array.isArray(row.config_value)) {
            setRolePermissions(row.config_value);
          } else if (row.config_key === 'leave_policy_quotas' && row.config_value) {
            setLeavePolicyQuotas((prev) => ({ ...prev, ...row.config_value }));
          }
        });
      }
    } catch (err) {
      console.warn('[DataContext] Unexpected error loading system_settings:', err);
      setSystemSettingsError(err.message || 'Failed to load system settings.');
    } finally {
      setIsLoadingSystemSettings(false);
    }
  }, [isSupabaseAuth]);

  // Load from Supabase when authenticated, or restore mock/localStorage for demo mode
  useEffect(() => {
    if (isSupabaseAuth && (user?.dbId || user?.authId || user?.id)) {
      const isHrOrAdmin =
        user?.role === 'admin' ||
        user?.role === 'hr' ||
        user?.role === 'hr_manager' ||
        user?.dbRole === 'admin' ||
        user?.dbRole === 'hr_manager';
      const isAdmin = user?.role === 'admin' || user?.dbRole === 'admin';

      // Core queries accessible to all authenticated portal roles
      fetchEmployeeDirectory();
      fetchEmployeeDocuments();
      fetchCompanyDocuments();
      fetchAttendanceRecords();
      fetchLeaveRequests();
      fetchLeaveBalances();
      fetchTrainings();
      fetchTasks().then((loadedTasks) => {
        fetchProjects(loadedTasks);
      });
      fetchAnnouncements();
      fetchNotifications();
      fetchTickets();
      fetchHolidays();
      fetchCalendarEvents();

      // Elevated HR & Admin queries: Gated to avoid unauthorized requests, 403s, and socket congestion
      if (isHrOrAdmin) {
        fetchEmployees();
        fetchProfileRequests();
        fetchCandidates();
        fetchOnboardingChecklists();
        fetchSystemSettings();
      }

      // Admin-only governance queries
      if (isAdmin) {
        fetchAuditLogs();
      }
    } else if (!isSupabaseAuth) {
      const savedSettings = loadSaved('systemSettings', INITIAL_SYSTEM_SETTINGS);
      setSystemSettings(savedSettings);
      const savedPerms = loadSaved('rolePermissions', INITIAL_ROLE_PERMISSIONS);
      setRolePermissions(savedPerms);
      const savedQuotas = loadSaved('leavePolicyQuotas', { casualLimit: 12, sickLimit: 10, privilegeLimit: 18, carryForward: 5 });
      setLeavePolicyQuotas(savedQuotas);
      const savedEmployees = loadSaved('employees', INITIAL_EMPLOYEES);
      setEmployees(savedEmployees);
      setEmployeesError(null);
      const savedRequests = loadSaved('profileRequests', INITIAL_PROFILE_REQUESTS);
      setProfileRequests(savedRequests);
      const savedEmpDocs = loadSaved('employeeDocuments', INITIAL_DOCUMENTS.filter(d => !d.category.includes('Policy') && !d.category.includes('Benefits')));
      setEmployeeDocuments(savedEmpDocs);
      const savedCompDocs = loadSaved('companyDocuments', INITIAL_DOCUMENTS.filter(d => d.category.includes('Policy') || d.category.includes('Benefits')));
      setCompanyDocuments(savedCompDocs);
      const savedAttendance = loadSaved('attendance', INITIAL_ATTENDANCE);
      setAttendance(savedAttendance);
      setAttendanceError(null);
      const savedLeaveBalances = loadSaved('leaveBalances', INITIAL_LEAVE_BALANCES);
      setLeaveBalances(savedLeaveBalances);
      const savedLeaveRequests = loadSaved('leaveRequests', INITIAL_LEAVE_REQUESTS);
      setLeaveRequests(savedLeaveRequests);
      setLeaveError(null);
      const savedTrainings = loadSaved('trainings', INITIAL_TRAINING_COURSES);
      setTrainings(savedTrainings);
      setTrainingError(null);
      const savedProjects = loadSaved('projects', INITIAL_PROJECTS);
      setProjects(savedProjects);
      setProjectError(null);
      const savedTasks = loadSaved('tasks', INITIAL_TASKS);
      setTasks(savedTasks);
      setTaskError(null);
      const savedCandidates = loadSaved('candidates', INITIAL_CANDIDATES);
      setCandidates(savedCandidates);
      setCandidateError(null);
      const savedAnnouncements = loadSaved('announcements', INITIAL_ANNOUNCEMENTS);
      setAnnouncements(savedAnnouncements);
      setAnnouncementsError(null);
      const savedNotifs = loadSaved('notifications', INITIAL_NOTIFICATIONS);
      setNotifications(savedNotifs);
      setNotificationsError(null);
      const savedOnboarding = loadSaved('onboarding', INITIAL_ONBOARDING);
      setOnboarding(savedOnboarding);
      setOnboardingError(null);
      const savedAudit = loadSaved('auditLogs', INITIAL_AUDIT_LOGS);
      setAuditLogs(savedAudit);
      setAuditLogsError(null);
      const savedTickets = loadSaved('helpdesk_tickets', INITIAL_HELPDESK_TICKETS);
      setTickets(savedTickets);
      const savedMessages = loadSaved('helpdesk_messages', INITIAL_HELPDESK_MESSAGES);
      setTicketMessages(savedMessages);
      const savedHolidays = loadSaved('company_holidays', INITIAL_HOLIDAYS);
      setHolidays(savedHolidays);
      const savedEvents = loadSaved('calendar_events', INITIAL_CALENDAR_EVENTS);
      setCalendarEvents(savedEvents);
    }
  }, [
    isSupabaseAuth,
    user?.dbId,
    user?.id
  ]);

  // Sync to local storage
  useEffect(() => {
    try {
      if (!isSupabaseAuth) {
        localStorage.setItem(`${STORAGE_KEY}_systemSettings`, JSON.stringify(systemSettings));
        localStorage.setItem(`${STORAGE_KEY}_rolePermissions`, JSON.stringify(rolePermissions));
        localStorage.setItem(`${STORAGE_KEY}_leavePolicyQuotas`, JSON.stringify(leavePolicyQuotas));
        localStorage.setItem(`${STORAGE_KEY}_auditLogs`, JSON.stringify(auditLogs));
        localStorage.setItem(`${STORAGE_KEY}_announcements`, JSON.stringify(announcements));
        localStorage.setItem(`${STORAGE_KEY}_notifications`, JSON.stringify(notifications));
        localStorage.setItem(`${STORAGE_KEY}_employees`, JSON.stringify(employees));
        localStorage.setItem(`${STORAGE_KEY}_candidates`, JSON.stringify(candidates));
        localStorage.setItem(`${STORAGE_KEY}_projects`, JSON.stringify(projects));
        localStorage.setItem(`${STORAGE_KEY}_tasks`, JSON.stringify(tasks));
        localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify(attendance));
        localStorage.setItem(`${STORAGE_KEY}_employeeDocuments`, JSON.stringify(employeeDocuments));
        localStorage.setItem(`${STORAGE_KEY}_companyDocuments`, JSON.stringify(companyDocuments));
        localStorage.setItem(`${STORAGE_KEY}_profileRequests`, JSON.stringify(profileRequests));
        localStorage.setItem(`${STORAGE_KEY}_leaveBalances`, JSON.stringify(leaveBalances));
        localStorage.setItem(`${STORAGE_KEY}_leaveRequests`, JSON.stringify(leaveRequests));
        localStorage.setItem(`${STORAGE_KEY}_trainings`, JSON.stringify(trainings));
        localStorage.setItem(`${STORAGE_KEY}_onboarding`, JSON.stringify(onboarding));
        localStorage.setItem(`${STORAGE_KEY}_helpdesk_tickets`, JSON.stringify(tickets));
        localStorage.setItem(`${STORAGE_KEY}_helpdesk_messages`, JSON.stringify(ticketMessages));
      } else {
        localStorage.removeItem(`${STORAGE_KEY}_systemSettings`);
        localStorage.removeItem(`${STORAGE_KEY}_rolePermissions`);
        localStorage.removeItem(`${STORAGE_KEY}_leavePolicyQuotas`);
        localStorage.removeItem(`${STORAGE_KEY}_announcements`);
        localStorage.removeItem(`${STORAGE_KEY}_notifications`);
        localStorage.removeItem(`${STORAGE_KEY}_employees`);
        localStorage.removeItem(`${STORAGE_KEY}_candidates`);
        localStorage.removeItem(`${STORAGE_KEY}_projects`);
        localStorage.removeItem(`${STORAGE_KEY}_tasks`);
        localStorage.removeItem(`${STORAGE_KEY}_trainings`);
        localStorage.removeItem(`${STORAGE_KEY}_employeeDocuments`);
        localStorage.removeItem(`${STORAGE_KEY}_companyDocuments`);
        localStorage.removeItem(`${STORAGE_KEY}_documents`);
        localStorage.removeItem(`${STORAGE_KEY}_onboarding`);
        localStorage.removeItem(`${STORAGE_KEY}_auditLogs`);
        localStorage.removeItem(`${STORAGE_KEY}_helpdesk_tickets`);
        localStorage.removeItem(`${STORAGE_KEY}_helpdesk_messages`);
      }
    } catch (e) {
      console.warn('Failed to persist data', e);
    }
  }, [
    employees, projects, tasks, attendance, leaveBalances, leaveRequests,
    candidates, onboarding, trainings, documents, announcements, notifications, auditLogs,
    tickets, ticketMessages,
    systemSettings, rolePermissions, leavePolicyQuotas, profileRequests, isSupabaseAuth
  ]);

  // Actions
  const addEmployee = async (newEmp) => {
    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        let candidateId = newEmp.id || newEmp.employeeId;
        if (!candidateId) {
          const prefix = newEmp.department === 'Human Resources' || newEmp.role === 'hr' ? 'HR' : 'DGX';
          const maxNum = employees.reduce((max, e) => {
            const match = (e.id || '').match(new RegExp(`^${prefix}(\\d+)$`));
            if (match) {
              const num = parseInt(match[1], 10);
              return num > max ? num : max;
            }
            return max;
          }, 0);
          candidateId = `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
        }

        const validStatuses = ['active', 'inactive', 'on_leave', 'resigned'];
        let cleanStatus = (newEmp.status || 'active').toLowerCase().replace(/\s+/g, '_');
        if (!validStatuses.includes(cleanStatus)) cleanStatus = 'active';

        const insertPayload = {
          employee_id: candidateId,
          name: newEmp.name,
          email: newEmp.email,
          phone: newEmp.phone || null,
          department: newEmp.department || 'Technology',
          designation: newEmp.roleTitle || newEmp.designation || 'Specialist',
          location: newEmp.location || 'Corporate Office',
          joining_date: newEmp.joinDate || newEmp.joining_date || new Date().toISOString().split('T')[0],
          status: cleanStatus,
          profile_photo: newEmp.avatar || null
        };

        const { data, error } = await supabase
          .from('employees')
          .insert(insertPayload)
          .select('*')
          .single();

        if (error) {
          console.error('[DataContext] Error adding employee to Supabase:', error);
          throw new Error(`Failed to add employee: ${error.message}`);
        }

        const uiEmp = mapDbEmployeeToUi(data);
        setEmployees((prev) => [uiEmp, ...prev]);
        addAuditLog(`Enrolled employee in Supabase: ${uiEmp.name} (${uiEmp.id})`, 'Success', 'Employees');
        return uiEmp;
      } catch (err) {
        console.error('[DataContext] Failed to create employee in Supabase:', err);
        throw err;
      }
    }

    // Demo / offline fallback
    const id = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
    const emp = {
      ...newEmp,
      id,
      status: 'Active',
      badgeNumber: `DX-${Math.floor(10000 + Math.random() * 90000)}`,
      avatar: newEmp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      joinDate: newEmp.joinDate || new Date().toISOString().split('T')[0]
    };
    setEmployees((prev) => [emp, ...prev]);
    addAuditLog(`Created new employee profile: ${emp.name} (${emp.id})`, 'Success', 'Employees');
    return emp;
  };

  const updateEmployee = async (id, updates) => {
    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        const existing = employees.find((e) => e.id === id || e.dbId === id);
        const targetDbId = existing?.dbId;

        if (targetDbId) {
          const dbPayload = {};
          if (updates.name !== undefined) dbPayload.name = updates.name;
          if (updates.email !== undefined) dbPayload.email = updates.email;
          if (updates.phone !== undefined) dbPayload.phone = updates.phone;
          if (updates.department !== undefined) dbPayload.department = updates.department;
          if (updates.roleTitle !== undefined || updates.designation !== undefined) {
            dbPayload.designation = updates.roleTitle || updates.designation;
          }
          if (updates.location !== undefined) dbPayload.location = updates.location;
          if (updates.status !== undefined) {
            const validStatuses = ['active', 'inactive', 'on_leave', 'resigned'];
            const cleanStatus = updates.status.toLowerCase().replace(/\s+/g, '_');
            if (validStatuses.includes(cleanStatus)) {
              dbPayload.status = cleanStatus;
            }
          }
          if (updates.avatar !== undefined || updates.profile_photo !== undefined) {
            dbPayload.profile_photo = updates.avatar || updates.profile_photo;
          }

          if (Object.keys(dbPayload).length > 0) {
            const { data, error } = await supabase
              .from('employees')
              .update(dbPayload)
              .eq('id', targetDbId)
              .select('*')
              .single();

            if (error) {
              console.error('[DataContext] Error updating employee in Supabase:', error);
              throw new Error(`Failed to update employee: ${error.message}`);
            }

            const updatedUi = mapDbEmployeeToUi(data);
            setEmployees((prev) => prev.map((e) => (e.dbId === targetDbId || e.id === id ? updatedUi : e)));
            addAuditLog(`Updated employee details in Supabase: ${id}`, 'Success', 'Employees');
            return updatedUi;
          }
        }
      } catch (err) {
        console.error('[DataContext] Failed to update employee in Supabase:', err);
        throw err;
      }
    }

    // Demo / offline fallback
    setEmployees((prev) => prev.map((emp) => (emp.id === id ? { ...emp, ...updates } : emp)));
    addAuditLog(`Updated profile details for ID: ${id}`, 'Success', 'Employees');
  };

  const updateOwnAvatar = async (targetEmpId, newPhotoUrl) => {
    if (isSupabaseAuth && isSupabaseConfigured) {
      let dbUpdated = false;
      // 1. Try RPC update_own_profile_photo first
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('update_own_profile_photo', {
          new_photo_url: newPhotoUrl
        });
        if (!rpcErr && rpcData) {
          dbUpdated = true;
          console.log('[DataContext] Avatar updated via RPC:', rpcData);
        }
      } catch (rpcEx) {
        console.warn('[DataContext] RPC update_own_profile_photo exception:', rpcEx);
      }

      // 2. Direct update fallback on public.employees
      if (!dbUpdated) {
        try {
          const { data: directData, error: directErr } = await supabase
            .from('employees')
            .update({ profile_photo: newPhotoUrl })
            .eq('id', targetEmpId)
            .select('id, profile_photo');
          if (!directErr && directData && directData.length > 0) {
            dbUpdated = true;
            console.log('[DataContext] Avatar updated via direct employee table update');
          } else if (directErr) {
            console.warn('[DataContext] Direct update error:', directErr.message);
          }
        } catch (directEx) {
          console.warn('[DataContext] Direct update exception:', directEx);
        }
      }

      if (!dbUpdated) {
        throw new Error('Database persistence failed: Unable to update employee profile photo record.');
      }
    }

    // Update local employees list in DataContext
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.dbId === targetEmpId || emp.id === targetEmpId
          ? { ...emp, avatar: newPhotoUrl, profile_photo: newPhotoUrl }
          : emp
      )
    );
    addAuditLog(`Updated profile photo`, 'Success', 'Employees');
    return newPhotoUrl;
  };

  const addTask = async (newTask) => {
    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        let projectId = newTask.projectId;
        if (!projectId && newTask.project) {
          const matched = projects.find(
            (p) => p.name?.toLowerCase() === newTask.project?.toLowerCase() || p.id === newTask.project
          );
          if (matched) projectId = matched.id;
        }
        if (!projectId && projects.length > 0) {
          projectId = projects[0].id;
        }

        let assignedToUuid = newTask.assignedToDbId;
        if (!assignedToUuid) {
          if (newTask.assignedTo === user?.name || newTask.assignedTo === user?.id || !newTask.assignedTo) {
            assignedToUuid = user?.dbId;
          } else {
            const matchedEmp = employees.find(
              (e) => e.name?.toLowerCase() === newTask.assignedTo?.toLowerCase() || e.id === newTask.assignedTo
            );
            if (matchedEmp?.dbId) assignedToUuid = matchedEmp.dbId;
            else assignedToUuid = user?.dbId;
          }
        }

        const dbTaskPayload = {
          project_id: projectId,
          assigned_to: assignedToUuid || user?.dbId,
          title: newTask.title,
          description: newTask.description || '',
          status: newTask.status || 'todo',
          priority: newTask.priority || 'medium',
          due_date: newTask.dueDate || new Date().toISOString().split('T')[0],
          created_by: user?.dbId
        };

        const { data, error } = await supabase
          .from('tasks')
          .insert(dbTaskPayload)
          .select(`
            id,
            project_id,
            assigned_to,
            title,
            description,
            status,
            priority,
            due_date,
            completed_at,
            created_by,
            project:projects!project_id (id, name),
            assignee:employees!assigned_to (id, employee_id, name)
          `)
          .single();

        if (error) {
          console.error('[DataContext] Error creating task in Supabase:', error);
          throw error;
        }

        const uiTask = mapDbTaskToUi(data, user);
        setTasks((prev) => [uiTask, ...prev]);
        addAuditLog(`Created new sprint task: ${uiTask.title}`, 'Success', 'Tasks');
        return uiTask;
      } catch (err) {
        console.error('[DataContext] Failed to create task:', err);
        throw err;
      }
    } else {
      const id = `TSK-${Math.floor(800 + Math.random() * 200)}`;
      const task = {
        id,
        status: 'todo',
        priority: newTask.priority || 'medium',
        dueDate: newTask.dueDate || new Date().toISOString().split('T')[0],
        ...newTask
      };
      setTasks((prev) => [task, ...prev]);
      addAuditLog(`Created new task: ${task.title}`, 'Success', 'Tasks');
      return task;
    }
  };

  const toggleTaskStatus = async (taskId) => {
    const current = tasks.find((t) => t.id === taskId);
    if (!current) return;
    const nextStatus = current.status === 'completed' ? 'in_progress' : 'completed';
    const completedAt = nextStatus === 'completed' ? new Date().toISOString() : null;

    if (isSupabaseAuth && isSupabaseConfigured) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus, completedAt } : t))
      );

      try {
        const { error } = await supabase
          .from('tasks')
          .update({
            status: nextStatus,
            completed_at: completedAt
          })
          .eq('id', taskId);

        if (error) {
          console.error('[DataContext] Error updating task status in Supabase:', error);
          setTasks((prev) => prev.map((t) => (t.id === taskId ? current : t)));
          throw error;
        }

        addAuditLog(`Updated task status: ${current.title} (${nextStatus})`, 'Success', 'Tasks');
        // Refresh projects to update progress
        fetchProjects();
      } catch (err) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? current : t)));
        throw err;
      }
    } else {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
      );
      addAuditLog(`Updated task status: ${current.title}`, 'Success', 'Tasks');
    }
  };

  const updateTask = async (taskId, updates) => {
    const current = tasks.find((t) => t.id === taskId);
    if (!current) return;

    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        const dbUpdates = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.status !== undefined) {
          dbUpdates.status = updates.status;
          dbUpdates.completed_at = updates.status === 'completed' ? new Date().toISOString() : null;
        }
        if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
        if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
        if (updates.assignedToDbId !== undefined) dbUpdates.assigned_to = updates.assignedToDbId;

        const { error } = await supabase.from('tasks').update(dbUpdates).eq('id', taskId);
        if (error) throw error;

        await fetchTasks();
        await fetchProjects();
        addAuditLog(`Updated task: ${current.title}`, 'Success', 'Tasks');
      } catch (err) {
        console.error('[DataContext] Failed to update task in Supabase:', err);
        throw err;
      }
    } else {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)));
    }
  };

  const addProject = async (newProj) => {
    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        const dbPayload = {
          name: newProj.name,
          description: newProj.description || '',
          client_name: newProj.category || newProj.clientName || 'Strategic Initiative',
          start_date: newProj.startDate || new Date().toISOString().split('T')[0],
          end_date: newProj.deadline || newProj.endDate || null,
          status: newProj.status || 'planned',
          project_manager_id: newProj.projectManagerId || user?.dbId
        };

        const { data: prj, error: prjErr } = await supabase
          .from('projects')
          .insert(dbPayload)
          .select()
          .single();

        if (prjErr) throw prjErr;

        if (prj?.id && (newProj.projectManagerId || user?.dbId)) {
          await supabase.from('project_members').insert({
            project_id: prj.id,
            employee_id: newProj.projectManagerId || user?.dbId,
            project_role: 'project_manager'
          });
        }

        await fetchProjects();
        addAuditLog(`Created strategic project: ${prj.name}`, 'Success', 'Projects');
        return prj;
      } catch (err) {
        console.error('[DataContext] Error creating project in Supabase:', err);
        throw err;
      }
    } else {
      const id = `PRJ-${Math.floor(400 + Math.random() * 200)}`;
      const prj = {
        id,
        code: newProj.name ? newProj.name.slice(0, 3).toUpperCase() : 'PRJ',
        health: 'Good',
        progress: 0,
        budget: '$250,000',
        spent: '$0',
        teamMembers: [user?.name || 'Marcus Vance'],
        ...newProj
      };
      setProjects((prev) => [prj, ...prev]);
      addAuditLog(`Created project: ${prj.name}`, 'Success', 'Projects');
      return prj;
    }
  };

  const updateProject = async (projectId, updates) => {
    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        const dbPayload = {};
        if (updates.name !== undefined) dbPayload.name = updates.name;
        if (updates.description !== undefined) dbPayload.description = updates.description;
        if (updates.category !== undefined) dbPayload.client_name = updates.category;
        if (updates.client_name !== undefined) dbPayload.client_name = updates.client_name;
        if (updates.startDate !== undefined) dbPayload.start_date = updates.startDate;
        if (updates.deadline !== undefined) dbPayload.end_date = updates.deadline;
        if (updates.status !== undefined) dbPayload.status = updates.status.toLowerCase().replace(/\s+/g, '_');
        if (updates.projectManagerId !== undefined) dbPayload.project_manager_id = updates.projectManagerId;

        const { error } = await supabase.from('projects').update(dbPayload).eq('id', projectId);
        if (error) throw error;

        await fetchProjects();
        addAuditLog(`Updated project: ${projectId}`, 'Success', 'Projects');
      } catch (err) {
        console.error('[DataContext] Error updating project in Supabase:', err);
        throw err;
      }
    } else {
      setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, ...updates } : p)));
    }
  };

  const deleteProject = async (projectId) => {
    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('projects').delete().eq('id', projectId);
        if (error) throw error;

        await fetchProjects();
        await fetchTasks();
        addAuditLog(`Deleted project: ${projectId}`, 'Success', 'Projects');
      } catch (err) {
        console.error('[DataContext] Error deleting project in Supabase:', err);
        throw err;
      }
    } else {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    }
  };

  const assignProjectMember = async (projectId, employeeId, projectRole = 'developer') => {
    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('project_members').insert({
          project_id: projectId,
          employee_id: employeeId,
          project_role: projectRole
        });
        if (error) throw error;
        await fetchProjects();
      } catch (err) {
        console.error('[DataContext] Error assigning project member:', err);
        throw err;
      }
    }
  };

  const removeProjectMember = async (membershipId) => {
    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('project_members').delete().eq('id', membershipId);
        if (error) throw error;
        await fetchProjects();
      } catch (err) {
        console.error('[DataContext] Error removing project member:', err);
        throw err;
      }
    }
  };

  // Real-Time Employee Login / Logout Attendance Operations
  const recordLoginAttendance = async (targetUser) => {
    const activeUser = targetUser || user;
    if (!activeUser) return null;

    const now = new Date();
    const todayKey = getLocalDateKey(now);
    const timeStr = formatTime12h(now);
    const nowIso = now.toISOString();

    const isUserSupabase = isSupabaseAuth || Boolean(activeUser?.isSupabaseAuth) || Boolean(activeUser?.dbId);

    if (isUserSupabase && isSupabaseConfigured) {
      const empUuid = activeUser.dbId || (activeUser.id && activeUser.id.includes('-') && activeUser.id.length === 36 ? activeUser.id : null);
      if (!empUuid) {
        console.warn('[DataContext] recordLoginAttendance: Supabase user missing UUID (dbId)', activeUser);
        return null;
      }

      try {
        // Query today's attendance record for this employee
        const { data: existingRows, error: fetchErr } = await supabase
          .from('attendance')
          .select(`
            id,
            employee_id,
            attendance_date,
            check_in,
            check_out,
            status,
            work_mode,
            total_hours,
            created_at,
            updated_at
          `)
          .eq('employee_id', empUuid)
          .eq('attendance_date', todayKey);

        if (fetchErr) {
          console.error('[DataContext] Error querying existing attendance record:', fetchErr);
        }

        if (existingRows && existingRows.length > 0) {
          const existing = existingRows[0];
          const mapped = mapDbAttendanceToUi(existing, activeUser);

          if (!existing.check_out) {
            // Active session -> resume
            setIsPunchedIn(true);
            setAttendance((prev) => [mapped, ...prev.filter((a) => a.id !== mapped.id)]);
            addAuditLog(
              `${activeUser.name} logged in at ${timeStr} (Resumed Shift)`,
              'Success',
              'Attendance',
              activeUser.name,
              activeUser.roleTitle || activeUser.role
            );
            return mapped;
          } else {
            // Already checked out earlier today -> preserve completed record according to single-record-per-day design
            setIsPunchedIn(false);
            setAttendance((prev) => [mapped, ...prev.filter((a) => a.id !== mapped.id)]);
            return mapped;
          }
        }

        // No record exists yet for today -> determine status and create new record
        const isOnLeave = leaveRequests.some(
          (req) =>
            (req.employeeId === activeUser.id || req.employeeName === activeUser.name || req.employeeId === empUuid) &&
            req.status === 'Approved' &&
            req.startDate <= todayKey &&
            req.endDate >= todayKey
        );

        let dbStatus = 'present';
        if (isOnLeave) {
          dbStatus = 'on_leave';
        } else {
          const hours = now.getHours();
          const minutes = now.getMinutes();
          const isLate = hours > 9 || (hours === 9 && minutes > 15);
          dbStatus = isLate ? 'late' : 'present';
        }

        const normalizeWorkModeToDb = (mode) => {
          if (!mode) return 'office';
          const lower = String(mode).toLowerCase();
          if (lower.includes('remote')) return 'remote';
          if (lower.includes('hybrid')) return 'hybrid';
          return 'office';
        };

        const insertPayload = {
          employee_id: empUuid,
          attendance_date: todayKey,
          check_in: nowIso,
          status: dbStatus,
          work_mode: normalizeWorkModeToDb(activeUser.workType || activeUser.workMode)
        };

        const { data: insertedData, error: insertError } = await supabase
          .from('attendance')
          .insert(insertPayload)
          .select(`
            id,
            employee_id,
            attendance_date,
            check_in,
            check_out,
            status,
            work_mode,
            total_hours,
            created_at,
            updated_at
          `)
          .single();

        if (insertError) {
          // Handle 23505 unique violation (duplicate entry if created concurrently)
          if (insertError.code === '23505') {
            console.info('[DataContext] Duplicate attendance prevented (23505), re-fetching existing record...');
            const { data: recheckData } = await supabase
              .from('attendance')
              .select(`
                id,
                employee_id,
                attendance_date,
                check_in,
                check_out,
                status,
                work_mode,
                total_hours,
                created_at,
                updated_at
              `)
              .eq('employee_id', empUuid)
              .eq('attendance_date', todayKey)
              .maybeSingle();

            if (recheckData) {
              const mapped = mapDbAttendanceToUi(recheckData, activeUser);
              setIsPunchedIn(!recheckData.check_out);
              setAttendance((prev) => [mapped, ...prev.filter((a) => a.id !== mapped.id)]);
              return mapped;
            }
          }
          console.error('[DataContext] Error inserting attendance record in Supabase:', insertError);
          return null;
        }

        const mapped = mapDbAttendanceToUi(insertedData, activeUser);
        setIsPunchedIn(true);
        setAttendance((prev) => [mapped, ...prev.filter((a) => a.id !== mapped.id)]);

        addAuditLog(
          `${activeUser.name} logged in at ${timeStr} (Shift Started - ${mapped.status})`,
          'Success',
          'Attendance',
          activeUser.name,
          activeUser.roleTitle || activeUser.role
        );

        return mapped;
      } catch (err) {
        console.error('[DataContext] Unexpected error recording login attendance in Supabase:', err);
        return null;
      }
    }

    // Demo / mock mode fallback (exact existing behavior)
    const existingIndex = attendance.findIndex(
      (a) =>
        (a.employeeId === activeUser.id || a.employeeId === activeUser.badgeNumber || a.employeeName === activeUser.name) &&
        (a.dateKey === todayKey || a.dateKey === 'TODAY')
    );

    if (existingIndex !== -1) {
      const existing = attendance[existingIndex];
      // Browser refresh handling: retain active session and do not duplicate
      if (existing.isActive) {
        setIsPunchedIn(true);
        return existing;
      }

      // Re-logging in on the same day: resume session
      const newSession = {
        sessionId: `SES-${Date.now()}`,
        checkIn: timeStr,
        checkInIso: nowIso,
        checkOut: 'Currently Active',
        checkOutIso: null,
        durationMinutes: 0
      };

      const updatedSessions = [...(existing.sessions || []), newSession];
      const updatedActivities = [
        ...(existing.activities || []),
        { type: 'login', time: timeStr, timestamp: nowIso }
      ];

      const updatedRecord = {
        ...existing,
        isActive: true,
        checkOut: 'Currently Active',
        checkOutIso: null,
        sessions: updatedSessions,
        activities: updatedActivities,
        updatedAt: nowIso
      };

      setAttendance((prev) => {
        const next = [...prev];
        next[existingIndex] = updatedRecord;
        return next;
      });

      setIsPunchedIn(true);
      addAuditLog(
        `${activeUser.name} logged in at ${timeStr} (Resumed Shift)`,
        'Success',
        'Attendance',
        activeUser.name,
        activeUser.roleTitle || activeUser.role
      );

      return updatedRecord;
    }

    // First login of the day in demo mode
    const isOnLeave = leaveRequests.some(
      (req) =>
        (req.employeeId === activeUser.id || req.employeeName === activeUser.name) &&
        req.status === 'Approved' &&
        req.startDate <= todayKey &&
        req.endDate >= todayKey
    );

    let status = 'PRESENT';
    if (isOnLeave) {
      status = 'ON LEAVE';
    } else {
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const isLate = hours > 9 || (hours === 9 && minutes > 15);
      status = isLate ? 'LATE' : 'PRESENT';
    }

    const newRecord = {
      id: `ATT-${todayKey.replace(/-/g, '')}-${activeUser.id}`,
      employeeId: activeUser.id || 'DGX003',
      employeeName: activeUser.name,
      department: activeUser.department || 'Technology',
      avatar: activeUser.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      date: formatDateDisplay(now),
      dateKey: todayKey,
      checkIn: timeStr,
      checkInIso: nowIso,
      checkOut: 'Currently Active',
      checkOutIso: null,
      workingHours: '00h 01m',
      totalWorkingMinutes: 1,
      status,
      workMode: activeUser.workType || 'Hybrid',
      isActive: true,
      breakStart: null,
      breakEnd: null,
      totalBreakDuration: 0,
      sessions: [
        {
          sessionId: `SES-${Date.now()}`,
          checkIn: timeStr,
          checkInIso: nowIso,
          checkOut: 'Currently Active',
          checkOutIso: null,
          durationMinutes: 1
        }
      ],
      activities: [
        { type: 'login', time: timeStr, timestamp: nowIso }
      ],
      createdAt: nowIso,
      updatedAt: nowIso
    };

    setAttendance((prev) => [newRecord, ...prev]);
    setIsPunchedIn(true);

    addAuditLog(
      `${activeUser.name} logged in at ${timeStr} (Shift Started - ${status})`,
      'Success',
      'Attendance',
      activeUser.name,
      activeUser.roleTitle || activeUser.role
    );

    return newRecord;
  };

  const recordLogoutAttendance = async (targetUser) => {
    const activeUser = targetUser || user;
    if (!activeUser) return null;

    const now = new Date();
    const todayKey = getLocalDateKey(now);
    const timeStr = formatTime12h(now);
    const nowIso = now.toISOString();

    const isUserSupabase = isSupabaseAuth || Boolean(activeUser?.isSupabaseAuth) || Boolean(activeUser?.dbId);

    if (isUserSupabase && isSupabaseConfigured) {
      const empUuid = activeUser.dbId || (activeUser.id && activeUser.id.includes('-') && activeUser.id.length === 36 ? activeUser.id : null);
      if (!empUuid) {
        setIsPunchedIn(false);
        return null;
      }

      try {
        // Query today's active attendance record (check_out IS NULL)
        const { data: activeRows, error: findErr } = await supabase
          .from('attendance')
          .select(`
            id,
            employee_id,
            attendance_date,
            check_in,
            check_out,
            status,
            work_mode,
            total_hours,
            created_at,
            updated_at
          `)
          .eq('employee_id', empUuid)
          .eq('attendance_date', todayKey)
          .is('check_out', null);

        if (findErr) {
          console.error('[DataContext] Error finding active record for checkout:', findErr);
          setIsPunchedIn(false);
          return null;
        }

        if (!activeRows || activeRows.length === 0) {
          console.info('[DataContext] No active attendance session found to check out for today.');
          setIsPunchedIn(false);
          return null;
        }

        const activeRecord = activeRows[0];
        const checkInMs = new Date(activeRecord.check_in).getTime();
        const checkOutMs = now.getTime();
        const durationMs = Math.max(0, checkOutMs - checkInMs);
        // Decimal hours rounded to 2 decimal places: (check_out - check_in) / 3600000
        const totalHoursDecimal = Math.round((durationMs / 3600000) * 100) / 100;

        const { data: updatedData, error: updateErr } = await supabase
          .from('attendance')
          .update({
            check_out: nowIso,
            total_hours: totalHoursDecimal
          })
          .eq('id', activeRecord.id)
          .select(`
            id,
            employee_id,
            attendance_date,
            check_in,
            check_out,
            status,
            work_mode,
            total_hours,
            created_at,
            updated_at
          `)
          .single();

        if (updateErr) {
          console.error('[DataContext] Error updating checkout in Supabase:', updateErr);
          setIsPunchedIn(false);
          return null;
        }

        const mapped = mapDbAttendanceToUi(updatedData, activeUser);
        setIsPunchedIn(false);
        setAttendance((prev) => [mapped, ...prev.filter((a) => a.id !== mapped.id)]);

        addAuditLog(
          `${activeUser.name} logged out at ${timeStr} (Total Working Hours: ${mapped.workingHours})`,
          'Success',
          'Attendance',
          activeUser.name,
          activeUser.roleTitle || activeUser.role
        );

        return mapped;
      } catch (err) {
        console.error('[DataContext] Unexpected error during Supabase checkout:', err);
        setIsPunchedIn(false);
        return null;
      }
    }

    // Demo / mock mode fallback (exact existing behavior)
    const existingIndex = attendance.findIndex(
      (a) =>
        (a.employeeId === activeUser.id || a.employeeId === activeUser.badgeNumber || a.employeeName === activeUser.name) &&
        (a.dateKey === todayKey || a.dateKey === 'TODAY')
    );

    if (existingIndex === -1) {
      setIsPunchedIn(false);
      return null;
    }

    const record = attendance[existingIndex];
    if (!record.isActive) {
      setIsPunchedIn(false);
      return record;
    }

    const sessions = record.sessions && record.sessions.length > 0
      ? [...record.sessions]
      : [
          {
            sessionId: `SES-${Date.now()}`,
            checkIn: record.checkIn,
            checkInIso: record.checkInIso,
            checkOut: '--',
            durationMinutes: 0
          }
        ];

    const lastSessionIndex = sessions.length - 1;
    const lastSession = sessions[lastSessionIndex];
    const sessionStartIso = lastSession.checkInIso || record.checkInIso || nowIso;
    const sessionDurationMinutes = calculateDurationMinutes(sessionStartIso, nowIso);

    sessions[lastSessionIndex] = {
      ...lastSession,
      checkOut: timeStr,
      checkOutIso: nowIso,
      durationMinutes: sessionDurationMinutes
    };

    const totalMinutes = sessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    const totalWorkingHours = formatDuration(totalMinutes);

    const updatedActivities = [
      ...(record.activities || []),
      { type: 'logout', time: timeStr, timestamp: nowIso }
    ];

    const updatedRecord = {
      ...record,
      checkOut: timeStr,
      checkOutIso: nowIso,
      workingHours: totalWorkingHours,
      totalWorkingMinutes: totalMinutes,
      isActive: false,
      sessions,
      activities: updatedActivities,
      updatedAt: nowIso
    };

    setAttendance((prev) => {
      const next = [...prev];
      next[existingIndex] = updatedRecord;
      return next;
    });

    setIsPunchedIn(false);

    addAuditLog(
      `${activeUser.name} logged out at ${timeStr} (Total Working Hours: ${totalWorkingHours})`,
      'Success',
      'Attendance',
      activeUser.name,
      activeUser.roleTitle || activeUser.role
    );

    return updatedRecord;
  };

  const togglePunchIn = async (userName = 'Tarumani Bharath Raj') => {
    const isUserSupabase = isSupabaseAuth || Boolean(user?.isSupabaseAuth) || Boolean(user?.dbId);
    if (isUserSupabase && user) {
      const todayKey = getLocalDateKey();
      const todayRec = attendance.find(
        (a) => (a.employeeUuid === user.dbId || a.employeeId === user.id) && (a.dateKey === todayKey || a.dateKey === 'TODAY')
      );

      if (todayRec && todayRec.isActive) {
        const res = await recordLogoutAttendance(user);
        return { status: 'out', time: res?.checkOut || formatTime12h() };
      } else {
        const res = await recordLoginAttendance(user);
        return { status: 'in', time: res?.checkIn || formatTime12h() };
      }
    }

    const targetEmp = employees.find((e) => e.name === userName || e.id === userName) || {
      id: 'DGX003',
      name: userName,
      department: 'Technology'
    };

    const todayKey = getLocalDateKey();
    const todayRec = attendance.find(
      (a) => (a.employeeId === targetEmp.id || a.employeeName === targetEmp.name) && (a.dateKey === todayKey || a.dateKey === 'TODAY')
    );

    if (todayRec && todayRec.isActive) {
      const res = recordLogoutAttendance(targetEmp);
      return { status: 'out', time: res?.checkOut || formatTime12h() };
    } else {
      const res = recordLoginAttendance(targetEmp);
      return { status: 'in', time: res?.checkIn || formatTime12h() };
    }
  };

  // Training Curriculum Operations
  const createTraining = async (trainingData, createdBy = 'Priyanka, HR Manager') => {
    if (isSupabaseAuth && isSupabaseConfigured && user?.dbId) {
      try {
        const { data: newTrn, error: trnErr } = await supabase
          .from('training')
          .insert({
            title: trainingData.title,
            description: trainingData.description || '',
            category: trainingData.category || 'Technical',
            instructor: trainingData.instructor || createdBy,
            duration: trainingData.duration || '2.0 hours',
            start_date: trainingData.startDate || new Date().toISOString().split('T')[0],
            end_date: trainingData.endDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
            status: 'upcoming',
            created_by: user.dbId
          })
          .select()
          .single();

        if (trnErr) {
          console.error('[DataContext] Error creating training in Supabase:', trnErr);
          throw trnErr;
        }

        // Determine target employees for assignment
        const { data: dbEmployees } = await supabase
          .from('employees')
          .select('id, employee_id, department')
          .eq('status', 'active');

        let targetEmployees = [];
        if (trainingData.assignmentType === 'all') {
          targetEmployees = dbEmployees || [];
        } else if (trainingData.assignmentType === 'department') {
          const depts = trainingData.assignedDepartments || [];
          targetEmployees = (dbEmployees || []).filter(e => depts.includes(e.department) || depts.includes('all'));
        } else if (trainingData.assignmentType === 'specific') {
          const specificIds = trainingData.assignedEmployees || [];
          targetEmployees = (dbEmployees || []).filter(e => specificIds.includes(e.employee_id) || specificIds.includes(e.id));
        }

        if (targetEmployees.length > 0) {
          const assignmentRows = targetEmployees.map(e => ({
            training_id: newTrn.id,
            employee_id: e.id,
            status: 'assigned',
            completion_percent: 0,
            assigned_at: new Date().toISOString()
          }));
          const { error: asErr } = await supabase.from('training_assignments').insert(assignmentRows);
          if (asErr) {
            console.warn('[DataContext] Warning inserting initial assignments:', asErr);
          }
        }

        addAuditLog(`HR created and published training module "${newTrn.title}" (${newTrn.id})`, 'Success', 'Training');
        await fetchTrainings();
        return mapDbTrainingForHr({ ...newTrn, assignments: [] });
      } catch (err) {
        console.error('[DataContext] Failed to create training in Supabase:', err);
        throw err;
      }
    }

    // Fallback for Demo mode
    const id = `TRN-${Math.floor(200 + Math.random() * 800)}`;
    const newTraining = {
      title: trainingData.title,
      description: trainingData.description || '',
      category: trainingData.category || 'Technical',
      instructor: trainingData.instructor || createdBy,
      duration: trainingData.duration || '2.0 hours',
      startDate: trainingData.startDate || new Date().toISOString().split('T')[0],
      endDate: trainingData.endDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'Active',
      enrolledEmployees: [],
      assignedEmployees: trainingData.assignedEmployees || [],
      assignedDepartments: trainingData.assignedDepartments || [],
      assignmentType: trainingData.assignmentType || 'all',
      isMandatory: !!trainingData.isMandatory,
      completionPercentage: 0,
      progressByEmployee: {},
      createdBy: createdBy,
      createdAt: new Date().toISOString(),
      certificate: trainingData.isMandatory ? `CERT-DX-${id}-COMP` : null,
      ...trainingData,
      id
    };

    setTrainings((prev) => [newTraining, ...prev]);

    // Create Notification for the assigned employees
    const notifId = `NOTIF-${Date.now()}`;
    const newNotif = {
      id: notifId,
      title: 'New Training Assigned',
      message: `"${newTraining.title}" has been assigned to you by ${createdBy}.`,
      author: createdBy,
      targetRole: 'employee',
      targetAssignmentType: newTraining.assignmentType,
      targetEmployees: newTraining.assignedEmployees,
      targetDepartments: newTraining.assignedDepartments,
      link: '/employee/training',
      timestamp: 'Just now',
      read: false,
      createdAt: new Date().toISOString()
    };

    setNotifications((prev) => [newNotif, ...prev]);
    addAuditLog(`HR created and published training module "${newTraining.title}" (${id})`, 'Success', 'Training');
    return newTraining;
  };

  const updateTraining = async (id, updates) => {
    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        const dbUpdates = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.category !== undefined) dbUpdates.category = updates.category;
        if (updates.instructor !== undefined) dbUpdates.instructor = updates.instructor;
        if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
        if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
        if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
        if (updates.status !== undefined) {
          const s = updates.status.toLowerCase();
          if (['upcoming', 'ongoing', 'completed', 'cancelled'].includes(s)) {
            dbUpdates.status = s;
          }
        }

        const { error } = await supabase.from('training').update(dbUpdates).eq('id', id);
        if (error) {
          console.error('[DataContext] Error updating training in Supabase:', error);
          throw error;
        }

        addAuditLog(`Updated training module details (${id})`, 'Success', 'Training');
        await fetchTrainings();
        return;
      } catch (err) {
        console.error('[DataContext] Failed to update training:', err);
        throw err;
      }
    }

    setTrainings((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    addAuditLog(`Updated training module details (${id})`, 'Success', 'Training');
  };

  const deleteTraining = async (id) => {
    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('training').delete().eq('id', id);
        if (error) {
          console.error('[DataContext] Error deleting training in Supabase:', error);
          throw error;
        }
        addAuditLog(`Removed training curriculum (${id})`, 'Warning', 'Training');
        await fetchTrainings();
        return;
      } catch (err) {
        console.error('[DataContext] Failed to delete training:', err);
        throw err;
      }
    }

    setTrainings((prev) => prev.filter((t) => t.id !== id));
    addAuditLog(`Removed training curriculum (${id})`, 'Warning', 'Training');
  };

  const joinTraining = async (courseId, employee) => {
    const isHrOrAdmin =
      user?.role === 'hr' ||
      user?.role === 'admin' ||
      user?.role === 'hr_manager' ||
      user?.dbRole === 'admin' ||
      user?.dbRole === 'hr_manager';

    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        if (isHrOrAdmin && employee) {
          let targetDbId = employee.dbId;
          if (!targetDbId) {
            const empLookup = employee.id || employee;
            const { data: empRecord } = await supabase
              .from('employees')
              .select('id')
              .or(`employee_id.eq.${empLookup},id.eq.${empLookup}`)
              .maybeSingle();
            targetDbId = empRecord?.id;
          }

          if (targetDbId) {
            await supabase.from('training_assignments').upsert({
              training_id: courseId,
              employee_id: targetDbId,
              status: 'in_progress',
              completion_percent: 0,
              assigned_at: new Date().toISOString()
            }, { onConflict: 'training_id, employee_id' });
          }
        } else if (user?.dbId) {
          await supabase
            .from('training_assignments')
            .update({
              status: 'in_progress'
            })
            .eq('training_id', courseId)
            .eq('employee_id', user.dbId);
        }

        const empName = employee?.name || user?.name || 'Employee';
        addAuditLog(`${empName} enrolled in training module (${courseId})`, 'Success', 'Training');
        await fetchTrainings();
        return;
      } catch (err) {
        console.error('[DataContext] Error enrolling in training:', err);
        throw err;
      }
    }

    const empId = employee?.id || 'DGX003';
    const empName = employee?.name || 'Tarumani Bharath Raj';

    setTrainings((prev) =>
      prev.map((t) => {
        if (t.id === courseId) {
          const alreadyEnrolled = t.enrolledEmployees?.some((e) =>
            typeof e === 'string' ? e === empId : e.id === empId
          );
          if (alreadyEnrolled) return t;

          const newEnrolled = [
            ...(t.enrolledEmployees || []),
            {
              id: empId,
              name: empName,
              enrolledDate: new Date().toISOString().split('T')[0],
              progress: 0,
              completedDate: null
            }
          ];
          const newProgressByEmp = {
            ...(t.progressByEmployee || {}),
            [empId]: 0
          };
          return {
            ...t,
            enrolledEmployees: newEnrolled,
            progressByEmployee: newProgressByEmp
          };
        }
        return t;
      })
    );
    addAuditLog(`${empName} enrolled in training module (${courseId})`, 'Success', 'Training');
  };

  const updateTrainingProgress = async (courseId, employeeId = 'DGX003', increment = 25) => {
    let finalProgress = 0;
    if (isSupabaseAuth && isSupabaseConfigured && user?.dbId) {
      try {
        const targetCourse = trainings.find((t) => t.id === courseId);
        const currentProgress = targetCourse?.progressByEmployee?.[employeeId || user.id] ?? targetCourse?.completionPercentage ?? 0;
        const newProgress = Math.min(100, currentProgress + increment);
        finalProgress = newProgress;

        const isCompleted = newProgress === 100;
        const updatePayload = {
          completion_percent: newProgress,
          status: isCompleted ? 'completed' : 'in_progress'
        };
        if (isCompleted) {
          updatePayload.completed_at = new Date().toISOString();
        }

        const isHrOrAdmin =
          user?.role === 'hr' ||
          user?.role === 'admin' ||
          user?.role === 'hr_manager' ||
          user?.dbRole === 'admin' ||
          user?.dbRole === 'hr_manager';

        let targetDbId = user.dbId;
        if (isHrOrAdmin && employeeId && employeeId !== user.id) {
          const { data: targetEmp } = await supabase
            .from('employees')
            .select('id')
            .eq('employee_id', employeeId)
            .maybeSingle();
          if (targetEmp?.id) targetDbId = targetEmp.id;
        }

        const { error } = await supabase
          .from('training_assignments')
          .update(updatePayload)
          .eq('training_id', courseId)
          .eq('employee_id', targetDbId);

        if (error) {
          console.error('[DataContext] Error updating training progress in Supabase:', error);
          throw error;
        }

        await fetchTrainings();
        return finalProgress;
      } catch (err) {
        console.error('[DataContext] Error updating progress:', err);
        throw err;
      }
    }

    setTrainings((prev) =>
      prev.map((t) => {
        if (t.id === courseId) {
          const currentProgress = t.progressByEmployee?.[employeeId] ?? 0;
          const newProgress = Math.min(100, currentProgress + increment);
          finalProgress = newProgress;

          const updatedEnrolled = (t.enrolledEmployees || []).map((e) => {
            const isTarget = typeof e === 'string' ? e === employeeId : e.id === employeeId;
            if (isTarget) {
              const prevObj = typeof e === 'string' ? { id: e, name: 'Tarumani Bharath Raj' } : e;
              return {
                ...prevObj,
                progress: newProgress,
                completedDate: newProgress === 100 ? new Date().toISOString().split('T')[0] : prevObj.completedDate
              };
            }
            return e;
          });

          // Recalculate average completion percentage across all enrolled
          const totalP = updatedEnrolled.reduce((acc, curr) => acc + (curr.progress || 0), 0);
          const avgComp = updatedEnrolled.length ? Math.round(totalP / updatedEnrolled.length) : newProgress;

          return {
            ...t,
            enrolledEmployees: updatedEnrolled,
            progressByEmployee: {
              ...(t.progressByEmployee || {}),
              [employeeId]: newProgress
            },
            completionPercentage: avgComp,
            certificate: newProgress === 100 ? (t.certificate || `CERT-DX-${t.id.replace('TRN-', '')}-${employeeId}`) : t.certificate
          };
        }
        return t;
      })
    );
    return finalProgress;
  };

  // Document Operations & Storage Integration
  // Document Operations & Storage Integration
  const getDocumentDownloadUrl = async (bucket, storagePath) => {
    if (!storagePath) return null;
    if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
      return storagePath;
    }
    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        let targetBucket = bucket;
        if (!targetBucket) {
          if (storagePath.startsWith('policies/') || storagePath.startsWith('company/')) {
            targetBucket = 'company-documents';
          } else {
            targetBucket = 'employee-documents';
          }
        }
        const { data, error } = await supabase.storage
          .from(targetBucket)
          .createSignedUrl(storagePath, 3600);
        if (error) {
          console.warn('[DataContext] Error generating signed URL:', error.message);
          return null;
        }
        return data?.signedUrl || null;
      } catch (err) {
        console.warn('[DataContext] Error in getDocumentDownloadUrl:', err);
        return null;
      }
    }
    return null;
  };

  const uploadCompanyDocument = async ({ file, title, category }) => {
    if (!file || !title?.trim()) {
      throw new Error('Document title and file are required.');
    }
    if (!isSupabaseAuth || !isSupabaseConfigured) {
      throw new Error('Supabase authentication required for document uploads.');
    }

    const fileExt = (file.name.split('.').pop() || '').toLowerCase();
    const ALLOWED_EXTS = ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'doc'];
    const ALLOWED_MIMES = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    const DANGEROUS_EXTS = ['exe', 'sh', 'bat', 'cmd', 'js', 'html', 'htm', 'php', 'phtml', 'py', 'rb', 'svg', 'vbs', 'jar', 'com', 'scr', 'msi'];
    if (DANGEROUS_EXTS.includes(fileExt) || !ALLOWED_EXTS.includes(fileExt)) {
      throw new Error('Unsupported or unsafe file format. Please upload a PDF, PNG, JPG, or Word document (.docx, .doc).');
    }
    if (file.type && !ALLOWED_MIMES.includes(file.type.toLowerCase())) {
      throw new Error('Unsupported MIME type detected. Please upload a valid PDF, PNG, JPG, or Word document.');
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      throw new Error('File size exceeds the 10 MB limit. Please choose a smaller file.');
    }

    const sanitizedFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const storagePath = `policies/${sanitizedFileName}`;

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('company-documents')
      .upload(storagePath, file, {
        contentType: file.type || 'application/pdf',
        upsert: false
      });

    if (uploadErr) {
      throw new Error(`Storage upload failed: ${uploadErr.message}`);
    }

    const sizeInKb = Math.round(file.size / 1024);
    const sizeStr = sizeInKb > 1024 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${sizeInKb} KB`;

    let dbCategory = 'Company Policy';
    const rawCat = (category || '').toLowerCase();
    if (rawCat.includes('benefit')) dbCategory = 'Benefits';
    else if (rawCat.includes('complian')) dbCategory = 'Compliance';
    else if (rawCat.includes('legal')) dbCategory = 'Legal';
    else if (rawCat.includes('general')) dbCategory = 'General';
    else dbCategory = 'Company Policy';

    const payload = {
      title: title.trim(),
      category: dbCategory,
      file_name: file.name,
      file_size: sizeStr,
      file_format: fileExt.toUpperCase() || 'PDF',
      storage_path: uploadData.path,
      uploaded_by: user?.dbId || null,
      is_active: true
    };

    const { data: dbData, error: dbErr } = await supabase
      .from('company_documents')
      .insert(payload)
      .select(`
        id,
        title,
        category,
        file_name,
        file_size,
        file_format,
        storage_path,
        download_url,
        uploaded_by,
        is_active,
        created_at,
        updated_at,
        uploader:employees!uploaded_by (id, name, employee_id)
      `)
      .single();

    if (dbErr) {
      await supabase.storage.from('company-documents').remove([uploadData.path]);
      throw new Error(`Database record creation failed: ${dbErr.message}`);
    }

    const mapped = mapDbCompanyDocumentToUi(dbData);
    setCompanyDocuments((prev) => [mapped, ...prev]);
    addAuditLog(`Uploaded company policy document: "${title.trim()}"`, 'Success', 'Employees');
    return mapped;
  };

  const uploadEmployeeDocument = async ({ file, employeeId, documentType, documentName }) => {
    if (!file) throw new Error('File is required.');
    const targetEmpId = employeeId || user?.dbId;
    if (!targetEmpId) throw new Error('Target employee ID is required.');

    if (!isSupabaseAuth || !isSupabaseConfigured) {
      throw new Error('Supabase authentication required for document uploads.');
    }

    const fileExt = (file.name.split('.').pop() || '').toLowerCase();
    const ALLOWED_EXTS = ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'doc'];
    const ALLOWED_MIMES = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    const DANGEROUS_EXTS = ['exe', 'sh', 'bat', 'cmd', 'js', 'html', 'htm', 'php', 'phtml', 'py', 'rb', 'svg', 'vbs', 'jar', 'com', 'scr', 'msi'];
    if (DANGEROUS_EXTS.includes(fileExt) || !ALLOWED_EXTS.includes(fileExt)) {
      throw new Error('Unsupported or unsafe file format. Please upload a PDF, PNG, JPG, or Word document (.docx, .doc).');
    }
    if (file.type && !ALLOWED_MIMES.includes(file.type.toLowerCase())) {
      throw new Error('Unsupported MIME type detected. Please upload a valid PDF, PNG, JPG, or Word document.');
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      throw new Error('File size exceeds the 10 MB limit. Please choose a smaller file.');
    }

    const sanitizedFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const storagePath = `${targetEmpId}/${sanitizedFileName}`;

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('employee-documents')
      .upload(storagePath, file, {
        contentType: file.type || 'application/pdf',
        upsert: false
      });

    if (uploadErr) {
      throw new Error(`Storage upload failed: ${uploadErr.message}`);
    }

    const payload = {
      employee_id: targetEmpId,
      document_type: documentType || 'other',
      document_name: (documentName || file.name).trim(),
      storage_path: uploadData.path,
      uploaded_by: user?.dbId || null,
      status: 'active'
    };

    const { data: dbData, error: dbErr } = await supabase
      .from('employee_documents')
      .insert(payload)
      .select(`
        id,
        employee_id,
        document_type,
        document_name,
        storage_path,
        document_url,
        uploaded_by,
        status,
        uploaded_at,
        updated_at,
        employee:employees!employee_id (id, employee_id, name, email, department)
      `)
      .single();

    if (dbErr) {
      await supabase.storage.from('employee-documents').remove([uploadData.path]);
      throw new Error(`Database record creation failed: ${dbErr.message}`);
    }

    const mapped = mapDbDocumentToUi(dbData, user);
    setEmployeeDocuments((prev) => [mapped, ...prev]);
    addAuditLog(`Uploaded employee document: "${mapped.name}"`, 'Success', 'Employees');
    return mapped;
  };

  const deleteCompanyDocument = async (docId) => {
    let doc = companyDocuments.find((d) => d.id === docId || d.dbId === docId);
    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        let targetStoragePath = doc?.storagePath;
        let targetTitle = doc?.title;

        // Fallback: If metadata not found in in-memory state, retrieve storage_path from DB before deletion
        if (!targetStoragePath || !targetTitle) {
          const { data: dbRow } = await supabase
            .from('company_documents')
            .select('storage_path, title')
            .eq('id', docId)
            .maybeSingle();
          if (dbRow) {
            targetStoragePath = targetStoragePath || dbRow.storage_path;
            targetTitle = targetTitle || dbRow.title;
          }
        }

        const { data, error: dbErr } = await supabase
          .from('company_documents')
          .delete()
          .eq('id', docId)
          .select();

        if (dbErr) {
          throw new Error(`Failed to delete company document: ${dbErr.message}`);
        }
        if (!data || data.length === 0) {
          throw new Error('Permission denied or company document not found.');
        }

        if (targetStoragePath) {
          const { error: storageErr } = await supabase.storage.from('company-documents').remove([targetStoragePath]);
          if (storageErr) {
            console.warn('[DataContext] Warning removing company document from storage:', storageErr);
          }
        }

        setCompanyDocuments((prev) => prev.filter((d) => d.id !== docId && d.dbId !== docId));
        addAuditLog(`Deleted company document: "${targetTitle || docId}"`, 'Success', 'Employees');
        return true;
      } catch (err) {
        console.error('[DataContext] Error deleting company document:', err);
        throw err;
      }
    } else {
      setCompanyDocuments((prev) => prev.filter((d) => d.id !== docId && d.dbId !== docId));
      return true;
    }
  };

  const deleteEmployeeDocument = async (docId) => {
    let doc = employeeDocuments.find((d) => d.id === docId || d.dbId === docId);
    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        let targetStoragePath = doc?.storagePath;
        let targetDocName = doc?.name;

        // Fallback: If metadata not found in in-memory state, retrieve storage_path from DB before deletion
        if (!targetStoragePath || !targetDocName) {
          const { data: dbRow } = await supabase
            .from('employee_documents')
            .select('storage_path, document_name')
            .eq('id', docId)
            .maybeSingle();
          if (dbRow) {
            targetStoragePath = targetStoragePath || dbRow.storage_path;
            targetDocName = targetDocName || dbRow.document_name;
          }
        }

        const { data, error: dbErr } = await supabase
          .from('employee_documents')
          .delete()
          .eq('id', docId)
          .select();

        if (dbErr) {
          throw new Error(`Failed to delete employee document: ${dbErr.message}`);
        }
        if (!data || data.length === 0) {
          throw new Error('Permission denied or employee document not found.');
        }

        if (targetStoragePath) {
          const { error: storageErr } = await supabase.storage.from('employee-documents').remove([targetStoragePath]);
          if (storageErr) {
            console.warn('[DataContext] Warning removing employee document from storage:', storageErr);
          }
        }

        setEmployeeDocuments((prev) => prev.filter((d) => d.id !== docId && d.dbId !== docId));
        addAuditLog(`Deleted employee document: "${targetDocName || docId}"`, 'Success', 'Employees');
        return true;
      } catch (err) {
        console.error('[DataContext] Error deleting employee document:', err);
        throw err;
      }
    } else {
      setEmployeeDocuments((prev) => prev.filter((d) => d.id !== docId && d.dbId !== docId));
      return true;
    }
  };

  // Notifications Operations
  const addNotification = async (notif) => {
    let recipientUuid = notif.recipient_employee_id || notif.recipientEmployeeId;
    if (!recipientUuid && notif.targetEmployees && notif.targetEmployees.length > 0) {
      const targetEmp = notif.targetEmployees[0];
      const match = employees.find((e) => e.id === targetEmp || e.dbId === targetEmp);
      if (match?.dbId) recipientUuid = match.dbId;
      else if (typeof targetEmp === 'string' && targetEmp.length === 36) recipientUuid = targetEmp;
    }

    let targetRole = notif.target_role || notif.targetRole || null;
    if (targetRole === 'hr') targetRole = 'hr_manager';
    if (targetRole && !['all', 'employee', 'hr_manager', 'admin'].includes(targetRole)) {
      targetRole = null;
    }

    // Prevent duplicate notification creation within 5 seconds
    const isDuplicate = notifications.some(
      (n) =>
        n.title === notif.title &&
        n.message === notif.message &&
        (n.recipientEmployeeId === recipientUuid || (!n.recipientEmployeeId && !recipientUuid)) &&
        Math.abs(Date.now() - new Date(n.createdAt || Date.now()).getTime()) < 5000
    );
    if (isDuplicate) {
      console.log('[DataContext] Ignored duplicate notification creation:', notif.title);
      return null;
    }

    const payload = {
      title: notif.title,
      message: notif.message,
      recipient_employee_id: recipientUuid || null,
      target_role: targetRole,
      target_department: notif.target_department || notif.targetDepartment || null,
      action_url: notif.action_url || notif.link || null,
      is_read: false
    };

    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .insert(payload)
          .select()
          .single();

        if (error) {
          console.warn('[DataContext] Notice: notification insert restricted by RLS (non-HR/Admin role):', error.message);
          const id = `NOTIF-${Date.now()}`;
          const uiNotif = {
            id,
            timestamp: 'Just now',
            read: false,
            is_read: false,
            ...notif
          };
          setNotifications((prev) => [uiNotif, ...prev]);
          return uiNotif;
        }

        const mapped = mapDbNotificationToUi(data);
        setNotifications((prev) => [mapped, ...prev.filter((n) => n.id !== mapped.id)]);
        return mapped;
      } catch (err) {
        console.warn('[DataContext] Error in addNotification:', err);
      }
    }

    const id = `NOTIF-${Date.now()}`;
    const newNotif = {
      id,
      timestamp: 'Just now',
      read: false,
      is_read: false,
      ...notif
    };
    setNotifications((prev) => [newNotif, ...prev]);
    return newNotif;
  };

  const markNotificationRead = async (id) => {
    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', id)
          .select();

        if (error) {
          console.warn('[DataContext] Failed to mark notification read in Supabase:', error.message);
          throw error;
        }
        if (!data || data.length === 0) {
          console.warn('[DataContext] Notification read update not permitted or record not found');
          return false;
        }
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true, is_read: true } : n))
        );
        return true;
      } catch (err) {
        console.warn('[DataContext] Error updating notification to read:', err);
        throw err;
      }
    } else {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, is_read: true } : n))
      );
      return true;
    }
  };

  const markNotificationUnread = async (id) => {
    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .update({ is_read: false })
          .eq('id', id)
          .select();

        if (error) {
          console.warn('[DataContext] Failed to mark notification unread in Supabase:', error.message);
          throw error;
        }
        if (!data || data.length === 0) {
          console.warn('[DataContext] Notification unread update not permitted or record not found');
          return false;
        }
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: false, is_read: false } : n))
        );
        return true;
      } catch (err) {
        console.warn('[DataContext] Error updating notification to unread:', err);
        throw err;
      }
    } else {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: false, is_read: false } : n))
      );
      return true;
    }
  };

  const markAllNotificationsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return true;

    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .in('id', unreadIds)
          .select();

        if (error) {
          console.warn('[DataContext] Failed to mark all notifications read in Supabase:', error.message);
          throw error;
        }
        const updatedIds = new Set((data || []).map((r) => r.id));
        setNotifications((prev) =>
          prev.map((n) => (updatedIds.has(n.id) ? { ...n, read: true, is_read: true } : n))
        );
        return true;
      } catch (err) {
        console.warn('[DataContext] Error updating all notifications:', err);
        throw err;
      }
    } else {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, is_read: true })));
      return true;
    }
  };

  const deleteNotification = async (notifId) => {
    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .delete()
          .eq('id', notifId)
          .select();

        if (error) {
          console.warn('[DataContext] Error deleting notification from Supabase:', error.message);
          throw error;
        }
        if (!data || data.length === 0) {
          console.warn('[DataContext] Notification was not deleted (unauthorized or not found)');
          return false;
        }
        setNotifications((prev) => prev.filter((n) => n.id !== notifId));
        return true;
      } catch (err) {
        console.warn('[DataContext] Error deleting notification:', err);
        throw err;
      }
    } else {
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      return true;
    }
  };

  const submitLeaveRequest = async (req) => {
    if (isSupabaseAuth && user?.dbId) {
      if (!req.startDate || !req.endDate) {
        throw new Error('Start date and end date are required.');
      }
      if (req.endDate < req.startDate) {
        throw new Error('End date cannot be earlier than start date.');
      }

      const dbType = normalizeDbLeaveType(req.type || req.leaveType);
      const dbPayload = {
        employee_id: user.dbId,
        leave_type: dbType,
        start_date: req.startDate,
        end_date: req.endDate,
        reason: req.reason?.trim() || 'Personal time-off request',
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('leave_requests')
        .insert(dbPayload)
        .select()
        .single();

      if (error) {
        console.error('[DataContext] Error inserting leave request:', error);
        throw new Error(error.message || 'Failed to submit leave request to Supabase.');
      }

      const mapped = mapDbLeaveRequestToUi(data, user);
      setLeaveRequests((prev) => [mapped, ...prev.filter((r) => r.id !== mapped.id)]);
      addAuditLog(`Submitted leave request (${mapped.displayId}) for ${user.name}: ${mapped.type}`, 'Success', 'Leave');
      return mapped;
    }

    // Demo/LocalStorage fallback
    const id = `LR-${Math.floor(900 + Math.random() * 100)}`;
    const newReq = {
      id,
      displayId: id,
      status: 'Pending',
      appliedDate: new Date().toISOString().split('T')[0],
      managerNote: '',
      ...req
    };
    setLeaveRequests((prev) => [newReq, ...prev]);
    addAuditLog(`Submitted leave request ${id} for ${newReq.employeeName}`, 'Success', 'Leave');
    return newReq;
  };

  const updateLeaveStatus = async (id, newStatus, managerNote = '') => {
    if (isSupabaseAuth) {
      const targetReq = leaveRequests.find((r) => r.id === id || r.rawId === id);
      if (!targetReq) {
        throw new Error(`Leave request (${id}) was not found.`);
      }

      const normalizedStatus = newStatus.toLowerCase();
      const reviewerUuid = user?.dbId || null;
      const nowIso = new Date().toISOString();
      const commentText = managerNote?.trim() || (normalizedStatus === 'approved' ? 'Approved by People Operations.' : 'Declined due to coverage constraints.');

      // 1. Update leave_requests row
      const { error: reqUpErr } = await supabase
        .from('leave_requests')
        .update({
          status: normalizedStatus,
          approved_by: reviewerUuid,
          approved_at: nowIso,
          hr_comment: commentText
        })
        .eq('id', targetReq.rawId || targetReq.id);

      if (reqUpErr) {
        console.error('[DataContext] Error updating leave request status:', reqUpErr);
        throw new Error(reqUpErr.message || 'Failed to update leave request in Supabase.');
      }

      // 2. If approved, update leave_balances in Supabase
      if (normalizedStatus === 'approved') {
        try {
          const reqYear = targetReq.startDate ? new Date(targetReq.startDate).getFullYear() : new Date().getFullYear();
          const empUuid = targetReq.employeeUuid || targetReq.employee_id;
          const leaveCategory = targetReq.dbLeaveType || normalizeDbLeaveType(targetReq.type);
          const daysCount = Number(targetReq.days) || 1;

          const { data: balRow } = await supabase
            .from('leave_balances')
            .select('*')
            .eq('employee_id', empUuid)
            .eq('leave_type', leaveCategory)
            .eq('year', reqYear)
            .maybeSingle();

          if (balRow) {
            const updatedUsed = Number(balRow.used_days) + daysCount;
            const updatedRemaining = Math.max(0, Number(balRow.total_days) - updatedUsed);

            const { error: balUpErr } = await supabase
              .from('leave_balances')
              .update({
                used_days: updatedUsed,
                remaining_days: updatedRemaining
              })
              .eq('id', balRow.id);

            if (balUpErr) {
              console.warn('[DataContext] Error updating leave balance:', balUpErr);
            }
          }
        } catch (balErr) {
          console.warn('[DataContext] Failed to adjust leave balance:', balErr);
        }
      }

      // 3. Refresh live data
      await fetchLeaveRequests();
      await fetchLeaveBalances();

      addAuditLog(`Leave request ${targetReq.displayId || id} marked as ${newStatus} by ${user?.name || 'HR'}`, 'Success', 'Leave');
      return;
    }

    // Demo/LocalStorage fallback
    setLeaveRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus, managerNote } : r))
    );
    addAuditLog(`Leave request ${id} marked as ${newStatus}`, 'Success', 'Leave');
  };

  const updateCandidateStage = async (candidateId, newStage) => {
    const current = candidates.find((c) => c.id === candidateId || c.code === candidateId);
    if (!current) return;

    if (isSupabaseAuth && isSupabaseConfigured) {
      setCandidates((prev) =>
        prev.map((c) => (c.id === current.id ? { ...c, stage: newStage } : c))
      );

      try {
        const { error } = await supabase
          .from('candidates')
          .update({ stage: newStage })
          .eq('id', current.id);

        if (error) {
          console.error('[DataContext] Error updating candidate stage in Supabase:', error);
          setCandidates((prev) =>
            prev.map((c) => (c.id === current.id ? current : c))
          );
          throw error;
        }

        addAuditLog(`Updated candidate ${current.name} stage to ${newStage}`, 'Success', 'Recruitment');
      } catch (err) {
        setCandidates((prev) =>
          prev.map((c) => (c.id === current.id ? current : c))
        );
        throw err;
      }
    } else {
      setCandidates((prev) =>
        prev.map((c) => (c.id === candidateId ? { ...c, stage: newStage } : c))
      );
      addAuditLog(`Updated candidate ${current.name} stage to ${newStage}`, 'Success', 'Recruitment');
    }
  };

  const addCandidate = async (cand) => {
    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        const candidateCode =
          cand.code ||
          cand.candidateCode ||
          `REC-${Math.floor(1000 + Math.random() * 9000)}`;

        const dbPayload = {
          candidate_code: candidateCode,
          name: (cand.name || '').trim(),
          email: (cand.email || '').trim(),
          phone: cand.phone?.trim() || null,
          role_applied: (cand.roleApplied || cand.role_applied || '').trim(),
          department: cand.department || 'Technology',
          stage: cand.stage || 'Applied',
          rating: cand.rating !== undefined && cand.rating !== null ? Number(cand.rating) : 4.5,
          experience: cand.experience || '3 years',
          current_company: cand.currentCompany || cand.current_company || 'Confidential',
          salary_expectation: cand.salaryExpectation || cand.salary_expectation || null,
          interviewer_id: cand.interviewerId || cand.interviewer_id || null,
          applied_date: cand.appliedDate || cand.applied_date || new Date().toISOString().split('T')[0]
        };

        const { data, error } = await supabase
          .from('candidates')
          .insert(dbPayload)
          .select(`
            id,
            candidate_code,
            name,
            email,
            phone,
            role_applied,
            department,
            stage,
            rating,
            experience,
            current_company,
            salary_expectation,
            interviewer_id,
            resume_url,
            applied_date,
            created_at,
            updated_at,
            interviewer:employees!interviewer_id (id, employee_id, name)
          `)
          .single();

        if (error) {
          console.error('[DataContext] Error creating candidate in Supabase:', error);
          throw error;
        }

        const uiCand = mapDbCandidateToUi(data);
        setCandidates((prev) => [uiCand, ...prev]);
        addAuditLog(`New candidate registered: ${uiCand.name} (${uiCand.code})`, 'Success', 'Recruitment');
        return uiCand;
      } catch (err) {
        console.error('[DataContext] Failed to create candidate in Supabase:', err);
        throw err;
      }
    } else {
      const id = `REC-${Math.floor(400 + Math.random() * 200)}`;
      const newCand = {
        id,
        code: id,
        stage: 'Applied',
        rating: 4.5,
        appliedDate: new Date().toISOString().split('T')[0],
        ...cand
      };
      setCandidates((prev) => [newCand, ...prev]);
      addAuditLog(`New candidate registered: ${newCand.name}`, 'Success', 'Recruitment');
      return newCand;
    }
  };

  const updateCandidate = async (candidateId, updates) => {
    const current = candidates.find((c) => c.id === candidateId || c.code === candidateId);
    if (!current) return;

    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        const dbPayload = {};
        if (updates.name !== undefined) dbPayload.name = updates.name.trim();
        if (updates.email !== undefined) dbPayload.email = updates.email.trim();
        if (updates.phone !== undefined) dbPayload.phone = updates.phone.trim();
        if (updates.roleApplied !== undefined) dbPayload.role_applied = updates.roleApplied.trim();
        if (updates.role_applied !== undefined) dbPayload.role_applied = updates.role_applied.trim();
        if (updates.department !== undefined) dbPayload.department = updates.department;
        if (updates.stage !== undefined) dbPayload.stage = updates.stage;
        if (updates.rating !== undefined) dbPayload.rating = Number(updates.rating);
        if (updates.experience !== undefined) dbPayload.experience = updates.experience;
        if (updates.currentCompany !== undefined) dbPayload.current_company = updates.currentCompany;
        if (updates.salaryExpectation !== undefined) dbPayload.salary_expectation = updates.salaryExpectation;
        if (updates.interviewerId !== undefined) dbPayload.interviewer_id = updates.interviewerId;

        const { error } = await supabase.from('candidates').update(dbPayload).eq('id', current.id);
        if (error) throw error;

        await fetchCandidates();
        addAuditLog(`Updated candidate ${current.name}`, 'Success', 'Recruitment');
      } catch (err) {
        console.error('[DataContext] Error updating candidate in Supabase:', err);
        throw err;
      }
    } else {
      setCandidates((prev) =>
        prev.map((c) => (c.id === candidateId ? { ...c, ...updates } : c))
      );
    }
  };

  const deleteCandidate = async (candidateId) => {
    const current = candidates.find((c) => c.id === candidateId || c.code === candidateId);
    if (!current) return;

    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('candidates').delete().eq('id', current.id);
        if (error) throw error;

        setCandidates((prev) => prev.filter((c) => c.id !== current.id));
        addAuditLog(`Deleted candidate ${current.name}`, 'Success', 'Recruitment');
      } catch (err) {
        console.error('[DataContext] Error deleting candidate from Supabase:', err);
        throw err;
      }
    } else {
      setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
    }
  };

  const addAnnouncement = async (ann) => {
    let authorId = ann.authorId || user?.dbId;
    if (!authorId && employees && employees.length > 0) {
      const match = employees.find(e => e.id === user?.id || e.email === user?.email);
      if (match?.dbId) authorId = match.dbId;
    }

    // Category mapping to valid DB check constraint: ('Company News', 'HR', 'Policy', 'Events', 'Leadership', 'General')
    let dbCategory = 'General';
    const rawCat = (ann.category || '').toLowerCase();
    if (rawCat.includes('hr')) dbCategory = 'HR';
    else if (rawCat.includes('policy')) dbCategory = 'Policy';
    else if (rawCat.includes('event')) dbCategory = 'Events';
    else if (rawCat.includes('leader')) dbCategory = 'Leadership';
    else if (rawCat.includes('company')) dbCategory = 'Company News';
    else dbCategory = 'General';

    // Priority mapping ('low', 'medium', 'high', 'urgent')
    let dbPriority = (ann.priority || 'medium').toLowerCase();
    if (!['low', 'medium', 'high', 'urgent'].includes(dbPriority)) {
      dbPriority = 'medium';
    }

    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        const payload = {
          title: ann.title,
          content: ann.content,
          category: dbCategory,
          priority: dbPriority,
          author_id: authorId || null,
          target_audience: ann.targetAudience || ann.target_audience || 'All Employees',
          is_pinned: Boolean(ann.isPinned || ann.is_pinned),
          published_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('announcements')
          .insert(payload)
          .select(`
            id,
            title,
            content,
            category,
            priority,
            author_id,
            target_audience,
            is_pinned,
            published_at,
            created_at,
            updated_at,
            author:employees!author_id (id, employee_id, name, designation, department)
          `)
          .single();

        if (error) {
          console.error('[DataContext] Failed to create announcement in Supabase:', error);
          throw error;
        }

        const mapped = mapDbAnnouncementToUi(data);
        setAnnouncements((prev) => [mapped, ...prev.filter(a => a.id !== mapped.id)]);
        addAuditLog(`Published announcement: "${mapped.title}"`, 'Success', 'Admin');
        return mapped;
      } catch (err) {
        console.warn('[DataContext] Error adding announcement to Supabase:', err);
        throw err;
      }
    } else {
      const id = `ANN-${Math.floor(200 + Math.random() * 200)}`;
      const newAnn = {
        id,
        date: new Date().toISOString().split('T')[0],
        read: false,
        priority: dbPriority,
        category: dbCategory,
        author: ann.author || (user?.name ? `${user.name} (${user.roleTitle || user.role})` : 'Priyanka (HR Manager)'),
        authorRole: ann.authorRole || user?.roleTitle || 'HR Operations',
        targetAudience: ann.targetAudience || 'All Employees',
        isPinned: false,
        ...ann
      };
      setAnnouncements((prev) => [newAnn, ...prev]);
      addAuditLog(`Published announcement: "${newAnn.title}"`, 'Success', 'Admin');
      return newAnn;
    }
  };

  const updateAnnouncement = async (id, updates) => {
    let dbCategory = undefined;
    if (updates.category) {
      const rawCat = updates.category.toLowerCase();
      if (rawCat.includes('hr')) dbCategory = 'HR';
      else if (rawCat.includes('policy')) dbCategory = 'Policy';
      else if (rawCat.includes('event')) dbCategory = 'Events';
      else if (rawCat.includes('leader')) dbCategory = 'Leadership';
      else if (rawCat.includes('company')) dbCategory = 'Company News';
      else dbCategory = 'General';
    }

    let dbPriority = undefined;
    if (updates.priority) {
      dbPriority = updates.priority.toLowerCase();
      if (!['low', 'medium', 'high', 'urgent'].includes(dbPriority)) {
        dbPriority = 'medium';
      }
    }

    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        const payload = {
          updated_at: new Date().toISOString()
        };
        if (updates.title !== undefined) payload.title = updates.title;
        if (updates.content !== undefined) payload.content = updates.content;
        if (dbCategory !== undefined) payload.category = dbCategory;
        if (dbPriority !== undefined) payload.priority = dbPriority;
        if (updates.targetAudience !== undefined || updates.target_audience !== undefined) {
          payload.target_audience = updates.targetAudience || updates.target_audience;
        }
        if (updates.isPinned !== undefined || updates.is_pinned !== undefined) {
          payload.is_pinned = Boolean(updates.isPinned || updates.is_pinned);
        }

        const { data, error } = await supabase
          .from('announcements')
          .update(payload)
          .eq('id', id)
          .select(`
            id,
            title,
            content,
            category,
            priority,
            author_id,
            target_audience,
            is_pinned,
            published_at,
            created_at,
            updated_at,
            author:employees!author_id (id, employee_id, name, designation, department)
          `)
          .single();

        if (error) {
          console.error('[DataContext] Failed to update announcement in Supabase:', error);
          throw error;
        }

        const mapped = mapDbAnnouncementToUi(data);
        setAnnouncements((prev) => prev.map((a) => (a.id === id ? mapped : a)));
        addAuditLog(`Updated announcement: "${mapped.title}"`, 'Success', 'Admin');
        return mapped;
      } catch (err) {
        console.warn('[DataContext] Error updating announcement in Supabase:', err);
        throw err;
      }
    } else {
      setAnnouncements((prev) =>
        prev.map((a) => {
          if (a.id === id) {
            return {
              ...a,
              ...updates,
              category: dbCategory || a.category,
              priority: dbPriority || a.priority
            };
          }
          return a;
        })
      );
      addAuditLog(`Updated announcement: "${updates.title || id}"`, 'Success', 'Admin');
      return { id, ...updates };
    }
  };

  const deleteAnnouncement = async (announcementId) => {
    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('announcements')
          .delete()
          .eq('id', announcementId);
        if (error) throw error;
        setAnnouncements((prev) => prev.filter(a => a.id !== announcementId));
        addAuditLog(`Deleted announcement: ${announcementId}`, 'Warning', 'Admin');
        return true;
      } catch (err) {
        console.error('[DataContext] Error deleting announcement:', err);
        throw err;
      }
    } else {
      setAnnouncements((prev) => prev.filter(a => a.id !== announcementId));
      addAuditLog(`Deleted announcement: ${announcementId}`, 'Warning', 'Admin');
      return true;
    }
  };

  const markAnnouncementRead = (id) => {
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, read: true } : a))
    );
  };

  const createOnboardingChecklist = async ({ employeeId, buddyId, cohortName, checklistItems }) => {
    const nowIso = new Date().toISOString();
    const items = checklistItems && checklistItems.length > 0 ? checklistItems.map(item => ({
      ...item,
      done: Boolean(item.done || item.completed),
      completed: Boolean(item.done || item.completed),
      completed_at: (item.done || item.completed) ? (item.completed_at || nowIso) : null
    })) : [
      { id: 'task-1', title: 'Provision MacBook Pro & YubiKey Hardware', done: true, completed: true, completed_at: nowIso },
      { id: 'task-2', title: 'Grant Google Workspace & Slack Enterprise Access', done: true, completed: true, completed_at: nowIso },
      { id: 'task-3', title: 'Assign Corporate Mentor / Buddy', done: true, completed: true, completed_at: nowIso },
      { id: 'task-4', title: 'Complete SOC2 & InfoSec Mandatory Training', done: false, completed: false, completed_at: null },
      { id: 'task-5', title: '30-Day Manager Performance Alignment Check-in', done: false, completed: false, completed_at: null }
    ];
    const completedCount = items.filter(i => i.done || i.completed).length;
    const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
    const status = progress === 100 ? 'completed' : (progress > 0 ? 'in_progress' : 'not_started');

    if (isSupabaseAuth && isSupabaseConfigured) {
      const payload = {
        employee_id: employeeId,
        buddy_id: buddyId || null,
        cohort_name: cohortName || 'Orientation Cohort',
        progress,
        status,
        checklist_items: items
      };

      const { data, error } = await supabase
        .from('onboarding_checklists')
        .insert(payload)
        .select(`
          id,
          employee_id,
          buddy_id,
          cohort_name,
          progress,
          status,
          checklist_items,
          created_at,
          updated_at,
          employee:employees!employee_id (id, employee_id, name, department, designation, joining_date),
          buddy:employees!buddy_id (id, employee_id, name, department, designation)
        `)
        .single();

      if (error) {
        console.error('[DataContext] Error creating onboarding checklist:', error);
        throw error;
      }
      const mapped = mapDbOnboardingToUi(data);
      setOnboarding(prev => [mapped, ...prev.filter(o => o.id !== mapped.id && o.dbId !== mapped.id)]);
      addAuditLog(`Created onboarding checklist for: ${mapped.employeeName}`, 'Success', 'Onboarding');
      return mapped;
    } else {
      const newRecord = {
        id: `ONB-${Date.now()}`,
        employeeName: 'New Hire',
        role: 'Associate Developer',
        department: 'Engineering',
        joinDate: new Date().toISOString().split('T')[0],
        buddy: 'Assigned Buddy',
        cohort: cohortName || 'Orientation Cohort',
        progress,
        status,
        tasksCompleted: completedCount,
        totalTasks: items.length,
        checklistItems: items
      };
      setOnboarding(prev => [newRecord, ...prev]);
      addAuditLog(`Created onboarding checklist for: ${newRecord.employeeName}`, 'Success', 'Onboarding');
      return newRecord;
    }
  };

  const updateOnboardingChecklist = async ({ id, checklistItems, progress, status, cohortName, buddyId }) => {
    let calculatedProgress = progress;
    let newStatus = status;

    if (checklistItems && Array.isArray(checklistItems)) {
      const completedCount = checklistItems.filter(i => i.done || i.completed).length;
      calculatedProgress = checklistItems.length > 0 ? Math.round((completedCount / checklistItems.length) * 100) : 0;
      if (!newStatus) {
        newStatus = calculatedProgress === 100 ? 'completed' : (calculatedProgress > 0 ? 'in_progress' : 'not_started');
      }
    }

    if (isSupabaseAuth && isSupabaseConfigured) {
      const updates = {
        updated_at: new Date().toISOString()
      };
      if (checklistItems !== undefined) updates.checklist_items = checklistItems;
      if (calculatedProgress !== undefined) updates.progress = calculatedProgress;
      if (newStatus !== undefined) updates.status = newStatus;
      if (cohortName !== undefined) updates.cohort_name = cohortName;
      if (buddyId !== undefined) updates.buddy_id = buddyId;

      const { data, error } = await supabase
        .from('onboarding_checklists')
        .update(updates)
        .eq('id', id)
        .select(`
          id,
          employee_id,
          buddy_id,
          cohort_name,
          progress,
          status,
          checklist_items,
          created_at,
          updated_at,
          employee:employees!employee_id (id, employee_id, name, department, designation, joining_date),
          buddy:employees!buddy_id (id, employee_id, name, department, designation)
        `)
        .single();

      if (error) {
        console.error('[DataContext] Error updating onboarding checklist:', error);
        throw error;
      }
      const mapped = mapDbOnboardingToUi(data);
      setOnboarding(prev => prev.map(o => (o.id === id || o.dbId === id) ? mapped : o));
      addAuditLog(`Updated onboarding checklist progress to ${mapped.progress}%`, 'Success', 'Onboarding');
      return mapped;
    } else {
      setOnboarding(prev => prev.map(o => {
        if (o.id === id || o.dbId === id) {
          const items = checklistItems || o.checklistItems || [];
          const completedCount = items.filter(i => i.done || i.completed).length;
          return {
            ...o,
            checklistItems: items,
            progress: calculatedProgress !== undefined ? calculatedProgress : o.progress,
            status: newStatus || o.status,
            tasksCompleted: completedCount,
            totalTasks: items.length
          };
        }
        return o;
      }));
      addAuditLog(`Updated onboarding checklist progress`, 'Success', 'Onboarding');
    }
  };

  const toggleOnboardingTask = async (checklistId, taskId) => {
    let checklist = onboarding.find((o) => o.id === checklistId || o.dbId === checklistId);
    if (!checklist && isSupabaseAuth && isSupabaseConfigured) {
      const { data } = await supabase.from('onboarding_checklists').select('*').eq('id', checklistId).single();
      if (data) {
        checklist = mapDbOnboardingToUi(data);
      }
    }
    if (!checklist) throw new Error('Onboarding checklist not found.');
    const items = checklist.checklistItems || [];
    const updatedItems = items.map((item) => {
      if (item.id === taskId || String(item.id) === String(taskId)) {
        const isDone = !(item.done || item.completed);
        return {
          ...item,
          done: isDone,
          completed: isDone,
          completed_at: isDone ? new Date().toISOString() : null
        };
      }
      return item;
    });
    return updateOnboardingChecklist({
      id: checklistId,
      checklistItems: updatedItems
    });
  };

  const deleteOnboardingChecklist = async (id) => {
    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('onboarding_checklists')
          .delete()
          .eq('id', id)
          .select();

        if (error) {
          throw new Error(`Failed to delete onboarding checklist: ${error.message}`);
        }
        if (!data || data.length === 0) {
          throw new Error('Permission denied or onboarding record not found.');
        }

        setOnboarding(prev => prev.filter(o => o.id !== id));
        addAuditLog(`Deleted onboarding record`, 'Success', 'Onboarding');
        return true;
      } catch (err) {
        console.error('[DataContext] Error deleting onboarding checklist:', err);
        throw err;
      }
    } else {
      setOnboarding(prev => prev.filter(o => o.id !== id));
      return true;
    }
  };

  const VALID_AUDIT_MODULES = [
    'Employees', 'Attendance', 'Leave', 'Training', 'Recruitment',
    'Profile', 'Onboarding', 'Projects', 'Tasks', 'Security', 'Admin', 'System'
  ];

  const normalizeAuditModule = (mod) => {
    if (!mod) return 'System';
    if (VALID_AUDIT_MODULES.includes(mod)) return mod;
    const lower = String(mod).toLowerCase();
    if (lower.includes('announcement')) return 'Admin';
    if (lower.includes('doc')) return 'Employees';
    if (lower.includes('log') || lower.includes('auth')) return 'Security';
    if (lower.includes('leave')) return 'Leave';
    if (lower.includes('attend')) return 'Attendance';
    if (lower.includes('train')) return 'Training';
    if (lower.includes('recruit') || lower.includes('cand')) return 'Recruitment';
    if (lower.includes('onboard')) return 'Onboarding';
    if (lower.includes('project')) return 'Projects';
    if (lower.includes('task')) return 'Tasks';
    if (lower.includes('profile')) return 'Profile';
    if (lower.includes('employee') || lower.includes('staff')) return 'Employees';
    if (lower.includes('admin') || lower.includes('setting')) return 'Admin';
    return 'System';
  };

  const normalizeAuditStatus = (st) => {
    if (!st) return 'Success';
    const cap = String(st).charAt(0).toUpperCase() + String(st).slice(1).toLowerCase();
    if (['Success', 'Warning', 'Failed'].includes(cap)) return cap;
    return 'Success';
  };

  const addAuditLog = async (action, status = 'Success', module = 'System', customUser = null, customRole = null, details = null) => {
    const normMod = normalizeAuditModule(module);
    const normStat = normalizeAuditStatus(status);
    const actorName = customUser || user?.name || 'System User';
    const actorRole = customRole || user?.roleTitle || user?.role || 'user';
    const actorEmployeeId = user?.dbId || null;
    const nowIso = new Date().toISOString();

    const localLog = {
      id: `LOG-${Date.now()}`,
      dbId: `LOG-${Date.now()}`,
      user: actorName,
      actorName,
      role: actorRole,
      action,
      ip: '192.168.1.100',
      ipAddress: '192.168.1.100',
      timestamp: nowIso.replace('T', ' ').substring(0, 19),
      createdAt: nowIso,
      status: normStat,
      module: normMod,
      details: details || null
    };

    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        const payload = {
          actor_employee_id: actorEmployeeId,
          actor_name: actorName,
          role: actorRole,
          action,
          module: normMod,
          status: normStat,
          ip_address: '192.168.1.100',
          details: details || null
        };

        const { error } = await supabase
          .from('audit_logs')
          .insert(payload);

        if (error) {
          console.warn('[DataContext] Error inserting audit log to Supabase:', error.message);
        }
      } catch (err) {
        console.warn('[DataContext] Unexpected error recording audit log:', err);
      }
    }

    setAuditLogs((prev) => [localLog, ...prev.slice(0, 199)]);
    return localLog;
  };

  const updateSystemSettings = async (updates) => {
    const nextSettings = { ...systemSettings, ...updates };
    setSystemSettings(nextSettings);

    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            config_key: 'system_settings',
            config_value: nextSettings,
            is_public: true,
            updated_by: user?.dbId || null
          }, { onConflict: 'config_key' });

        if (error) {
          console.error('[DataContext] Error updating system_settings in Supabase:', error);
          throw error;
        }

        addAuditLog('System settings configuration updated', 'Success', 'Admin', null, null, { updates });
        return true;
      } catch (err) {
        console.error('[DataContext] System settings update failed:', err);
        throw err;
      }
    } else {
      addAuditLog('System settings configuration updated', 'Success', 'Admin');
      return true;
    }
  };

  const toggleRolePermission = (moduleIndex, roleKey, permKey) => {
    setRolePermissions((prev) => {
      const next = [...prev];
      const currentVal = next[moduleIndex][roleKey][permKey];
      next[moduleIndex] = {
        ...next[moduleIndex],
        [roleKey]: {
          ...next[moduleIndex][roleKey],
          [permKey]: !currentVal
        }
      };
      return next;
    });
  };

  const saveRolePermissions = async (customPermissions = null) => {
    const permissionsToSave = customPermissions || rolePermissions;
    if (customPermissions) {
      setRolePermissions(customPermissions);
    }

    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            config_key: 'role_permissions',
            config_value: permissionsToSave,
            is_public: false,
            updated_by: user?.dbId || null
          }, { onConflict: 'config_key' });

        if (error) {
          console.error('[DataContext] Error updating role_permissions in Supabase:', error);
          throw error;
        }

        addAuditLog('Updated role access control (RBAC) permissions', 'Success', 'Security', null, null, {
          modulesConfigured: permissionsToSave.length
        });
        return true;
      } catch (err) {
        console.error('[DataContext] Role permissions update failed:', err);
        throw err;
      }
    } else {
      addAuditLog('Updated role access control (RBAC) permissions', 'Success', 'Security');
      return true;
    }
  };

  const updateLeavePolicyQuotas = async (updates) => {
    const nextQuotas = { ...leavePolicyQuotas, ...updates };
    setLeavePolicyQuotas(nextQuotas);

    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('system_settings')
          .update({
            config_value: nextQuotas,
            updated_by: user?.dbId || null
          })
          .eq('config_key', 'leave_policy_quotas');

        if (error) {
          console.error('[DataContext] Error updating leave_policy_quotas in Supabase:', error);
          throw error;
        }

        addAuditLog('HR updated leave quota policies', 'Success', 'Leave', null, null, { quotas: nextQuotas });
        return true;
      } catch (err) {
        console.error('[DataContext] Leave quota update failed:', err);
        throw err;
      }
    } else {
      addAuditLog('HR updated leave quota policies', 'Success', 'Leave');
      return true;
    }
  };

  const submitProfileRequest = async (req) => {
    if (isSupabaseAuth && user?.dbId) {
      const dbPayload = {
        employee_id: user.dbId,
        field_name: req.field,
        current_value: req.currentValue || '',
        requested_value: req.requestedValue,
        reason: req.reason,
        supporting_document_url: req.documentName || null,
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('profile_change_requests')
        .insert(dbPayload)
        .select()
        .single();

      if (error) {
        console.error('[DataContext] Error inserting profile change request:', error);
        throw new Error(error.message || 'Failed to submit profile change request to Supabase.');
      }

      const mapped = mapDbRequestToUi(data, user);
      setProfileRequests((prev) => [mapped, ...prev.filter((r) => r.id !== mapped.id)]);
      addAuditLog(`Submitted Profile Change Request (${mapped.id}) for ${user.name}: ${mapped.fieldLabel}`, 'Success', 'Profile');
      return mapped;
    }

    // Demo/LocalStorage fallback
    const id = `PCR-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date();
    const dateStr = now.toISOString().replace('T', ' ').substring(0, 16);
    const newReq = {
      id,
      status: 'Pending',
      submittedDate: dateStr,
      reviewedBy: null,
      reviewedAt: null,
      hrComment: '',
      ...req
    };
    setProfileRequests((prev) => [newReq, ...prev]);
    addAuditLog(`Submitted Profile Change Request (${id}) for ${newReq.employeeName}: ${newReq.fieldLabel}`, 'Success', 'Profile');
    return newReq;
  };

  const approveProfileRequest = async (requestId, hrUserName = 'Priyanka', hrComment = '') => {
    if (isSupabaseAuth) {
      const targetReq = profileRequests.find((r) => r.id === requestId);
      if (!targetReq) {
        throw new Error(`Profile change request (${requestId}) was not found.`);
      }

      const reviewerUuid = user?.dbId || null;
      const nowIso = new Date().toISOString();
      const commentText = hrComment.trim() || 'Approved per HR policy guidelines.';

      // 1. Update profile_change_requests
      const { error: pcrErr } = await supabase
        .from('profile_change_requests')
        .update({
          status: 'approved',
          reviewed_by: reviewerUuid,
          reviewed_at: nowIso,
          hr_comment: commentText
        })
        .eq('id', requestId);

      if (pcrErr) {
        throw new Error(pcrErr.message || 'Failed to approve profile change request.');
      }

      // 2. Update employee profile field in the correct Supabase table
      const targetEmpUuid = targetReq.employeeUuid || targetReq.employee_id || targetReq.employeeId;
      const fieldKey = targetReq.field;
      const newVal = targetReq.requestedValue;

      if (ALLOWED_EMPLOYEE_FIELDS[fieldKey]) {
        const col = ALLOWED_EMPLOYEE_FIELDS[fieldKey];
        const { error: empErr } = await supabase
          .from('employees')
          .update({ [col]: newVal })
          .eq('id', targetEmpUuid);

        if (empErr) {
          throw new Error(`Request was approved, but updating employee.${col} failed: ${empErr.message}`);
        }
      } else if (ALLOWED_EMERGENCY_CONTACT_FIELDS[fieldKey]) {
        const ecCol = ALLOWED_EMERGENCY_CONTACT_FIELDS[fieldKey];
        // Check if an emergency contact exists for this employee
        const { data: ecRow } = await supabase
          .from('emergency_contacts')
          .select('id, employee_id, name, relationship, phone')
          .eq('employee_id', targetEmpUuid)
          .order('is_primary', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (ecRow) {
          const { error: ecUpErr } = await supabase
            .from('emergency_contacts')
            .update({ [ecCol]: newVal })
            .eq('id', ecRow.id);

          if (ecUpErr) {
            throw new Error(`Request was approved, but updating emergency contact failed: ${ecUpErr.message}`);
          }
        } else {
          const { error: ecInsErr } = await supabase
            .from('emergency_contacts')
            .insert({
              employee_id: targetEmpUuid,
              name: ecCol === 'name' ? newVal : 'Primary Contact',
              relationship: ecCol === 'relationship' ? newVal : 'Contact',
              phone: ecCol === 'phone' ? newVal : '+1 (555) 000-0000',
              is_primary: true
            });

          if (ecInsErr) {
            throw new Error(`Request was approved, but creating emergency contact failed: ${ecInsErr.message}`);
          }
        }
      }

      // 3. Refresh live list and user profile
      await fetchProfileRequests();
      if (typeof refreshProfile === 'function') {
        await refreshProfile();
      }

      addAuditLog(
        `HR ${hrUserName} APPROVED Profile Change Request (${requestId}) for ${targetReq.employeeName}: Updated ${targetReq.fieldLabel} to "${targetReq.requestedValue}"`,
        'Success',
        'Profile'
      );
      return;
    }

    // Demo/LocalStorage fallback
    const now = new Date();
    const dateStr = now.toISOString().replace('T', ' ').substring(0, 16);
    let targetReq = null;

    setProfileRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          targetReq = r;
          return {
            ...r,
            status: 'Approved',
            reviewedBy: hrUserName,
            reviewedAt: dateStr,
            hrComment: hrComment || 'Approved per HR policy guidelines.'
          };
        }
        return r;
      })
    );

    if (targetReq) {
      setEmployees((prev) =>
        prev.map((emp) => {
          if (emp.id === targetReq.employeeId) {
            const updated = { ...emp };
            if (targetReq.field === 'phone') updated.phone = targetReq.requestedValue;
            else if (targetReq.field === 'name') updated.name = targetReq.requestedValue;
            else if (targetReq.field === 'location') updated.location = targetReq.requestedValue;
            else if (targetReq.field === 'emergencyName') {
              updated.emergencyContact = { ...updated.emergencyContact, name: targetReq.requestedValue };
            } else if (targetReq.field === 'emergencyRelation') {
              updated.emergencyContact = { ...updated.emergencyContact, relation: targetReq.requestedValue };
            } else if (targetReq.field === 'emergencyPhone') {
              updated.emergencyContact = { ...updated.emergencyContact, phone: targetReq.requestedValue };
            } else if (targetReq.field === 'skills') {
              updated.skills = targetReq.requestedValue.split(',').map((s) => s.trim());
            }
            return updated;
          }
          return emp;
        })
      );

      addAuditLog(
        `HR ${hrUserName} APPROVED Profile Change Request (${requestId}) for ${targetReq.employeeName}: Updated ${targetReq.fieldLabel} to "${targetReq.requestedValue}"`,
        'Success',
        'Profile'
      );
    }
  };

  const rejectProfileRequest = async (requestId, hrUserName = 'Priyanka', hrComment = '') => {
    if (isSupabaseAuth) {
      const targetReq = profileRequests.find((r) => r.id === requestId);
      if (!targetReq) {
        throw new Error(`Profile change request (${requestId}) was not found.`);
      }

      const reviewerUuid = user?.dbId || null;
      const nowIso = new Date().toISOString();
      const commentText = hrComment.trim() || 'Declined due to non-verifiable documentation.';

      // 1. Update profile_change_requests
      const { error: pcrErr } = await supabase
        .from('profile_change_requests')
        .update({
          status: 'rejected',
          reviewed_by: reviewerUuid,
          reviewed_at: nowIso,
          hr_comment: commentText
        })
        .eq('id', requestId);

      if (pcrErr) {
        throw new Error(pcrErr.message || 'Failed to reject profile change request.');
      }

      // 2. Refresh live list (do NOT modify employee data)
      await fetchProfileRequests();

      addAuditLog(
        `HR ${hrUserName} REJECTED Profile Change Request (${requestId}) for ${targetReq.employeeName}: ${commentText}`,
        'Warning',
        'Profile'
      );
      return;
    }

    // Demo/LocalStorage fallback
    const now = new Date();
    const dateStr = now.toISOString().replace('T', ' ').substring(0, 16);
    let targetReq = null;

    setProfileRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          targetReq = r;
          return {
            ...r,
            status: 'Rejected',
            reviewedBy: hrUserName,
            reviewedAt: dateStr,
            hrComment: hrComment || 'Declined due to non-verifiable documentation.'
          };
        }
        return r;
      })
    );

    if (targetReq) {
      addAuditLog(
        `HR ${hrUserName} REJECTED Profile Change Request (${requestId}) for ${targetReq.employeeName}: ${hrComment || 'Declined'}`,
        'Warning',
        'Profile'
      );
    }
  };

  // --------------------------------------------------------------------------
  // Help Desk Operations & Workflow
  // --------------------------------------------------------------------------
  const fetchTickets = useCallback(async () => {
    if (!isSupabaseAuth || !isSupabaseConfigured) return;
    setIsLoadingTickets(true);
    try {
      const { data, error } = await supabase
        .from('helpdesk_tickets')
        .select(`
          *,
          employee:employees!employee_id(id, employee_id, name, department, profile_photo),
          assignee:employees!assigned_to(id, employee_id, name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const mapped = (data || []).map((t) => mapDbTicketToUi(t));
      setTickets(mapped);
      setTicketsError(null);
      return mapped;
    } catch (err) {
      console.warn('[DataContext] Error fetching helpdesk tickets:', err);
      setTicketsError(err.message);
    } finally {
      setIsLoadingTickets(false);
    }
  }, [isSupabaseAuth, mapDbTicketToUi]);

  const fetchTicketMessages = useCallback(async (ticketId) => {
    if (!ticketId) return [];
    if (isSupabaseAuth && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('helpdesk_ticket_messages')
          .select(`
            *,
            sender:employees!sender_id(id, employee_id, name, department, profile_photo)
          `)
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('[DataContext] Error fetching ticket messages:', error);
          throw error;
        }
        const mapped = (data || []).map((m) => mapDbMessageToUi(m));
        setTicketMessages((prev) => {
          const withoutCurrent = prev.filter((m) => m.ticketId !== ticketId);
          return [...withoutCurrent, ...mapped];
        });
        return mapped;
      } catch (err) {
        console.error('[DataContext] Error fetching ticket messages:', err);
        throw err;
      }
    }
    // Demo mode: read from stable ref to eliminate cyclic dependency
    return (ticketMessagesRef.current || []).filter((m) => m.ticketId === ticketId);
  }, [isSupabaseAuth, isSupabaseConfigured, mapDbMessageToUi]);

  const uploadTicketAttachment = async (file, ticketId) => {
    if (!file) return null;
    const ALLOWED_EXTS = ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'doc'];
    const DANGEROUS_EXTS = ['exe', 'sh', 'bat', 'cmd', 'js', 'html', 'htm', 'php', 'phtml', 'py', 'rb', 'svg', 'vbs', 'jar', 'com', 'scr', 'msi'];
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (DANGEROUS_EXTS.includes(ext) || !ALLOWED_EXTS.includes(ext)) {
      throw new Error('Unsupported or unsafe file format. Allowed formats: PDF, PNG, JPG, JPEG, DOCX, DOC.');
    }
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new Error('File size exceeds the 10 MB limit.');
    }

    const formatBytes = (bytes) => {
      if (!bytes || bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    const empUuid = user?.dbId || user?.id;
    const sanitizedName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const storagePath = `${empUuid}/helpdesk/${ticketId || 'initial'}/${sanitizedName}`;

    if (isSupabaseAuth && isSupabaseConfigured) {
      const { data, error } = await supabase.storage
        .from('employee-documents')
        .upload(storagePath, file, { contentType: file.type || 'application/octet-stream' });
      if (error) {
        console.warn('[DataContext] Storage upload error:', error.message);
        throw new Error(error.message || 'Attachment upload failed.');
      }
      return {
        storagePath: data.path,
        fileName: file.name,
        fileSize: formatBytes(file.size)
      };
    }

    return {
      storagePath,
      fileName: file.name,
      fileSize: formatBytes(file.size)
    };
  };

  const createTicket = async ({ subject, category, priority = 'medium', description, attachmentFile = null }) => {
    if (!subject?.trim()) throw new Error('Ticket subject is required.');
    if (!description?.trim()) throw new Error('Ticket description is required.');
    const empUuid = user?.dbId || user?.id;
    if (!empUuid) throw new Error('Authenticated employee ID not found.');

    const tempId = `temp_${Date.now()}`;
    let attachmentMeta = null;
    if (attachmentFile) {
      attachmentMeta = await uploadTicketAttachment(attachmentFile, tempId);
    }

    if (isSupabaseAuth && isSupabaseConfigured) {
      const ticketPayload = {
        employee_id: empUuid,
        subject: subject.trim(),
        category,
        priority: priority.toLowerCase(),
        description: description.trim(),
        status: 'open',
        initial_attachment_url: attachmentMeta?.storagePath || null,
        initial_attachment_name: attachmentMeta?.fileName || null,
        initial_attachment_size: attachmentMeta?.fileSize || null
      };

      const { data: ticketData, error: ticketErr } = await supabase
        .from('helpdesk_tickets')
        .insert(ticketPayload)
        .select(`
          *,
          employee:employees!employee_id(id, employee_id, name, department, profile_photo)
        `)
        .single();

      if (ticketErr) {
        console.error('[DataContext] Error creating ticket:', ticketErr);
        throw ticketErr;
      }

      // Automatically create the initial conversation message
      const msgPayload = {
        ticket_id: ticketData.id,
        sender_id: empUuid,
        sender_role: 'employee',
        message: description.trim(),
        attachment_url: attachmentMeta?.storagePath || null,
        attachment_name: attachmentMeta?.fileName || null,
        attachment_size: attachmentMeta?.fileSize || null
      };

      const { data: msgData, error: msgErr } = await supabase
        .from('helpdesk_ticket_messages')
        .insert(msgPayload)
        .select(`
          *,
          sender:employees!sender_id(id, employee_id, name, department, profile_photo)
        `)
        .single();

      if (msgErr) {
        console.warn('[DataContext] Notice: Initial ticket message insert:', msgErr.message);
      }

      const mappedTicket = mapDbTicketToUi(ticketData, user);
      setTickets((prev) => [mappedTicket, ...prev.filter((t) => t.id !== mappedTicket.id)]);

      if (msgData) {
        const mappedMsg = mapDbMessageToUi(msgData, user);
        setTicketMessages((prev) => [...prev, mappedMsg]);
      }

      // 1. Notify HR Managers
      await addNotification({
        target_role: 'hr_manager',
        title: `New HR Ticket: ${mappedTicket.ticketNumber}`,
        message: `${user?.name || 'An employee'} submitted a ${mappedTicket.priority.toUpperCase()} priority ticket: "${mappedTicket.subject}"`,
        action_url: '/hr/help-desk'
      });

      // 2. Audit Trail
      await addAuditLog(
        `Raised Help Desk ticket ${mappedTicket.ticketNumber}: "${mappedTicket.subject}" (${mappedTicket.category})`,
        'Success',
        'HelpDesk',
        { ticket_id: mappedTicket.id, ticket_number: mappedTicket.ticketNumber, priority: mappedTicket.priority }
      );

      return mappedTicket;
    }

    // Demo/Offline Fallback
    const id = `HD-${Date.now().toString().slice(-4)}`;
    const ticketNumber = `HD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();
    const newTicket = {
      id,
      ticketNumber,
      employeeId: user?.badgeNumber || user?.id || 'DGX003',
      employeeUuid: empUuid,
      employeeName: user?.name || 'Tarumani Bharath Raj',
      department: user?.department || 'Technology',
      avatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      subject: subject.trim(),
      category,
      priority: priority.toLowerCase(),
      status: 'open',
      description: description.trim(),
      assignedTo: null,
      assignedToId: null,
      initialAttachmentUrl: attachmentMeta?.storagePath || null,
      initialAttachmentName: attachmentMeta?.fileName || null,
      initialAttachmentSize: attachmentMeta?.fileSize || null,
      resolvedAt: null,
      closedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const initialMsg = {
      id: `MSG-${Date.now()}`,
      ticketId: id,
      senderId: empUuid,
      senderName: user?.name || 'Tarumani Bharath Raj',
      senderRole: 'employee',
      message: description.trim(),
      attachmentUrl: attachmentMeta?.storagePath || null,
      attachmentName: attachmentMeta?.fileName || null,
      attachmentSize: attachmentMeta?.fileSize || null,
      createdAt: nowIso
    };

    setTickets((prev) => [newTicket, ...prev]);
    setTicketMessages((prev) => [...prev, initialMsg]);

    await addNotification({
      target_role: 'hr_manager',
      title: `New HR Ticket: ${newTicket.ticketNumber}`,
      message: `${newTicket.employeeName} submitted a ${newTicket.priority.toUpperCase()} priority ticket: "${newTicket.subject}"`,
      action_url: '/hr/help-desk'
    });

    await addAuditLog(
      `Raised Help Desk ticket ${newTicket.ticketNumber}: "${newTicket.subject}" (${newTicket.category})`,
      'Success',
      'HelpDesk',
      { ticket_id: newTicket.id, ticket_number: newTicket.ticketNumber }
    );

    return newTicket;
  };

  const addTicketMessage = async ({ ticketId, message, attachmentFile = null }) => {
    if (!ticketId || !message?.trim()) throw new Error('Ticket ID and message are required.');
    const empUuid = user?.dbId || user?.id;
    const userRole = user?.role || user?.dbRole || 'employee';
    const isHrOrAdmin = userRole === 'hr' || userRole === 'hr_manager' || userRole === 'admin';
    const senderRole = userRole === 'admin' ? 'admin' : (userRole === 'hr' || userRole === 'hr_manager') ? 'hr_manager' : 'employee';

    let attachmentMeta = null;
    if (attachmentFile) {
      attachmentMeta = await uploadTicketAttachment(attachmentFile, ticketId);
    }

    const targetTicket = tickets.find((t) => t.id === ticketId);

    if (isSupabaseAuth && isSupabaseConfigured) {
      const payload = {
        ticket_id: ticketId,
        sender_id: empUuid,
        sender_role: senderRole,
        message: message.trim(),
        attachment_url: attachmentMeta?.storagePath || null,
        attachment_name: attachmentMeta?.fileName || null,
        attachment_size: attachmentMeta?.fileSize || null
      };

      const { data, error } = await supabase
        .from('helpdesk_ticket_messages')
        .insert(payload)
        .select(`
          *,
          sender:employees!sender_id(id, employee_id, name, department, profile_photo)
        `)
        .single();

      if (error) {
        console.error('[DataContext] Error adding ticket message:', error);
        throw error;
      }

      const mapped = mapDbMessageToUi(data, user);
      setTicketMessages((prev) => [...prev, mapped]);

      // Update local ticket updated_at
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, updatedAt: new Date().toISOString() } : t))
      );

      // Notification Routing
      if (isHrOrAdmin) {
        if (targetTicket?.employeeUuid) {
          await addNotification({
            recipient_employee_id: targetTicket.employeeUuid,
            title: `HR Replied: ${targetTicket.ticketNumber}`,
            message: `${user?.name || 'HR Operations'} replied to your ticket "${targetTicket.subject}"`,
            action_url: '/employee/help-desk'
          });
        }
      } else {
        await addNotification({
          recipient_employee_id: targetTicket?.assignedToId || null,
          target_role: targetTicket?.assignedToId ? null : 'hr_manager',
          title: `Employee Replied: ${targetTicket?.ticketNumber || 'Ticket'}`,
          message: `${user?.name || 'Employee'} replied on ticket "${targetTicket?.subject}"`,
          action_url: '/hr/help-desk'
        });
      }

      await addAuditLog(
        `Added message to Help Desk ticket ${targetTicket?.ticketNumber || ticketId}`,
        'Success',
        'HelpDesk',
        { ticket_id: ticketId, sender_role: senderRole }
      );

      return mapped;
    }

    // Demo/Offline Fallback
    const nowIso = new Date().toISOString();
    const newMsg = {
      id: `MSG-${Date.now()}`,
      ticketId,
      senderId: empUuid,
      senderName: user?.name || (isHrOrAdmin ? 'HR Operations' : 'Employee'),
      senderRole,
      message: message.trim(),
      attachmentUrl: attachmentMeta?.storagePath || null,
      attachmentName: attachmentMeta?.fileName || null,
      attachmentSize: attachmentMeta?.fileSize || null,
      createdAt: nowIso
    };

    setTicketMessages((prev) => [...prev, newMsg]);
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, updatedAt: nowIso } : t))
    );

    if (isHrOrAdmin && targetTicket?.employeeUuid) {
      await addNotification({
        recipient_employee_id: targetTicket.employeeUuid,
        title: `HR Replied: ${targetTicket.ticketNumber}`,
        message: `${user?.name || 'HR Operations'} replied to your ticket "${targetTicket.subject}"`,
        action_url: '/employee/help-desk'
      });
    }

    await addAuditLog(
      `Added message to Help Desk ticket ${targetTicket?.ticketNumber || ticketId}`,
      'Success',
      'HelpDesk',
      { ticket_id: ticketId, sender_role: senderRole }
    );

    return newMsg;
  };

  const updateTicketStatus = async (ticketId, newStatus, reasonOrNotes = '') => {
    const normStatus = newStatus.toLowerCase().replace(/ /g, '_');
    const targetTicket = tickets.find((t) => t.id === ticketId);
    if (!targetTicket) throw new Error('Ticket not found.');

    const nowIso = new Date().toISOString();
    const updatePayload = {
      status: normStatus,
      updated_at: nowIso
    };
    if (normStatus === 'resolved') {
      updatePayload.resolved_at = nowIso;
    } else if (normStatus === 'closed') {
      updatePayload.closed_at = nowIso;
    }

    if (isSupabaseAuth && isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('helpdesk_tickets')
        .update(updatePayload)
        .eq('id', ticketId)
        .select(`
          *,
          employee:employees!employee_id(id, employee_id, name, department, profile_photo),
          assignee:employees!assigned_to(id, employee_id, name, email)
        `)
        .single();

      if (error) {
        console.error('[DataContext] Error updating ticket status:', error);
        throw error;
      }

      const mapped = mapDbTicketToUi(data);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? mapped : t)));

      // Optional note message
      if (reasonOrNotes?.trim()) {
        await addTicketMessage({
          ticketId,
          message: `[Status changed to ${newStatus.toUpperCase()}] ${reasonOrNotes.trim()}`
        });
      }

      // Notify employee
      if (targetTicket.employeeUuid) {
        await addNotification({
          recipient_employee_id: targetTicket.employeeUuid,
          title: `Ticket Status: ${targetTicket.ticketNumber}`,
          message: `Your ticket "${targetTicket.subject}" is now ${newStatus.toUpperCase()}`,
          action_url: '/employee/help-desk'
        });
      }

      const action = normStatus === 'closed' ? 'TICKET_CLOSED' : 'TICKET_STATUS_UPDATED';
      await addAuditLog(
        `${action === 'TICKET_CLOSED' ? 'Closed' : 'Updated status of'} ticket ${targetTicket.ticketNumber} to ${newStatus.toUpperCase()}`,
        'Success',
        'HelpDesk',
        { ticket_id: ticketId, new_status: normStatus, reason: reasonOrNotes }
      );

      return mapped;
    }

    // Demo/Offline Fallback
    const updatedTicket = {
      ...targetTicket,
      status: normStatus,
      resolvedAt: normStatus === 'resolved' ? nowIso : targetTicket.resolvedAt,
      closedAt: normStatus === 'closed' ? nowIso : targetTicket.closedAt,
      updatedAt: nowIso
    };

    setTickets((prev) => prev.map((t) => (t.id === ticketId ? updatedTicket : t)));

    if (reasonOrNotes?.trim()) {
      await addTicketMessage({
        ticketId,
        message: `[Status changed to ${newStatus.toUpperCase()}] ${reasonOrNotes.trim()}`
      });
    }

    if (targetTicket.employeeUuid) {
      await addNotification({
        recipient_employee_id: targetTicket.employeeUuid,
        title: `Ticket Status: ${targetTicket.ticketNumber}`,
        message: `Your ticket "${targetTicket.subject}" is now ${newStatus.toUpperCase()}`,
        action_url: '/employee/help-desk'
      });
    }

    const action = normStatus === 'closed' ? 'TICKET_CLOSED' : 'TICKET_STATUS_UPDATED';
    await addAuditLog(
      `${action === 'TICKET_CLOSED' ? 'Closed' : 'Updated status of'} ticket ${targetTicket.ticketNumber} to ${newStatus.toUpperCase()}`,
      'Success',
      'HelpDesk',
      { ticket_id: ticketId, new_status: normStatus }
    );

    return updatedTicket;
  };

  const assignTicket = async (ticketId, assigneeEmployeeId) => {
    const targetTicket = tickets.find((t) => t.id === ticketId);
    if (!targetTicket) throw new Error('Ticket not found.');

    const assigneeEmp = employees.find(
      (e) => e.id === assigneeEmployeeId || e.dbId === assigneeEmployeeId
    );
    const assigneeName = assigneeEmp?.name || 'HR Specialist';
    const nowIso = new Date().toISOString();

    if (isSupabaseAuth && isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('helpdesk_tickets')
        .update({
          assigned_to: assigneeEmployeeId || null,
          updated_at: nowIso
        })
        .eq('id', ticketId)
        .select(`
          *,
          employee:employees!employee_id(id, employee_id, name, department, profile_photo),
          assignee:employees!assigned_to(id, employee_id, name, email)
        `)
        .single();

      if (error) {
        console.error('[DataContext] Error assigning ticket:', error);
        throw error;
      }

      const mapped = mapDbTicketToUi(data);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? mapped : t)));

      if (assigneeEmployeeId) {
        await addNotification({
          recipient_employee_id: assigneeEmployeeId,
          title: `Ticket Assigned: ${targetTicket.ticketNumber}`,
          message: `You were assigned ticket "${targetTicket.subject}" (${targetTicket.priority.toUpperCase()})`,
          action_url: '/hr/help-desk'
        });
      }

      await addAuditLog(
        `Assigned ticket ${targetTicket.ticketNumber} to ${assigneeName}`,
        'Success',
        'HelpDesk',
        { ticket_id: ticketId, assigned_to: assigneeEmployeeId, assignee_name: assigneeName }
      );

      return mapped;
    }

    // Demo/Offline Fallback
    const updatedTicket = {
      ...targetTicket,
      assignedTo: assigneeName,
      assignedToId: assigneeEmployeeId,
      updatedAt: nowIso
    };

    setTickets((prev) => prev.map((t) => (t.id === ticketId ? updatedTicket : t)));

    await addAuditLog(
      `Assigned ticket ${targetTicket.ticketNumber} to ${assigneeName}`,
      'Success',
      'HelpDesk',
      { ticket_id: ticketId, assigned_to: assigneeEmployeeId, assignee_name: assigneeName }
    );

    return updatedTicket;
  };

  // ==============================================================================
  // Company Calendar & Holidays Operations
  // ==============================================================================

  const fetchHolidays = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('company_holidays')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        console.warn('[DataContext] Error fetching holidays:', error.message);
        setCalendarError(error.message);
      } else if (data) {
        setHolidays(data.map(mapDbHolidayToUi));
      }
    } catch (err) {
      console.warn('[DataContext] Unexpected error fetching holidays:', err);
    }
  }, [isSupabaseConfigured, mapDbHolidayToUi]);

  const fetchCalendarEvents = useCallback(async () => {
    if (!isSupabaseConfigured || !isSupabaseAuth) return;
    try {
      setIsLoadingCalendar(true);
      setCalendarError(null);
      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          *,
          creator:employees!created_by(id, name, employee_id, department)
        `)
        .order('event_date', { ascending: true });

      if (error) {
        console.warn('[DataContext] Error fetching calendar events:', error.message);
        setCalendarError(error.message);
      } else if (data) {
        setCalendarEvents(data.map(mapDbCalendarEventToUi));
      }
    } catch (err) {
      console.warn('[DataContext] Unexpected error fetching calendar events:', err);
      setCalendarError(err.message || 'Unable to load calendar events.');
    } finally {
      setIsLoadingCalendar(false);
    }
  }, [isSupabaseConfigured, isSupabaseAuth, mapDbCalendarEventToUi]);

  const createCalendarEvent = async (eventData) => {
    const userEmpId = user?.dbId || null;
    const payload = {
      title: eventData.title.trim(),
      description: eventData.description?.trim() || null,
      event_date: eventData.eventDate || eventData.date,
      start_time: eventData.startTime ? (eventData.startTime.length === 5 ? `${eventData.startTime}:00` : eventData.startTime) : null,
      end_time: eventData.endTime ? (eventData.endTime.length === 5 ? `${eventData.endTime}:00` : eventData.endTime) : null,
      event_type: eventData.eventType || 'company_event',
      target_audience: eventData.targetAudience || 'all',
      target_department: eventData.targetAudience === 'department' ? eventData.targetDepartment : null,
      target_employee_id: eventData.targetAudience === 'employee' ? eventData.targetEmployeeId : null,
      location: eventData.location?.trim() || null,
      created_by: userEmpId
    };

    if (isSupabaseAuth && isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert(payload)
        .select(`*, creator:employees!created_by(id, name, employee_id, department)`)
        .single();

      if (error) {
        console.error('[DataContext] Error creating calendar event:', error);
        throw error;
      }

      const mapped = mapDbCalendarEventToUi(data);
      setCalendarEvents((prev) => [...prev, mapped].sort((a, b) => a.eventDate.localeCompare(b.eventDate)));

      await addAuditLog(`Created company calendar event: "${mapped.title}" on ${mapped.eventDate}`, 'Success', 'Calendar', { eventId: mapped.id });

      try {
        if (mapped.targetAudience === 'all') {
          await addNotification({
            title: 'New Company Event',
            message: `New event scheduled: "${mapped.title}" on ${mapped.eventDate}`,
            target_role: 'all',
            action_url: '/employee/calendar'
          });
        } else if (mapped.targetAudience === 'department' && mapped.targetDepartment) {
          await addNotification({
            title: `New ${mapped.targetDepartment} Event`,
            message: `Department event scheduled: "${mapped.title}" on ${mapped.eventDate}`,
            target_role: 'employee',
            target_department: mapped.targetDepartment,
            action_url: '/employee/calendar'
          });
        } else if (mapped.targetAudience === 'employee' && mapped.targetEmployeeId) {
          await addNotification({
            title: 'New Calendar Event Assigned',
            message: `You have been scheduled for: "${mapped.title}" on ${mapped.eventDate}`,
            recipient_employee_id: mapped.targetEmployeeId,
            action_url: '/employee/calendar'
          });
        }
      } catch (notifErr) {
        console.warn('[DataContext] Notification dispatch error (non-fatal):', notifErr);
      }

      return mapped;
    } else {
      const newId = `EVT-${Date.now()}`;
      const localEvent = {
        id: newId,
        ...eventData,
        createdAt: new Date().toISOString()
      };
      setCalendarEvents((prev) => [...prev, localEvent]);
      return localEvent;
    }
  };

  const updateCalendarEvent = async (id, updates) => {
    const dbUpdates = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title.trim();
    if (updates.description !== undefined) dbUpdates.description = updates.description.trim() || null;
    if (updates.eventDate !== undefined) dbUpdates.event_date = updates.eventDate;
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime ? (updates.startTime.length === 5 ? `${updates.startTime}:00` : updates.startTime) : null;
    if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime ? (updates.endTime.length === 5 ? `${updates.endTime}:00` : updates.endTime) : null;
    if (updates.eventType !== undefined) dbUpdates.event_type = updates.eventType;
    if (updates.targetAudience !== undefined) dbUpdates.target_audience = updates.targetAudience;
    if (updates.targetDepartment !== undefined) dbUpdates.target_department = updates.targetAudience === 'department' ? updates.targetDepartment : null;
    if (updates.targetEmployeeId !== undefined) dbUpdates.target_employee_id = updates.targetAudience === 'employee' ? updates.targetEmployeeId : null;
    if (updates.location !== undefined) dbUpdates.location = updates.location.trim() || null;

    if (isSupabaseAuth && isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('calendar_events')
        .update(dbUpdates)
        .eq('id', id)
        .select(`*, creator:employees!created_by(id, name, employee_id, department)`)
        .single();

      if (error) {
        console.error('[DataContext] Error updating calendar event:', error);
        throw error;
      }

      const mapped = mapDbCalendarEventToUi(data);
      setCalendarEvents((prev) => prev.map((e) => (e.id === id ? mapped : e)));
      await addAuditLog(`Updated calendar event: "${mapped.title}"`, 'Success', 'Calendar', { eventId: id });
      return mapped;
    } else {
      setCalendarEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
      return { id, ...updates };
    }
  };

  const deleteCalendarEvent = async (id) => {
    const target = calendarEvents.find((e) => e.id === id);
    if (isSupabaseAuth && isSupabaseConfigured) {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[DataContext] Error deleting calendar event:', error);
        throw error;
      }

      setCalendarEvents((prev) => prev.filter((e) => e.id !== id));
      await addAuditLog(`Deleted calendar event: "${target?.title || id}"`, 'Warning', 'Calendar', { eventId: id });
      return true;
    } else {
      setCalendarEvents((prev) => prev.filter((e) => e.id !== id));
      return true;
    }
  };

  const createHoliday = async (holData) => {
    const userEmpId = user?.dbId || null;
    const payload = {
      name: holData.name.trim(),
      date: holData.date,
      description: holData.description?.trim() || null,
      holiday_type: holData.holidayType || 'public',
      location: holData.location?.trim() || 'All Locations',
      year: new Date(holData.date).getFullYear(),
      created_by: userEmpId
    };

    if (isSupabaseAuth && isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('company_holidays')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('[DataContext] Error creating holiday:', error);
        throw error;
      }

      const mapped = mapDbHolidayToUi(data);
      setHolidays((prev) => [...prev, mapped].sort((a, b) => a.date.localeCompare(b.date)));
      await addAuditLog(`Created public holiday: "${mapped.name}" on ${mapped.date}`, 'Success', 'Calendar', { holidayId: mapped.id });
      return mapped;
    } else {
      const newId = `HOL-${Date.now()}`;
      const localHol = { id: newId, ...holData, year: new Date(holData.date).getFullYear() };
      setHolidays((prev) => [...prev, localHol]);
      return localHol;
    }
  };

  const updateHoliday = async (id, updates) => {
    const dbUpdates = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
    if (updates.date !== undefined) {
      dbUpdates.date = updates.date;
      dbUpdates.year = new Date(updates.date).getFullYear();
    }
    if (updates.description !== undefined) dbUpdates.description = updates.description.trim() || null;
    if (updates.holidayType !== undefined) dbUpdates.holiday_type = updates.holidayType;
    if (updates.location !== undefined) dbUpdates.location = updates.location.trim() || 'All Locations';

    if (isSupabaseAuth && isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('company_holidays')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[DataContext] Error updating holiday:', error);
        throw error;
      }

      const mapped = mapDbHolidayToUi(data);
      setHolidays((prev) => prev.map((h) => (h.id === id ? mapped : h)));
      await addAuditLog(`Updated holiday: "${mapped.name}"`, 'Success', 'Calendar', { holidayId: id });
      return mapped;
    } else {
      setHolidays((prev) => prev.map((h) => (h.id === id ? { ...h, ...updates } : h)));
      return { id, ...updates };
    }
  };

  const deleteHoliday = async (id) => {
    const target = holidays.find((h) => h.id === id);
    if (isSupabaseAuth && isSupabaseConfigured) {
      const { error } = await supabase
        .from('company_holidays')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[DataContext] Error deleting holiday:', error);
        throw error;
      }

      setHolidays((prev) => prev.filter((h) => h.id !== id));
      await addAuditLog(`Deleted holiday: "${target?.name || id}"`, 'Warning', 'Calendar', { holidayId: id });
      return true;
    } else {
      setHolidays((prev) => prev.filter((h) => h.id !== id));
      return true;
    }
  };

  const resetDemoData = () => {
    // CRITICAL PRODUCTION DATA-SAFETY GUARD:
    // If the active session is authenticated with Supabase or associated with a database user,
    // immediately abort. Real production employee data and attendance MUST NEVER be reset.
    if (isSupabaseAuth || Boolean(user?.isSupabaseAuth) || Boolean(user?.dbId)) {
      console.warn('[DataContext] Blocked resetDemoData: Active session is an authenticated Supabase user. Real data is protected.');
      return false;
    }

    // In production builds, completely disable demo data reset
    if (import.meta.env.PROD) {
      console.warn('[DataContext] Blocked resetDemoData: Demo data reset is disabled in production environment.');
      return false;
    }

    // Only reset in-memory state for local/offline demo mode
    setEmployees(INITIAL_EMPLOYEES);
    setProjects(INITIAL_PROJECTS);
    setTasks(INITIAL_TASKS);
    setAttendance(INITIAL_ATTENDANCE);
    setIsPunchedIn(true);
    setLeaveBalances(INITIAL_LEAVE_BALANCES);
    setLeaveRequests(INITIAL_LEAVE_REQUESTS);
    setCandidates(INITIAL_CANDIDATES);
    setOnboarding(INITIAL_ONBOARDING);
    setTrainings(INITIAL_TRAINING_COURSES);
    setEmployeeDocuments(INITIAL_DOCUMENTS.filter(d => !d.category.includes('Policy') && !d.category.includes('Benefits')));
    setCompanyDocuments(INITIAL_DOCUMENTS.filter(d => d.category.includes('Policy') || d.category.includes('Benefits')));
    setAnnouncements(INITIAL_ANNOUNCEMENTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setSystemSettings(INITIAL_SYSTEM_SETTINGS);
    setRolePermissions(INITIAL_ROLE_PERMISSIONS);
    setProfileRequests(INITIAL_PROFILE_REQUESTS);
    setTickets(INITIAL_HELPDESK_TICKETS);
    setTicketMessages(INITIAL_HELPDESK_MESSAGES);
    setHolidays(INITIAL_HOLIDAYS);
    setCalendarEvents(INITIAL_CALENDAR_EVENTS);

    // TARGETED STORAGE REMOVAL:
    // Only remove local demo module keys. NEVER call localStorage.clear()
    // and NEVER remove Supabase authentication tokens ('sb-*-auth-token') or auth session storage.
    try {
      const demoKeys = [
        'systemSettings',
        'rolePermissions',
        'leavePolicyQuotas',
        'auditLogs',
        'announcements',
        'notifications',
        'employees',
        'candidates',
        'projects',
        'tasks',
        'attendance',
        'leaveBalances',
        'leaveRequests',
        'onboarding',
        'trainings',
        'employeeDocuments',
        'companyDocuments',
        'profileRequests',
        'helpdesk_tickets',
        'helpdesk_messages',
        'company_holidays',
        'calendar_events'
      ];
      demoKeys.forEach((key) => {
        localStorage.removeItem(`${STORAGE_KEY}_${key}`);
      });
    } catch (e) {
      console.warn('[DataContext] Failed to clear demo storage keys', e);
    }

    return true;
  };

  return (
    <DataContext.Provider
      value={{
        employees,
        employeeDirectory,
        fetchEmployees,
        fetchEmployeeDirectory,
        isLoadingEmployees,
        isLoadingDirectory,
        employeesError,
        directoryError,
        addEmployee,
        updateEmployee,
        updateOwnAvatar,
        projects,
        setProjects,
        fetchProjects,
        isLoadingProjects,
        projectError,
        addProject,
        updateProject,
        deleteProject,
        assignProjectMember,
        removeProjectMember,
        tasks,
        setTasks,
        fetchTasks,
        isLoadingTasks,
        taskError,
        addTask,
        toggleTaskStatus,
        updateTask,
        attendance,
        isPunchedIn,
        togglePunchIn,
        recordLoginAttendance,
        recordLogoutAttendance,
        fetchAttendanceRecords,
        isLoadingAttendance,
        attendanceError,
        getLiveWorkingDuration,
        ATTENDANCE_CONFIG,
        leaveBalances,
        leaveRequests,
        submitLeaveRequest,
        updateLeaveStatus,
        fetchLeaveRequests,
        fetchLeaveBalances,
        isLoadingLeaves,
        leaveError,
        candidates,
        setCandidates,
        fetchCandidates,
        isLoadingCandidates,
        candidateError,
        updateCandidateStage,
        addCandidate,
        updateCandidate,
        deleteCandidate,
        onboarding,
        fetchOnboardingChecklists,
        createOnboardingChecklist,
        updateOnboardingChecklist,
        toggleOnboardingTask,
        deleteOnboardingChecklist,
        isLoadingOnboarding,
        onboardingError,
        trainings,
        createTraining,
        updateTraining,
        deleteTraining,
        joinTraining,
        updateTrainingProgress,
        isLoadingTrainings,
        trainingError,
        fetchTrainings,
        documents,
        employeeDocuments,
        companyDocuments,
        fetchEmployeeDocuments,
        fetchCompanyDocuments,
        uploadEmployeeDocument,
        uploadCompanyDocument,
        deleteEmployeeDocument,
        deleteCompanyDocument,
        getDocumentDownloadUrl,
        isLoadingDocuments,
        isLoadingEmployeeDocuments,
        isLoadingCompanyDocuments,
        documentsError,
        employeeDocumentsError,
        companyDocumentsError,
        announcements,
        fetchAnnouncements,
        addAnnouncement,
        updateAnnouncement,
        deleteAnnouncement,
        markAnnouncementRead,
        isLoadingAnnouncements,
        announcementsError,
        notifications,
        fetchNotifications,
        addNotification,
        deleteNotification,
        markNotificationRead,
        markNotificationUnread,
        markAllNotificationsRead,
        isLoadingNotifications,
        notificationsError,
        auditLogs,
        fetchAuditLogs,
        isLoadingAuditLogs,
        auditLogsError,
        addAuditLog,
        systemSettings,
        updateSystemSettings,
        fetchSystemSettings,
        isLoadingSystemSettings,
        systemSettingsError,
        rolePermissions,
        toggleRolePermission,
        saveRolePermissions,
        leavePolicyQuotas,
        updateLeavePolicyQuotas,
        profileRequests,
        submitProfileRequest,
        approveProfileRequest,
        rejectProfileRequest,
        fetchProfileRequests,
        isLoadingProfileRequests,
        tickets,
        ticketMessages,
        isLoadingTickets,
        ticketsError,
        fetchTickets,
        fetchTicketMessages,
        createTicket,
        updateTicketStatus,
        assignTicket,
        addTicketMessage,
        uploadTicketAttachment,
        holidays,
        calendarEvents,
        isLoadingCalendar,
        calendarError,
        fetchHolidays,
        fetchCalendarEvents,
        createCalendarEvent,
        updateCalendarEvent,
        deleteCalendarEvent,
        createHoliday,
        updateHoliday,
        deleteHoliday,
        resetDemoData
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const usePortalData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('usePortalData must be used within a DataProvider');
  }
  return context;
};
