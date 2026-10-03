import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Clock, Info, GraduationCap, CheckCheck, ExternalLink, AlertCircle, RotateCw, Trash2 } from 'lucide-react';
import { usePortalData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

export const NotificationsMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    isLoadingNotifications,
    notificationsError,
    fetchNotifications,
    leaveRequests
  } = usePortalData();
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
    // If specific employee recipient is specified
    if (n.recipientEmployeeId || (n.targetAssignmentType === 'specific' && n.targetEmployees?.length > 0)) {
      const isTargetEmployee =
        (n.recipientEmployeeId && (n.recipientEmployeeId === user?.dbId || n.recipientEmployeeId === user?.id)) ||
        (n.targetEmployees && (n.targetEmployees.includes(user?.dbId) || n.targetEmployees.includes(user?.id)));
      return Boolean(isTargetEmployee);
    }

    // If specific department is specified
    if (n.targetDepartment || (n.targetAssignmentType === 'department' && n.targetDepartments?.length > 0)) {
      const dept = n.targetDepartment || (n.targetDepartments && n.targetDepartments[0]);
      if (user?.department && dept !== user.department) {
        return false;
      }
    }

    // Role check
    const userRole = role === 'hr_manager' ? 'hr' : role;
    const notifRole = n.targetRole === 'hr_manager' ? 'hr' : (n.targetRole || 'all');
    if (notifRole !== 'all' && notifRole !== userRole && userRole !== 'admin') {
      return false;
    }

    return true;
  });

  const pendingLeavesCount = role === 'hr' || role === 'hr_manager' || role === 'admin'
    ? leaveRequests.filter((r) => r.status === 'Pending').length
    : 0;

  const unreadNotifsCount = userNotifs.filter((n) => !n.read).length;
  const totalAlerts = unreadNotifsCount + pendingLeavesCount;

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      try {
        await markNotificationRead(notif.id);
      } catch (err) {
        console.warn('[NotificationsMenu] Failed to mark read:', err);
      }
    }
    setIsOpen(false);
    const destination = notif.link || notif.action_url;
    if (destination) {
      navigate(destination);
    }
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.warn('[NotificationsMenu] Failed to mark all read:', err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleDismiss = async (e, notifId) => {
    e.stopPropagation();
    try {
      await deleteNotification(notifId);
    } catch (err) {
      console.warn('[NotificationsMenu] Failed to dismiss notification:', err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
        title="Notifications"
        aria-label="Notifications"
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
                  onClick={handleMarkAllRead}
                  disabled={isMarkingAll}
                  className="text-[11px] text-digix-600 hover:text-digix-800 font-medium flex items-center gap-1 disabled:opacity-50"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> {isMarkingAll ? 'Updating...' : 'Mark read'}
                </button>
              )}
              <span className="text-xs bg-digix-50 text-digix-600 px-2 py-0.5 rounded-full font-medium">
                {totalAlerts} New
              </span>
            </div>
          </div>

          {/* Error Banner with Retry */}
          {notificationsError && (
            <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200/80 rounded-xl flex items-center justify-between text-xs text-rose-700">
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                <span className="truncate">{notificationsError}</span>
              </div>
              <button
                onClick={() => fetchNotifications()}
                className="ml-2 px-2 py-0.5 bg-white border border-rose-200 hover:bg-rose-100 rounded text-[11px] font-medium transition-colors flex items-center gap-1 flex-shrink-0"
              >
                <RotateCw className="w-3 h-3" /> Retry
              </button>
            </div>
          )}

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

            {/* Loading Skeleton */}
            {isLoadingNotifications && userNotifs.length === 0 ? (
              <div className="py-2 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3 animate-pulse">
                    <div className="w-7 h-7 rounded-lg bg-slate-200 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5 py-0.5">
                      <div className="h-3 bg-slate-200 rounded w-3/5" />
                      <div className="h-2.5 bg-slate-200 rounded w-4/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : userNotifs.length > 0 ? (
              /* Notifications List */
              userNotifs.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group p-3 rounded-xl transition-all cursor-pointer flex items-start gap-3 text-xs border ${
                    !notif.read
                      ? 'bg-blue-50/50 border-blue-100 hover:bg-blue-100/50'
                      : 'bg-slate-50 border-slate-100 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-digix-100 text-digix-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {notif.title?.toLowerCase().includes('training') ? (
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
                        {(notif.link || notif.action_url) && (
                          <span className="text-digix-600 font-semibold flex items-center gap-0.5">
                            Open <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-1.5 flex-shrink-0 mt-0.5">
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-digix-600" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDismiss(e, notif.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-200/60 rounded transition-all"
                      title="Dismiss notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1">
                <Bell className="w-6 h-6 text-slate-300 stroke-[1.5]" />
                <p className="font-semibold text-slate-700">No notifications to display</p>
                <p className="text-[11px] text-slate-400">You're completely up to date with portal updates.</p>
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

