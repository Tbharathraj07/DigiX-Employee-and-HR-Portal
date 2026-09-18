import React, { createContext, useContext, useState, useEffect } from 'react';
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
  INITIAL_NOTIFICATIONS
} from '../mock/initialData';

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
  const [documents, setDocuments] = useState(() => loadSaved('documents', INITIAL_DOCUMENTS));
  const [announcements, setAnnouncements] = useState(() => loadSaved('announcements', INITIAL_ANNOUNCEMENTS));
  const [notifications, setNotifications] = useState(() => loadSaved('notifications', INITIAL_NOTIFICATIONS));
  const [auditLogs, setAuditLogs] = useState(() => loadSaved('auditLogs', INITIAL_AUDIT_LOGS));
  const [systemSettings, setSystemSettings] = useState(() => loadSaved('systemSettings', INITIAL_SYSTEM_SETTINGS));
  const [rolePermissions, setRolePermissions] = useState(() => loadSaved('rolePermissions', INITIAL_ROLE_PERMISSIONS));
  const [profileRequests, setProfileRequests] = useState(() => loadSaved('profileRequests', INITIAL_PROFILE_REQUESTS));

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_employees`, JSON.stringify(employees));
      localStorage.setItem(`${STORAGE_KEY}_projects`, JSON.stringify(projects));
      localStorage.setItem(`${STORAGE_KEY}_tasks`, JSON.stringify(tasks));
      localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify(attendance));
      localStorage.setItem(`${STORAGE_KEY}_leaveBalances`, JSON.stringify(leaveBalances));
      localStorage.setItem(`${STORAGE_KEY}_leaveRequests`, JSON.stringify(leaveRequests));
      localStorage.setItem(`${STORAGE_KEY}_candidates`, JSON.stringify(candidates));
      localStorage.setItem(`${STORAGE_KEY}_onboarding`, JSON.stringify(onboarding));
      localStorage.setItem(`${STORAGE_KEY}_trainings`, JSON.stringify(trainings));
      localStorage.setItem(`${STORAGE_KEY}_documents`, JSON.stringify(documents));
      localStorage.setItem(`${STORAGE_KEY}_announcements`, JSON.stringify(announcements));
      localStorage.setItem(`${STORAGE_KEY}_notifications`, JSON.stringify(notifications));
      localStorage.setItem(`${STORAGE_KEY}_auditLogs`, JSON.stringify(auditLogs));
      localStorage.setItem(`${STORAGE_KEY}_systemSettings`, JSON.stringify(systemSettings));
      localStorage.setItem(`${STORAGE_KEY}_rolePermissions`, JSON.stringify(rolePermissions));
      localStorage.setItem(`${STORAGE_KEY}_profileRequests`, JSON.stringify(profileRequests));
    } catch (e) {
      console.warn('Failed to persist data', e);
    }
  }, [
    employees, projects, tasks, attendance, leaveBalances, leaveRequests,
    candidates, onboarding, trainings, documents, announcements, notifications, auditLogs,
    systemSettings, rolePermissions, profileRequests
  ]);

  // Actions
  const addEmployee = (newEmp) => {
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

  const updateEmployee = (id, updates) => {
    setEmployees((prev) => prev.map((emp) => (emp.id === id ? { ...emp, ...updates } : emp)));
    addAuditLog(`Updated profile details for ID: ${id}`, 'Success', 'Employees');
  };

  const addTask = (newTask) => {
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
  };

  const toggleTaskStatus = (taskId) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const nextStatus = t.status === 'completed' ? 'in_progress' : 'completed';
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
  };

  const updateTask = (taskId, updates) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)));
  };

  // Real-Time Employee Login / Logout Attendance Operations
  const recordLoginAttendance = (user) => {
    if (!user) return null;

    const now = new Date();
    const todayKey = getLocalDateKey(now);
    const timeStr = formatTime12h(now);
    const nowIso = now.toISOString();

    const existingIndex = attendance.findIndex(
      (a) =>
        (a.employeeId === user.id || a.employeeId === user.badgeNumber || a.employeeName === user.name) &&
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
        `${user.name} logged in at ${timeStr} (Resumed Shift)`,
        'Success',
        'Attendance',
        user.name,
        user.roleTitle || user.role
      );

      return updatedRecord;
    }

    // First login of the day: create new record
    const isOnLeave = leaveRequests.some(
      (req) =>
        (req.employeeId === user.id || req.employeeName === user.name) &&
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
      id: `ATT-${todayKey.replace(/-/g, '')}-${user.id}`,
      employeeId: user.id || 'DGX003',
      employeeName: user.name,
      department: user.department || 'Technology',
      avatar: user.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      date: formatDateDisplay(now),
      dateKey: todayKey,
      checkIn: timeStr,
      checkInIso: nowIso,
      checkOut: 'Currently Active',
      checkOutIso: null,
      workingHours: '00h 01m',
      totalWorkingMinutes: 1,
      status,
      workMode: user.workType || 'Hybrid',
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
      `${user.name} logged in at ${timeStr} (Shift Started - ${status})`,
      'Success',
      'Attendance',
      user.name,
      user.roleTitle || user.role
    );

    return newRecord;
  };

  const recordLogoutAttendance = (user) => {
    if (!user) return null;

    const now = new Date();
    const todayKey = getLocalDateKey(now);
    const timeStr = formatTime12h(now);
    const nowIso = now.toISOString();

    const existingIndex = attendance.findIndex(
      (a) =>
        (a.employeeId === user.id || a.employeeId === user.badgeNumber || a.employeeName === user.name) &&
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
      `${user.name} logged out at ${timeStr} (Total Working Hours: ${totalWorkingHours})`,
      'Success',
      'Attendance',
      user.name,
      user.roleTitle || user.role
    );

    return updatedRecord;
  };

  const togglePunchIn = (userName = 'Tarumani Bharath Raj') => {
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
  const createTraining = (trainingData, createdBy = 'Priyanka, HR Manager') => {
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

  const updateTraining = (id, updates) => {
    setTrainings((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    addAuditLog(`Updated training module details (${id})`, 'Success', 'Training');
  };

  const deleteTraining = (id) => {
    setTrainings((prev) => prev.filter((t) => t.id !== id));
    addAuditLog(`Removed training curriculum (${id})`, 'Warning', 'Training');
  };

  const joinTraining = (courseId, employee) => {
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

  const updateTrainingProgress = (courseId, employeeId = 'DGX003', increment = 25) => {
    let finalProgress = 0;
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

  // Notifications Operations
  const addNotification = (notif) => {
    const id = `NOTIF-${Date.now()}`;
    const newNotif = {
      id,
      timestamp: 'Just now',
      read: false,
      ...notif
    };
    setNotifications((prev) => [newNotif, ...prev]);
    return newNotif;
  };

  const markNotificationRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const submitLeaveRequest = (req) => {
    const id = `LR-${Math.floor(900 + Math.random() * 100)}`;
    const newReq = {
      id,
      status: 'Pending',
      appliedDate: new Date().toISOString().split('T')[0],
      managerNote: '',
      ...req
    };
    setLeaveRequests((prev) => [newReq, ...prev]);
    addAuditLog(`Submitted leave request ${id} for ${newReq.employeeName}`, 'Success', 'Leave');
    return newReq;
  };

  const updateLeaveStatus = (id, newStatus, managerNote = '') => {
    setLeaveRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus, managerNote } : r))
    );
    addAuditLog(`Leave request ${id} marked as ${newStatus}`, 'Success', 'Leave');
  };

  const updateCandidateStage = (candidateId, newStage) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, stage: newStage } : c))
    );
    addAuditLog(`Updated candidate ${candidateId} stage to ${newStage}`, 'Success', 'Recruitment');
  };

  const addCandidate = (cand) => {
    const id = `REC-${Math.floor(400 + Math.random() * 200)}`;
    const newCand = {
      id,
      stage: 'Applied',
      rating: 4.5,
      appliedDate: new Date().toISOString().split('T')[0],
      ...cand
    };
    setCandidates((prev) => [newCand, ...prev]);
    addAuditLog(`New candidate registered: ${newCand.name}`, 'Success', 'Recruitment');
    return newCand;
  };

  const addAnnouncement = (ann) => {
    const id = `ANN-${Math.floor(200 + Math.random() * 200)}`;
    const newAnn = {
      id,
      date: new Date().toISOString().split('T')[0],
      read: false,
      priority: ann.priority || 'medium',
      ...ann
    };
    setAnnouncements((prev) => [newAnn, ...prev]);
    addAuditLog(`Published announcement: "${newAnn.title}"`, 'Success', 'Announcements');
    return newAnn;
  };

  const markAnnouncementRead = (id) => {
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, read: true } : a))
    );
  };

  const addAuditLog = (action, status = 'Success', module = 'System', user = 'Current User', role = 'active') => {
    const newLog = {
      id: `LOG-${Math.floor(700 + Math.random() * 300)}`,
      user,
      role,
      action,
      ip: '192.168.1.100',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status,
      module
    };
    setAuditLogs((prev) => [newLog, ...prev.slice(0, 49)]); // Keep last 50
  };

  const updateSystemSettings = (updates) => {
    setSystemSettings((prev) => ({ ...prev, ...updates }));
    addAuditLog('System settings configuration updated', 'Success', 'Admin');
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
    addAuditLog(`Updated role permissions for ${roleKey}`, 'Success', 'Security');
  };

  const submitProfileRequest = (req) => {
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

  const approveProfileRequest = (requestId, hrUserName = 'Priyanka', hrComment = '') => {
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
      // Update employee record
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

  const rejectProfileRequest = (requestId, hrUserName = 'Priyanka', hrComment = '') => {
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

  const resetDemoData = () => {
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
    setDocuments(INITIAL_DOCUMENTS);
    setAnnouncements(INITIAL_ANNOUNCEMENTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setSystemSettings(INITIAL_SYSTEM_SETTINGS);
    setRolePermissions(INITIAL_ROLE_PERMISSIONS);
    setProfileRequests(INITIAL_PROFILE_REQUESTS);
    localStorage.clear();
  };

  return (
    <DataContext.Provider
      value={{
        employees,
        addEmployee,
        updateEmployee,
        projects,
        tasks,
        addTask,
        toggleTaskStatus,
        updateTask,
        attendance,
        isPunchedIn,
        togglePunchIn,
        recordLoginAttendance,
        recordLogoutAttendance,
        getLiveWorkingDuration,
        ATTENDANCE_CONFIG,
        leaveBalances,
        leaveRequests,
        submitLeaveRequest,
        updateLeaveStatus,
        candidates,
        updateCandidateStage,
        addCandidate,
        onboarding,
        trainings,
        createTraining,
        updateTraining,
        deleteTraining,
        joinTraining,
        updateTrainingProgress,
        documents,
        announcements,
        addAnnouncement,
        markAnnouncementRead,
        notifications,
        addNotification,
        markNotificationRead,
        markAllNotificationsRead,
        auditLogs,
        addAuditLog,
        systemSettings,
        updateSystemSettings,
        rolePermissions,
        toggleRolePermission,
        profileRequests,
        submitProfileRequest,
        approveProfileRequest,
        rejectProfileRequest,
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
