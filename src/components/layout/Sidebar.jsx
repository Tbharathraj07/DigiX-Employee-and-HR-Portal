import React, { useState, useEffect } from 'react';
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
  Sparkles,
  LifeBuoy,
  CalendarDays,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose, isCollapsed = false, onToggleCollapse }) => {
  const { role, user } = useAuth();
  const { tasks, leaveRequests, announcements, profileRequests, tickets = [] } = usePortalData();
  const location = useLocation();

  // Floating tooltip state for desktop collapsed rail
  const [tooltip, setTooltip] = useState(null);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close mobile drawer on navigation change
  useEffect(() => {
    if (isOpen) {
      onClose?.();
    }
    setTooltip(null);
  }, [location.pathname]);

  // Lock mobile body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Clear tooltip on window resize
  useEffect(() => {
    const handleResize = () => setTooltip(null);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Badges
  const openTasksCount = tasks.filter((t) => t.status !== 'completed').length;
  const pendingLeavesCount = leaveRequests.filter((l) => l.status === 'Pending').length;
  const unreadAnnouncementsCount = announcements.filter((a) => !a.read).length;
  const pendingProfileRequestsCount = profileRequests.filter((r) => r.status === 'Pending').length;

  // Help Desk Badges
  const openTicketsCount = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;
  const employeeActionTicketsCount = tickets.filter((t) => 
    t.status === 'waiting_for_employee' && (
      (t.employeeUuid && (t.employeeUuid === user?.dbId || t.employeeUuid === user?.id)) ||
      (t.employeeId && (t.employeeId === user?.id || t.employeeId === user?.badgeNumber || t.employeeId === user?.dbId))
    )
  ).length;

  const employeeLinks = [
    { name: 'Dashboard', path: '/employee/dashboard', icon: LayoutDashboard },
    { name: 'My Profile', path: '/employee/profile', icon: User },
    { name: 'My Projects', path: '/employee/projects', icon: FolderKanban },
    { name: 'My Tasks', path: '/employee/tasks', icon: CheckSquare, badge: openTasksCount },
    { name: 'My Team', path: '/employee/team', icon: Users },
    { name: 'Attendance', path: '/employee/attendance', icon: CalendarCheck },
    { name: 'Leave', path: '/employee/leave', icon: CalendarOff },
    { name: 'Training', path: '/employee/training', icon: GraduationCap },
    { name: 'Calendar', path: '/employee/calendar', icon: CalendarDays },
    { name: 'Documents', path: '/employee/documents', icon: FileText },
    { name: 'Announcements', path: '/employee/announcements', icon: Megaphone, badge: unreadAnnouncementsCount },
    { name: 'AI Assistant', path: '/employee/ai-assistant', icon: Bot, isNew: true },
    { name: 'HR Help Desk', path: '/employee/help-desk', icon: LifeBuoy, badge: employeeActionTicketsCount },
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
    { name: 'Calendar', path: '/hr/calendar', icon: CalendarDays },
    { name: 'Documents', path: '/hr/documents', icon: FileText },
    { name: 'Announcements', path: '/hr/announcements', icon: Megaphone },
    { name: 'HR Help Desk', path: '/hr/help-desk', icon: LifeBuoy, badge: openTicketsCount },
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
    { name: 'Calendar Oversight', path: '/admin/calendar', icon: CalendarDays },
    { name: 'Help Desk Oversight', path: '/admin/help-desk', icon: LifeBuoy },
    { name: 'System Settings', path: '/admin/system-settings', icon: Settings },
    { name: 'Security / Logs', path: '/admin/security-logs', icon: ShieldAlert },
    { name: 'Reports', path: '/admin/reports', icon: FileSpreadsheet },
  ];

  const navLinks = role === 'admin' ? adminLinks : (role === 'hr' || role === 'hr_manager') ? hrLinks : employeeLinks;

  const roleTitleMap = {
    employee: 'Employee Portal',
    hr: 'HR & People Portal',
    hr_manager: 'HR & People Portal',
    admin: 'System Admin Console'
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-xs transition-opacity duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-white border-r border-slate-200 flex flex-col transition-[width,transform] duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64 select-none`}
      >
        {/* DigiX Brand Logo Header */}
        <div
          className={`h-16 flex items-center border-b border-slate-100 bg-white transition-all duration-300 ${
            isCollapsed ? 'lg:justify-center lg:px-2 px-5 justify-between' : 'justify-between px-5'
          }`}
        >
          <div
            onClick={isCollapsed ? onToggleCollapse : undefined}
            className={`flex items-center gap-2.5 min-w-0 ${isCollapsed ? 'lg:cursor-pointer' : ''}`}
            title={isCollapsed ? 'Click to expand sidebar' : undefined}
          >
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 p-1 flex items-center justify-center shadow-xs flex-shrink-0">
              <img
                src="/images/digix-logo.png"
                alt="DigiX Technologies Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div
              className={`flex flex-col min-w-0 transition-opacity duration-200 ${
                isCollapsed ? 'lg:hidden' : 'opacity-100'
              }`}
            >
              <span className="font-bold text-slate-900 text-base tracking-tight leading-none flex items-center gap-1 whitespace-nowrap">
                Digi<span className="text-digix-500">X</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide mt-0.5 whitespace-nowrap">
                Technologies
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Desktop Collapse Toggle inside Sidebar Header */}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className={`hidden lg:flex p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors ${
                  isCollapsed ? 'lg:hidden' : ''
                }`}
                title="Collapse sidebar (Ctrl+B)"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Collapsed Expand Toggle Button under Logo (Desktop) */}
        {isCollapsed && onToggleCollapse && (
          <div className="hidden lg:flex justify-center py-2 border-b border-slate-100/80">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 text-slate-400 hover:text-digix-600 hover:bg-digix-50 rounded-lg transition-colors"
              title="Expand sidebar (Ctrl+B)"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Active Role Indicator */}
        <div
          className={`px-5 pt-3.5 pb-2 transition-all duration-200 ${
            isCollapsed ? 'lg:hidden' : 'block'
          }`}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate">
            {roleTitleMap[role] || 'DigiX Portal'}
          </div>
        </div>

        {/* Scrollable Navigation Menu */}
        <nav
          onScroll={() => setTooltip(null)}
          className={`flex-1 overflow-y-auto overflow-x-hidden py-1 space-y-0.5 transition-all duration-200 ${
            isCollapsed ? 'lg:px-2 px-3' : 'px-3'
          }`}
        >
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  setTooltip(null);
                  if (onClose) onClose();
                }}
                onMouseEnter={(e) => {
                  if (!isCollapsed) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    name: item.name,
                    badge: item.badge,
                    isNew: item.isNew,
                    y: rect.top + rect.height / 2
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
                title={isCollapsed ? item.name : undefined}
                className={`relative flex items-center rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 group ${
                  isCollapsed
                    ? 'lg:justify-center lg:px-0 lg:w-11 lg:h-11 lg:mx-auto justify-between px-3 py-2'
                    : 'justify-between px-3 py-2'
                } ${
                  isActive
                    ? 'bg-digix-50 text-digix-700 font-semibold shadow-xs border border-digix-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {/* Active Indicator Bar on Left Rail (Collapsed Desktop) */}
                {isCollapsed && isActive && (
                  <div className="hidden lg:block absolute -left-2 top-2 bottom-2 w-1 bg-digix-600 rounded-r-full" />
                )}

                <div
                  className={`flex items-center ${
                    isCollapsed ? 'lg:justify-center' : 'gap-3 min-w-0'
                  }`}
                >
                  <div className="relative flex items-center justify-center flex-shrink-0">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive
                          ? 'text-digix-600'
                          : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />

                    {/* Collapsed Badge Indicator on Icon (Desktop) */}
                    {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                      <span className="hidden lg:flex absolute -top-2 -right-2.5 h-4 min-w-[16px] px-1 items-center justify-center text-[9px] font-bold bg-digix-600 text-white rounded-full ring-2 ring-white shadow-xs">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}

                    {/* Collapsed AI New Indicator on Icon (Desktop) */}
                    {isCollapsed && item.isNew && (
                      <span className="hidden lg:block absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-gradient-to-r from-digix-500 to-indigo-500 ring-2 ring-white shadow-xs" />
                    )}
                  </div>

                  <span
                    className={`truncate transition-opacity duration-150 ${
                      isCollapsed ? 'lg:hidden ml-3' : 'ml-3'
                    }`}
                  >
                    {item.name}
                  </span>
                </div>

                {/* Expanded Badge & AI Tag */}
                <div
                  className={`flex items-center gap-1.5 flex-shrink-0 ${
                    isCollapsed ? 'lg:hidden' : 'flex'
                  }`}
                >
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
        <div
          className={`p-3 border-t border-slate-100 bg-slate-50/70 transition-all duration-200 ${
            isCollapsed ? 'lg:p-2 lg:flex lg:justify-center' : ''
          }`}
        >
          <div
            onMouseEnter={(e) => {
              if (!isCollapsed) return;
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltip({
                name: `${user?.name || 'Tarumani Bharath Raj'} • ${
                  user?.roleTitle || user?.department || 'DigiX Team'
                }`,
                y: rect.top + rect.height / 2
              });
            }}
            onMouseLeave={() => setTooltip(null)}
            className={`flex items-center bg-white rounded-xl border border-slate-200/80 shadow-subtle transition-all cursor-pointer ${
              isCollapsed
                ? 'lg:p-1.5 lg:justify-center lg:gap-0 p-2 gap-3'
                : 'p-2 gap-3'
            }`}
          >
            <div className="relative flex-shrink-0">
              <img
                src={
                  user?.avatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                }
                alt={user?.name || 'User'}
                className="w-9 h-9 rounded-lg object-cover ring-1 ring-slate-200"
              />
              <div
                className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white absolute -bottom-0.5 -right-0.5"
                title="Online"
              />
            </div>

            <div
              className={`flex-1 min-w-0 transition-opacity duration-150 ${
                isCollapsed ? 'lg:hidden' : 'block'
              }`}
            >
              <p className="text-xs font-semibold text-slate-900 truncate">
                {user?.name || 'Tarumani Bharath Raj'}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {user?.roleTitle || user?.department || 'DigiX Team'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Floating Tooltip for Collapsed Desktop Rail */}
      {isCollapsed && tooltip && (
        <div
          className="hidden lg:flex fixed z-50 pointer-events-none items-center gap-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-xl"
          style={{
            left: '88px',
            top: `${tooltip.y}px`,
            transform: 'translateY(-50%)'
          }}
        >
          {/* Small triangle arrow on the left */}
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45" />
          <span className="whitespace-nowrap">{tooltip.name}</span>
          {tooltip.badge !== undefined && tooltip.badge > 0 && (
            <span className="bg-digix-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {tooltip.badge}
            </span>
          )}
          {tooltip.isNew && (
            <span className="bg-gradient-to-r from-digix-500 to-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
              AI
            </span>
          )}
        </div>
      )}
    </>
  );
};
