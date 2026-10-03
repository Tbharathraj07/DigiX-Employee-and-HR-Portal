import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { LogOut, User, RefreshCw, Shield, ChevronDown, Check, AlertTriangle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export const ProfileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const { user, role, logout, isSupabaseAuth } = useAuth();
  const { resetDemoData, recordLogoutAttendance } = usePortalData();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  // Production Data-Safety Guard:
  // Never show demo data reset for authenticated Supabase accounts or in production builds
  const canResetDemo = !isSupabaseAuth && !user?.isSupabaseAuth && !import.meta.env.PROD;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (user) {
      recordLogoutAttendance(user);
    }
    await logout();
    navigate('/login');
    addToast({
      type: 'info',
      title: 'Logged Out',
      message: 'You have been signed out of DigiX Portal.'
    });
  };

  const handleConfirmReset = () => {
    setShowConfirmModal(false);
    const didReset = resetDemoData();
    if (didReset) {
      addToast({
        type: 'success',
        title: 'Demo Data Reset',
        message: 'Initial dummy state restored for demo accounts.'
      });
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 pl-2 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200/80 bg-white"
      >
        <img
          src={user.avatar}
          alt={user.name}
          className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-200"
        />
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-semibold text-slate-900 leading-tight">
            {user.name}
          </span>
          <span className="text-[10px] text-slate-500 capitalize leading-tight">
            {user.roleTitle || user.role}
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl border border-slate-200 shadow-elevated z-50 p-2 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-digix-50 text-digix-700 px-2 py-0.5 rounded-md border border-digix-200">
                {role} Mode
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {user.id}
              </span>
            </div>
          </div>

          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate(role === 'employee' ? '/employee/profile' : (role === 'hr' || role === 'hr_manager') ? '/hr/profiles' : '/admin/users');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left"
            >
              <User className="w-4 h-4 text-slate-400" />
              <span>View Profile</span>
            </button>

            {canResetDemo && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setShowConfirmModal(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded-lg transition-colors text-left"
              >
                <RefreshCw className="w-4 h-4 text-amber-500" />
                <span>Reset Demo Data</span>
              </button>
            )}
          </div>

          <div className="pt-1 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-left"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {canResetDemo && (
        <Modal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          title="Reset Demo Data?"
          subtitle="Restore initial demo data for local offline development."
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs leading-relaxed">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 mb-0.5">Local Demo Environment Only</p>
                <p>This will reset in-memory state and local demo storage keys to default starter data. This action cannot be undone.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleConfirmReset}
              >
                Reset Demo Data
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

