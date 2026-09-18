import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';

// Auth
import { LoginPage } from './pages/auth/LoginPage';

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
import { AdminReports } from './pages/admin/AdminReports';

const RootRedirect = () => {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (role === 'hr') {
    return <Navigate to="/hr/dashboard" replace />;
  }
  return <Navigate to="/employee/dashboard" replace />;
};

export const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={<AppLayout />}>
        <Route index element={<RootRedirect />} />

        {/* Employee Section */}
        <Route path="employee/dashboard" element={<EmployeeDashboard />} />
        <Route path="employee/profile" element={<MyProfile />} />
        <Route path="employee/projects" element={<MyProjects />} />
        <Route path="employee/tasks" element={<MyTasks />} />
        <Route path="employee/team" element={<MyTeam />} />
        <Route path="employee/attendance" element={<AttendancePage />} />
        <Route path="employee/leave" element={<LeavePage />} />
        <Route path="employee/training" element={<TrainingPage />} />
        <Route path="employee/documents" element={<DocumentsPage />} />
        <Route path="employee/announcements" element={<AnnouncementsPage />} />
        <Route path="employee/ai-assistant" element={<AIAssistantPage />} />
        <Route path="employee/settings" element={<SettingsPage />} />

        {/* HR Section */}
        <Route path="hr/dashboard" element={<HRDashboard />} />
        <Route path="hr/employees" element={<EmployeesList />} />
        <Route path="hr/profiles" element={<EmployeeDetail />} />
        <Route path="hr/profile-requests" element={<HRProfileRequests />} />
        <Route path="hr/attendance" element={<HRAttendance />} />
        <Route path="hr/leave-requests" element={<HRLeaveRequests />} />
        <Route path="hr/recruitment" element={<RecruitmentPage />} />
        <Route path="hr/onboarding" element={<OnboardingPage />} />
        <Route path="hr/training" element={<HRTraining />} />
        <Route path="hr/documents" element={<HRDocuments />} />
        <Route path="hr/announcements" element={<HRAnnouncements />} />
        <Route path="hr/reports" element={<HRReports />} />
        <Route path="hr/settings" element={<HRSettings />} />

        {/* Admin Section */}
        <Route path="admin/dashboard" element={<AdminDashboard />} />
        <Route path="admin/users" element={<UsersManagement />} />
        <Route path="admin/employees" element={<AdminEmployees />} />
        <Route path="admin/hr-management" element={<HRManagement />} />
        <Route path="admin/projects" element={<AdminProjects />} />
        <Route path="admin/roles-permissions" element={<RolesPermissions />} />
        <Route path="admin/system-settings" element={<SystemSettings />} />
        <Route path="admin/security-logs" element={<SecurityLogs />} />
        <Route path="admin/reports" element={<AdminReports />} />
      </Route>

      {/* Fallback route */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
};
