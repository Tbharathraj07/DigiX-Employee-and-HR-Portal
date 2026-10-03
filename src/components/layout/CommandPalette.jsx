import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
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
  FileSpreadsheet,
  Building,
  KeyRound,
  ShieldAlert,
  ArrowRight,
  X
} from 'lucide-react';

export const CommandPalette = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { role, switchRole } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose ? onClose() : null;
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const allNavigationItems = [
    // Employee
    { title: 'Employee Dashboard', role: 'employee', path: '/employee/dashboard', icon: LayoutDashboard, category: 'Employee Portal' },
    { title: 'My Profile', role: 'employee', path: '/employee/profile', icon: User, category: 'Employee Portal' },
    { title: 'My Projects', role: 'employee', path: '/employee/projects', icon: FolderKanban, category: 'Employee Portal' },
    { title: 'My Tasks', role: 'employee', path: '/employee/tasks', icon: CheckSquare, category: 'Employee Portal' },
    { title: 'My Team', role: 'employee', path: '/employee/team', icon: Users, category: 'Employee Portal' },
    { title: 'Attendance & Clock-In', role: 'employee', path: '/employee/attendance', icon: CalendarCheck, category: 'Employee Portal' },
    { title: 'Leave Application & Balances', role: 'employee', path: '/employee/leave', icon: CalendarOff, category: 'Employee Portal' },
    { title: 'Training & Certifications', role: 'employee', path: '/employee/training', icon: GraduationCap, category: 'Employee Portal' },
    { title: 'Documents & Payslips', role: 'employee', path: '/employee/documents', icon: FileText, category: 'Employee Portal' },
    { title: 'Announcements Feed', role: 'employee', path: '/employee/announcements', icon: Megaphone, category: 'Employee Portal' },
    { title: 'DigiX AI Assistant', role: 'employee', path: '/employee/ai-assistant', icon: Bot, category: 'Employee Portal' },
    { title: 'Employee Settings', role: 'employee', path: '/employee/settings', icon: Settings, category: 'Employee Portal' },

    // HR
    { title: 'HR Analytics Dashboard', role: 'hr', path: '/hr/dashboard', icon: LayoutDashboard, category: 'HR Management' },
    { title: 'Employee Directory', role: 'hr', path: '/hr/employees', icon: Users, category: 'HR Management' },
    { title: 'Employee Profiles Dossier', role: 'hr', path: '/hr/profiles', icon: UserCheck, category: 'HR Management' },
    { title: 'Profile Change Requests', role: 'hr', path: '/hr/profile-requests', icon: UserCheck, category: 'HR Management' },
    { title: 'Organization Attendance', role: 'hr', path: '/hr/attendance', icon: CalendarCheck, category: 'HR Management' },
    { title: 'Leave Approvals Queue', role: 'hr', path: '/hr/leave-requests', icon: CalendarOff, category: 'HR Management' },
    { title: 'Recruitment & ATS Pipeline', role: 'hr', path: '/hr/recruitment', icon: Users, category: 'HR Management' },
    { title: 'New Hire Onboarding Tracker', role: 'hr', path: '/hr/onboarding', icon: CheckSquare, category: 'HR Management' },
    { title: 'Company Training Programs', role: 'hr', path: '/hr/training', icon: GraduationCap, category: 'HR Management' },
    { title: 'HR Documents & Policies', role: 'hr', path: '/hr/documents', icon: FileText, category: 'HR Management' },
    { title: 'HR Announcements Publisher', role: 'hr', path: '/hr/announcements', icon: Megaphone, category: 'HR Management' },
    { title: 'Workforce Reports & Analytics', role: 'hr', path: '/hr/reports', icon: FileSpreadsheet, category: 'HR Management' },
    { title: 'HR Policy Settings', role: 'hr', path: '/hr/settings', icon: Settings, category: 'HR Management' },

    // Admin
    { title: 'Admin System Dashboard', role: 'admin', path: '/admin/dashboard', icon: LayoutDashboard, category: 'System Administration' },
    { title: 'User Accounts Governance', role: 'admin', path: '/admin/users', icon: Users, category: 'System Administration' },
    { title: 'Employee Master Records', role: 'admin', path: '/admin/employees', icon: Building, category: 'System Administration' },
    { title: 'HR Department Management', role: 'admin', path: '/admin/hr-management', icon: Users, category: 'System Administration' },
    { title: 'Enterprise Projects Portfolio', role: 'admin', path: '/admin/projects', icon: FolderKanban, category: 'System Administration' },
    { title: 'Roles & Permission Matrix', role: 'admin', path: '/admin/roles-permissions', icon: KeyRound, category: 'System Administration' },
    { title: 'Global System Settings', role: 'admin', path: '/admin/system-settings', icon: Settings, category: 'System Administration' },
    { title: 'Security & Audit Trail Logs', role: 'admin', path: '/admin/security-logs', icon: ShieldAlert, category: 'System Administration' },
    { title: 'Admin Compliance Reports', role: 'admin', path: '/admin/reports', icon: FileSpreadsheet, category: 'System Administration' },
  ];

  const filtered = allNavigationItems.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (item) => {
    if (role !== item.role) {
      switchRole(item.role);
    }
    navigate(item.path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />
      <div className="flex min-h-full items-start justify-center pt-20 p-4">
        <div className="relative w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center px-4 border-b border-slate-100">
            <Search className="w-5 h-5 text-slate-400 mr-2" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search all DigiX portal modules, pages, or tools..."
              className="w-full py-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
            />
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No matching portal sections found for "{query}".
              </div>
            ) : (
              filtered.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    onClick={() => handleSelect(item)}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-digix-50 group-hover:text-digix-600 transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800 group-hover:text-digix-700">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.category}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {item.role}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-digix-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-600">ESC</kbd> to close</span>
            <span>Switching sections automatically updates demo role</span>
          </div>
        </div>
      </div>
    </div>
  );
};
