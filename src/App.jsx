import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';

// Auth
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { SetupPasswordPage } from './pages/auth/SetupPasswordPage';

// Employee Pages
import { EmployeeDashboard } from './pages/employee/EmployeeDashboard';
import { MyProfile } from './pages/employee/MyProfile';
import { MyProjects } from './pages/employee/MyProjects';
import { MyTasks } from './pages/employee/MyTasks';
import { MyTeam } from './pages/employee/MyTeam';
import { AttendancePage } from './pages/employee/AttendancePage';
import { LeavePage } from './pages/employee/LeavePage';
import { TrainingPage } from './pages/employee/TrainingPage';
import { DocumentsPage } from './pages/employee/DocumentsPage';
import { AnnouncementsPage } from './pages/employee/AnnouncementsPage';
import { AIAssistantPage } from './pages/employee/AIAssistantPage';
import { HelpDeskPage } from './pages/employee/HelpDeskPage';
import { CalendarPage } from './pages/employee/CalendarPage';
import { SettingsPage } from './pages/employee/SettingsPage';

// HR Pages
import { HRDashboard } from './pages/hr/HRDashboard';
import { EmployeesList } from './pages/hr/EmployeesList';
import { EmployeeDetail } from './pages/hr/EmployeeDetail';
import { HRProfileRequests } from './pages/hr/HRProfileRequests';
import { HRAttendance } from './pages/hr/HRAttendance';
import { HRLeaveRequests } from './pages/hr/HRLeaveRequests';
import { RecruitmentPage } from './pages/hr/RecruitmentPage';
import { OnboardingPage } from './pages/hr/OnboardingPage';
import { HRTraining } from './pages/hr/HRTraining';
import { HRDocuments } from './pages/hr/HRDocuments';
import { HRAnnouncements } from './pages/hr/HRAnnouncements';
import { HRHelpDesk } from './pages/hr/HRHelpDesk';
import { HRCalendar } from './pages/hr/HRCalendar';
import { HRReports } from './pages/hr/HRReports';
import { HRSettings } from './pages/hr/HRSettings';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UsersManagement } from './pages/admin/UsersManagement';
import { AdminEmployees } from './pages/admin/AdminEmployees';
import { HRManagement } from './pages/admin/HRManagement';
import { AdminProjects } from './pages/admin/AdminProjects';
import { RolesPermissions } from './pages/admin/RolesPermissions';
import { SystemSettings } from './pages/admin/SystemSettings';
import { SecurityLogs } from './pages/admin/SecurityLogs';
import { AdminHelpDesk } from './pages/admin/AdminHelpDesk';
import { AdminCalendar } from './pages/admin/AdminCalendar';
import { AdminReports } from './pages/admin/AdminReports';

const RootRedirect = () => {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <img src="/images/digix-logo.png" alt="DigiX Logo" className="w-10 h-10 object-contain animate-pulse" />
          <div className="w-7 h-7 border-3 border-digix-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Loading DigiX Portal...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (role === 'hr' || role === 'hr_manager') {
    return <Navigate to="/hr/dashboard" replace />;
  }
  return <Navigate to="/employee/dashboard" replace />;
};

const RoleRoute = ({ allowedRoles, children }) => {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <img src="/images/digix-logo.png" alt="DigiX Logo" className="w-10 h-10 object-contain animate-pulse" />
          <div className="w-7 h-7 border-3 border-digix-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Verifying permissions...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const effectiveRole = role === 'hr_manager' ? 'hr' : role;
  const isAllowed = allowedRoles.includes(role) || allowedRoles.includes(effectiveRole);

  if (!isAllowed) {
    if (role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (role === 'hr' || role === 'hr_manager') {
      return <Navigate to="/hr/dashboard" replace />;
    }
    return <Navigate to="/employee/dashboard" replace />;
  }

  return children;
};

export const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/setup-password" element={<SetupPasswordPage />} />

      <Route path="/" element={<AppLayout />}>
        <Route index element={<RootRedirect />} />

        {/* Employee Section - Accessible to authenticated portal users */}
        <Route path="employee/dashboard" element={<RoleRoute allowedRoles={['employee', 'hr', 'hr_manager', 'admin']}><EmployeeDashboard /></RoleRoute>} />
        <Route path="employee/profile" element={<RoleRoute allowedRoles={['employee', 'hr', 'hr_manager', 'admin']}><MyProfile /></RoleRoute>} />
        <Route path="employee/projects" element={<RoleRoute allowedRoles={['employee', 'hr', 'hr_manager', 'admin']}><MyProjects /></RoleRoute>} />
        <Route path="employee/tasks" element={<RoleRoute allowedRoles={['employee', 'hr', 'hr_manager', 'admin']}><MyTasks /></RoleRoute>} />
        <Route path="employee/team" element={<RoleRoute allowedRoles={['employee', 'hr', 'hr_manager', 'admin']}><MyTeam /></RoleRoute>} />
        <Route path="employee/attendance" element={<RoleRoute allowedRoles={['employee', 'hr', 'hr_manager', 'admin']}><AttendancePage /></RoleRoute>} />
        <Route path="employee/leave" element={<RoleRoute allowedRoles={['employee', 'hr', 'hr_manager', 'admin']}><LeavePage /></RoleRoute>} />
        <Route path="employee/training" element={<RoleRoute allowedRoles={['employee', 'hr', 'hr_manager', 'admin']}><TrainingPage /></RoleRoute>} />
        <Route path="employee/documents" element={<RoleRoute allowedRoles={['employee', 'hr', 'hr_manager', 'admin']}><DocumentsPage /></RoleRoute>} />
        <Route path="employee/announcements" element={<RoleRoute allowedRoles={['employee', 'hr', 'hr_manager', 'admin']}><AnnouncementsPage /></RoleRoute>} />
        <Route path="employee/ai-assistant" element={<RoleRoute allowedRoles={['employee', 'hr', 'hr_manager', 'admin']}><AIAssistantPage /></RoleRoute>} />
        <Route path="employee/help-desk" element={<RoleRoute allowedRoles={['employee', 'hr', 'hr_manager', 'admin']}><HelpDeskPage /></RoleRoute>} />
        <Route path="employee/calendar" element={<RoleRoute allowedRoles={['employee', 'hr', 'hr_manager', 'admin']}><CalendarPage /></RoleRoute>} />
        <Route path="employee/settings" element={<RoleRoute allowedRoles={['employee', 'hr', 'hr_manager', 'admin']}><SettingsPage /></RoleRoute>} />

        {/* HR Section - Strictly HR & Admin */}
        <Route path="hr/dashboard" element={<RoleRoute allowedRoles={['hr', 'hr_manager', 'admin']}><HRDashboard /></RoleRoute>} />
        <Route path="hr/employees" element={<RoleRoute allowedRoles={['hr', 'hr_manager', 'admin']}><EmployeesList /></RoleRoute>} />
        <Route path="hr/profiles" element={<RoleRoute allowedRoles={['hr', 'hr_manager', 'admin']}><EmployeeDetail /></RoleRoute>} />
        <Route path="hr/profile-requests" element={<RoleRoute allowedRoles={['hr', 'hr_manager', 'admin']}><HRProfileRequests /></RoleRoute>} />
        <Route path="hr/attendance" element={<RoleRoute allowedRoles={['hr', 'hr_manager', 'admin']}><HRAttendance /></RoleRoute>} />
        <Route path="hr/leave-requests" element={<RoleRoute allowedRoles={['hr', 'hr_manager', 'admin']}><HRLeaveRequests /></RoleRoute>} />
        <Route path="hr/recruitment" element={<RoleRoute allowedRoles={['hr', 'hr_manager', 'admin']}><RecruitmentPage /></RoleRoute>} />
        <Route path="hr/onboarding" element={<RoleRoute allowedRoles={['hr', 'hr_manager', 'admin']}><OnboardingPage /></RoleRoute>} />
        <Route path="hr/training" element={<RoleRoute allowedRoles={['hr', 'hr_manager', 'admin']}><HRTraining /></RoleRoute>} />
        <Route path="hr/documents" element={<RoleRoute allowedRoles={['hr', 'hr_manager', 'admin']}><HRDocuments /></RoleRoute>} />
        <Route path="hr/announcements" element={<RoleRoute allowedRoles={['hr', 'hr_manager', 'admin']}><HRAnnouncements /></RoleRoute>} />
        <Route path="hr/help-desk" element={<RoleRoute allowedRoles={['hr', 'hr_manager', 'admin']}><HRHelpDesk /></RoleRoute>} />
        <Route path="hr/calendar" element={<RoleRoute allowedRoles={['hr', 'hr_manager', 'admin']}><HRCalendar /></RoleRoute>} />
        <Route path="hr/reports" element={<RoleRoute allowedRoles={['hr', 'hr_manager', 'admin']}><HRReports /></RoleRoute>} />
        <Route path="hr/settings" element={<RoleRoute allowedRoles={['hr', 'hr_manager', 'admin']}><HRSettings /></RoleRoute>} />

        {/* Admin Section - Strictly Admin Only */}
        <Route path="admin/dashboard" element={<RoleRoute allowedRoles={['admin']}><AdminDashboard /></RoleRoute>} />
        <Route path="admin/users" element={<RoleRoute allowedRoles={['admin']}><UsersManagement /></RoleRoute>} />
        <Route path="admin/employees" element={<RoleRoute allowedRoles={['admin']}><AdminEmployees /></RoleRoute>} />
        <Route path="admin/hr-management" element={<RoleRoute allowedRoles={['admin']}><HRManagement /></RoleRoute>} />
        <Route path="admin/projects" element={<RoleRoute allowedRoles={['admin']}><AdminProjects /></RoleRoute>} />
        <Route path="admin/roles-permissions" element={<RoleRoute allowedRoles={['admin']}><RolesPermissions /></RoleRoute>} />
        <Route path="admin/system-settings" element={<RoleRoute allowedRoles={['admin']}><SystemSettings /></RoleRoute>} />
        <Route path="admin/security-logs" element={<RoleRoute allowedRoles={['admin']}><SecurityLogs /></RoleRoute>} />
        <Route path="admin/help-desk" element={<RoleRoute allowedRoles={['admin']}><AdminHelpDesk /></RoleRoute>} />
        <Route path="admin/calendar" element={<RoleRoute allowedRoles={['admin']}><AdminCalendar /></RoleRoute>} />
        <Route path="admin/reports" element={<RoleRoute allowedRoles={['admin']}><AdminReports /></RoleRoute>} />
      </Route>

      {/* Fallback route */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
};
