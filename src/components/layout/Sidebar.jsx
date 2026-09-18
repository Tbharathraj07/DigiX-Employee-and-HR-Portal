import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePortalData } from '../../context/DataContext';
import {
  LayoutDashboard,
  User,
  FolderKanban,
  CheckSquare,
  Users,
  CalendarCheck,
  CalendarOff,
  GraduationCap,
  FileText,
  Megaphone,
  Bot,
  Settings,
  ShieldCheck,
  UserCheck,
  Building,
  KeyRound,
  ShieldAlert,
  FileSpreadsheet,
  X,
  Layers,
  Sparkles
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const { role, user } = useAuth();
  const { tasks, leaveRequests, announcements, profileRequests } = usePortalData();
  const location = useLocation();

  // Badges
  const openTasksCount = tasks.filter((t) => t.status !== 'completed').length;
  const pendingLeavesCount = leaveRequests.filter((l) => l.status === 'Pending').length;
  const unreadAnnouncementsCount = announcements.filter((a) => !a.read).length;
  const pendingProfileRequestsCount = profileRequests.filter((r) => r.status === 'Pending').length;

  const employeeLinks = [
    { name: 'Dashboard', path: '/employee/dashboard', icon: LayoutDashboard },
    { name: 'My Profile', path: '/employee/profile', icon: User },
    { name: 'My Projects', path: '/employee/projects', icon: FolderKanban },
    { name: 'My Tasks', path: '/employee/tasks', icon: CheckSquare, badge: openTasksCount },
    { name: 'My Team', path: '/employee/team', icon: Users },
    { name: 'Attendance', path: '/employee/attendance', icon: CalendarCheck },
    { name: 'Leave', path: '/employee/leave', icon: CalendarOff },
    { name: 'Training', path: '/employee/training', icon: GraduationCap },
    { name: 'Documents', path: '/employee/documents', icon: FileText },
    { name: 'Announcements', path: '/employee/announcements', icon: Megaphone, badge: unreadAnnouncementsCount },
    { name: 'AI Assistant', path: '/employee/ai-assistant', icon: Bot, isNew: true },
    { name: 'Settings', path: '/employee/settings', icon: Settings },
  ];

  const hrLinks = [
    { name: 'Dashboard', path: '/hr/dashboard', icon: LayoutDashboard },
    { name: 'Employees', path: '/hr/employees', icon: Users },
    { name: 'Employee Profiles', path: '/hr/profiles', icon: UserCheck },
    { name: 'Profile Requests', path: '/hr/profile-requests', icon: UserCheck, badge: pendingProfileRequestsCount },
    { name: 'Attendance', path: '/hr/attendance', icon: CalendarCheck },
    { name: 'Leave Requests', path: '/hr/leave-requests', icon: CalendarOff, badge: pendingLeavesCount },
    { name: 'Recruitment', path: '/hr/recruitment', icon: FolderKanban },
    { name: 'Onboarding', path: '/hr/onboarding', icon: CheckSquare },
    { name: 'Training', path: '/hr/training', icon: GraduationCap },
    { name: 'Documents', path: '/hr/documents', icon: FileText },
    { name: 'Announcements', path: '/hr/announcements', icon: Megaphone },
    { name: 'Reports', path: '/hr/reports', icon: FileSpreadsheet },
    { name: 'Settings', path: '/hr/settings', icon: Settings },
  ];

  const adminLinks = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Employees', path: '/admin/employees', icon: Building },
    { name: 'HR Management', path: '/admin/hr-management', icon: UserCheck },
    { name: 'Projects', path: '/admin/projects', icon: FolderKanban },
    { name: 'Roles & Permissions', path: '/admin/roles-permissions', icon: KeyRound },
    { name: 'System Settings', path: '/admin/system-settings', icon: Settings },
    { name: 'Security / Logs', path: '/admin/security-logs', icon: ShieldAlert },
    { name: 'Reports', path: '/admin/reports', icon: FileSpreadsheet },
  ];

  const navLinks = role === 'admin' ? adminLinks : role === 'hr' ? hrLinks : employeeLinks;

  const roleTitleMap = {
    employee: 'Employee Portal',
    hr: 'HR & People Portal',
    admin: 'System Admin Console'
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-xs transition-opacity duration-200"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* DigiX Brand Logo Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-digix-500 flex items-center justify-center text-white shadow-sm shadow-digix-500/30">
              <Layers className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 text-base tracking-tight leading-none flex items-center gap-1">
                Digi<span className="text-digix-500">X</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide mt-0.5">
                Technologies
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Role Indicator */}
        <div className="px-5 pt-4 pb-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {roleTitleMap[role] || 'DigiX Portal'}
          </div>
        </div>

        {/* Scrollable Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => onClose && onClose()}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-digix-50 text-digix-700 font-semibold shadow-xs border border-digix-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-digix-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-digix-600 text-white'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {item.isNew && (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-gradient-to-r from-digix-500 to-indigo-500 text-white shadow-xs">
                      <Sparkles className="w-2.5 h-2.5" />
                      AI
                    </span>
                  )}
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Current Profile Summary */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200/80 shadow-subtle">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={user?.name || 'User'}
              className="w-9 h-9 rounded-lg object-cover ring-1 ring-slate-200"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {user?.name || 'Tarumani Bharath Raj'}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {user?.roleTitle || user?.department || 'DigiX Team'}
              </p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100 flex-shrink-0" title="Online" />
          </div>
        </div>
      </aside>
    </>
  );
};
