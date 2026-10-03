import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Filter,
  Sparkles,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Button } from '../common/Button';
import { CalendarLegend } from './CalendarLegend';
import { CalendarDayCell } from './CalendarDayCell';
import { CalendarEventModal } from './CalendarEventModal';
import { CreateCalendarEventModal } from './CreateCalendarEventModal';
import { HolidayModal } from './HolidayModal';
import { useAuth } from '../../context/AuthContext';
import { usePortalData } from '../../context/DataContext';

export const CalendarView = ({
  canManage = false,
  title = 'Company Calendar',
  subtitle = 'View holidays, company events, approved leaves, and training sessions.'
}) => {
  const { user } = useAuth();
  const {
    holidays = [],
    calendarEvents = [],
    leaveRequests = [],
    trainings = [],
    isLoadingCalendar,
    calendarError,
    fetchHolidays,
    fetchCalendarEvents,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    createHoliday,
    updateHoliday,
    deleteHoliday
  } = usePortalData();

  // Active viewing date state (defaults to today)
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Filter state
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'holidays', 'events', 'leave', 'training'

  // Modals state
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Current logged in employee's approved leave only
  const myApprovedLeaves = useMemo(() => {
    const userDbId = user?.dbId;
    const userEmpCode = user?.id || user?.badgeNumber;
    return (leaveRequests || []).filter((l) => {
      const isApproved = l.status === 'Approved' || l.rawStatus === 'approved';
      if (!isApproved) return false;
      // Strict employee isolation: only logged in user's leave
      const matchesEmp = (userDbId && l.employeeUuid === userDbId) ||
        (userEmpCode && l.employeeId === userEmpCode);
      return Boolean(matchesEmp);
    });
  }, [leaveRequests, user?.dbId, user?.id, user?.badgeNumber]);

  // Format YYYY-MM-DD
  const formatDateKey = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Generate calendar grid (including overflow days)
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // 1. Previous month overflow days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      days.push({
        date: d,
        dateKey: formatDateKey(d),
        isCurrentMonth: false
      });
    }

    // 2. Current month days
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        dateKey: formatDateKey(d),
        isCurrentMonth: true
      });
    }

    // 3. Next month overflow days (to round up to complete weeks, e.g. 35 or 42)
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remaining = totalSlots - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        dateKey: formatDateKey(d),
        isCurrentMonth: false
      });
    }

    return days;
  }, [year, month]);

  const todayKey = formatDateKey(new Date());

  // Modal open helpers
  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  const handleEditItem = (item) => {
    setIsDetailModalOpen(false);
    if (item._itemType === 'event' || item.eventDate) {
      setEditingEvent(item);
      setIsCreateEventOpen(true);
    } else if (item._itemType === 'holiday' || item.holidayType) {
      setEditingHoliday(item);
      setIsHolidayModalOpen(true);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.title || item.name}"?`)) {
      return;
    }
    try {
      if (item._itemType === 'event' || item.eventDate) {
        await deleteCalendarEvent(item.id);
      } else if (item._itemType === 'holiday' || item.holidayType) {
        await deleteHoliday(item.id);
      }
      setIsDetailModalOpen(false);
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleSaveEvent = async (eventData) => {
    if (editingEvent?.id) {
      await updateCalendarEvent(editingEvent.id, eventData);
    } else {
      await createCalendarEvent(eventData);
    }
    setEditingEvent(null);
  };

  const handleSaveHoliday = async (holData) => {
    if (editingHoliday?.id) {
      await updateHoliday(editingHoliday.id, holData);
    } else {
      await createHoliday(holData);
    }
    setEditingHoliday(null);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {title}
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-digix-50 text-digix-700 border border-digix-200">
              {monthNames[month]} {year}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {subtitle}
          </p>
        </div>

        {/* Action Buttons for HR and Admin */}
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingHoliday(null);
                  setIsHolidayModalOpen(true);
                }}
                className="flex items-center gap-1.5 text-rose-700 border-rose-200 hover:bg-rose-50"
              >
                <Plus className="w-4 h-4 text-rose-600" />
                Add Holiday
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingEvent(null);
                  setIsCreateEventOpen(true);
                }}
                className="flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Event
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              fetchHolidays();
              fetchCalendarEvents();
            }}
            className="text-slate-500 hover:text-slate-700"
            title="Refresh Calendar"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingCalendar ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Navigation Toolbar & Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white px-5 py-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/60 p-0.5 shadow-2xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-white transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-base font-bold text-slate-800 ml-2">
            {monthNames[month]} {year}
          </h2>
        </div>

        {/* View Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
          {[
            { id: 'all', label: 'All Entries' },
            { id: 'holidays', label: '🔴 Holidays' },
            { id: 'events', label: '🔵 Events' },
            { id: 'leave', label: '🟢 My Leave' },
            { id: 'training', label: '🟣 Training' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                typeFilter === tab.id
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Card */}
      {calendarError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>Unable to load latest calendar updates: {calendarError}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchHolidays();
              fetchCalendarEvents();
            }}
            className="text-rose-700 border-rose-300 hover:bg-rose-100"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Main Calendar Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center">
          {daysOfWeek.map((day, idx) => {
            const isWeekendCol = idx === 0 || idx === 6;
            return (
              <div
                key={day}
                className={`py-2.5 text-xs font-semibold uppercase tracking-wider ${
                  isWeekendCol ? 'text-amber-700 bg-amber-50/50' : 'text-slate-600'
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>

        {/* Day Cells Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
          {calendarGrid.map((dayObj) => {
            const dateStr = dayObj.dateKey;
            const isWeekend = dayObj.date.getDay() === 0 || dayObj.date.getDay() === 6;
            const isToday = dateStr === todayKey;

            // Match holidays
            const dayHolidays = typeFilter === 'all' || typeFilter === 'holidays'
              ? (holidays || []).filter((h) => h.date === dateStr)
              : [];

            // Match my approved leaves
            const dayLeaves = typeFilter === 'all' || typeFilter === 'leave'
              ? (myApprovedLeaves || []).filter((l) => l.startDate <= dateStr && l.endDate >= dateStr)
              : [];

            // Match company events
            const dayEvents = typeFilter === 'all' || typeFilter === 'events'
              ? (calendarEvents || []).filter((e) => e.eventDate === dateStr)
              : [];

            // Match training sessions
            const dayTrainings = typeFilter === 'all' || typeFilter === 'training'
              ? (trainings || []).filter((t) => t.startDate <= dateStr && (t.endDate ? t.endDate >= dateStr : t.startDate === dateStr))
              : [];

            return (
              <CalendarDayCell
                key={dateStr}
                date={dayObj.date}
                currentMonth={month}
                isToday={isToday}
                isWeekend={isWeekend}
                holidays={dayHolidays}
                leaves={dayLeaves}
                events={dayEvents}
                trainings={dayTrainings}
                onSelectDay={(d, items) => {
                  if (items.length === 1) {
                    handleSelectItem(items[0]);
                  } else if (items.length > 1) {
                    handleSelectItem(items[0]);
                  }
                }}
                onSelectItem={handleSelectItem}
              />
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <CalendarLegend />

      {/* Modals */}
      <CalendarEventModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        item={selectedItem}
        canManage={canManage}
        onEdit={handleEditItem}
        onDelete={handleDeleteItem}
      />

      {canManage && (
        <>
          <CreateCalendarEventModal
            isOpen={isCreateEventOpen}
            onClose={() => {
              setIsCreateEventOpen(false);
              setEditingEvent(null);
            }}
            onSubmit={handleSaveEvent}
            initialEvent={editingEvent}
          />

          <HolidayModal
            isOpen={isHolidayModalOpen}
            onClose={() => {
              setIsHolidayModalOpen(false);
              setEditingHoliday(null);
            }}
            onSubmit={handleSaveHoliday}
            initialHoliday={editingHoliday}
          />
        </>
      )}
    </div>
  );
};
