import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Clock, Info, GraduationCap, CheckCheck, ExternalLink } from 'lucide-react';
import { usePortalData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

export const NotificationsMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, markNotificationRead, markAllNotificationsRead, leaveRequests } = usePortalData();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter relevant notifications for current persona
  const userNotifs = (notifications || []).filter((n) => {
    if (!n.targetRole || n.targetRole === 'all' || n.targetRole === role) {
      if (n.targetAssignmentType === 'department') {
        return n.targetDepartments?.includes(user?.department) || false;
      }
      if (n.targetAssignmentType === 'specific') {
        return n.targetEmployees?.includes(user?.id) || false;
      }
      return true;
    }
    return false;
  });

  const pendingLeavesCount = role === 'hr' || role === 'admin'
    ? leaveRequests.filter((r) => r.status === 'Pending').length
    : 0;

  const unreadNotifsCount = userNotifs.filter((n) => !n.read).length;
  const totalAlerts = unreadNotifsCount + pendingLeavesCount;

  const handleNotificationClick = (notif) => {
    markNotificationRead(notif.id);
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {totalAlerts > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-auto mt-2 sm:w-96 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl border border-slate-200 shadow-elevated z-50 p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Notifications & Alerts</h4>
              <p className="text-[11px] text-slate-400">Updates across DigiX portal</p>
            </div>
            <div className="flex items-center gap-2">
              {unreadNotifsCount > 0 && (
                <button
                  onClick={markAllNotificationsRead}
                  className="text-[11px] text-digix-600 hover:text-digix-800 font-medium flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark read
                </button>
              )}
              <span className="text-xs bg-digix-50 text-digix-600 px-2 py-0.5 rounded-full font-medium">
                {totalAlerts} New
              </span>
            </div>
          </div>

          <div className="mt-3 space-y-2 max-h-80 overflow-y-auto">
            {/* Pending Leaves Alert for HR / Admin */}
            {pendingLeavesCount > 0 && (
              <div
                onClick={() => {
                  setIsOpen(false);
                  navigate('/hr/leaves');
                }}
                className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl flex items-start gap-3 text-xs cursor-pointer hover:bg-amber-100/60 transition-colors"
              >
                <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800">
                    {pendingLeavesCount} Pending Leave {pendingLeavesCount === 1 ? 'Request' : 'Requests'}
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    Submissions awaiting management review in HR Leave portal.
                  </p>
                </div>
              </div>
            )}

            {/* Notifications List */}
            {userNotifs.length > 0 ? (
              userNotifs.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 rounded-xl transition-all cursor-pointer flex items-start gap-3 text-xs border ${
                    !notif.read
                      ? 'bg-blue-50/50 border-blue-100 hover:bg-blue-100/50'
                      : 'bg-slate-50 border-slate-100 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-digix-100 text-digix-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {notif.title.toLowerCase().includes('training') ? (
                      <GraduationCap className="w-4 h-4" />
                    ) : (
                      <Info className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-slate-900 line-clamp-1">{notif.title}</span>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">{notif.timestamp}</span>
                    </div>
                    <p className="text-slate-600 mt-1 leading-snug">{notif.message}</p>
                    {notif.author && (
                      <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400">
                        <span>From: {notif.author}</span>
                        {notif.link && (
                          <span className="text-digix-600 font-semibold flex items-center gap-0.5">
                            Open <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-digix-600 flex-shrink-0 mt-1" />
                  )}
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">
                No notifications to display.
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 text-center">
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-digix-600 hover:text-digix-700"
            >
              Close notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
