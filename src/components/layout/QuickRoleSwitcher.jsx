import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { UserCheck, ShieldCheck, Users } from 'lucide-react';

export const QuickRoleSwitcher = () => {
  const { role, switchRole, isSupabaseAuth } = useAuth();
  const { recordLoginAttendance } = usePortalData();
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Security: Do not render demo role switcher for real authenticated Supabase accounts
  if (isSupabaseAuth) return null;

  const roles = [
    { key: 'employee', label: 'Employee', icon: UserCheck, route: '/employee/dashboard', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    { key: 'hr', label: 'HR Portal', icon: Users, route: '/hr/dashboard', color: 'text-purple-700 bg-purple-50 border-purple-200' },
    { key: 'admin', label: 'Admin', icon: ShieldCheck, route: '/admin/dashboard', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  ];

  const handleSwitch = (targetRole, route) => {
    if (role === targetRole) return;
    const switchedUser = switchRole(targetRole);
    if (targetRole === 'employee') {
      recordLoginAttendance(switchedUser);
    }
    navigate(route);
    addToast({
      type: 'info',
      title: 'Demo Role Switched',
      message: `Now viewing portal as ${switchedUser.name} (${switchedUser.roleTitle})`
    });
  };

  return (
    <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
      {roles.map((r) => {
        const Icon = r.icon;
        const isActive = role === r.key;
        return (
          <button
            key={r.key}
            onClick={() => handleSwitch(r.key, r.route)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all duration-150 ${
              isActive
                ? 'bg-white text-digix-700 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-digix-600' : 'text-slate-400'}`} />
            <span className="hidden md:inline">{r.label}</span>
          </button>
        );
      })}
    </div>
  );
};
