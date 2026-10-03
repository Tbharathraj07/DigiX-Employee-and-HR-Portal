import React from 'react';
import { Sparkles, Calendar, Award, Clock } from 'lucide-react';

export const CalendarDayCell = ({
  date,
  currentMonth,
  isToday,
  isWeekend,
  holidays = [],
  leaves = [],
  events = [],
  trainings = [],
  onSelectDay,
  onSelectItem
}) => {
  const isCurrentMonth = date.getMonth() === currentMonth;
  const dayNumber = date.getDate();

  // Combine items to render
  const allItems = [
    ...holidays.map((h) => ({ ...h, _itemType: 'holiday' })),
    ...leaves.map((l) => ({ ...l, _itemType: 'leave' })),
    ...events.map((e) => ({ ...e, _itemType: 'event' })),
    ...trainings.map((t) => ({ ...t, _itemType: 'training' }))
  ];

  const maxVisible = 3;
  const visibleItems = allItems.slice(0, maxVisible);
  const remainingCount = allItems.length - maxVisible;

  return (
    <div
      onClick={() => onSelectDay && onSelectDay(date, allItems)}
      className={`min-h-[110px] sm:min-h-[125px] p-1.5 sm:p-2 border border-slate-200/80 flex flex-col justify-between transition-all duration-150 cursor-pointer ${
        !isCurrentMonth
          ? 'bg-slate-50/60 opacity-60'
          : isWeekend
          ? 'bg-amber-50/30 hover:bg-amber-50/60'
          : 'bg-white hover:bg-slate-50/70'
      } ${isToday ? 'ring-2 ring-digix-500 ring-inset bg-digix-50/20' : ''}`}
    >
      {/* Day Header */}
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${
            isToday
              ? 'bg-digix-600 text-white font-bold shadow-xs'
              : isWeekend
              ? 'text-amber-800 bg-amber-100/70'
              : isCurrentMonth
              ? 'text-slate-800'
              : 'text-slate-400'
          }`}
        >
          {dayNumber}
        </span>

        {/* Small Tag / Counter */}
        {isWeekend && (
          <span className="text-[10px] font-medium text-amber-700/80 uppercase tracking-wider hidden sm:inline">
            Weekend
          </span>
        )}
      </div>

      {/* Items Container */}
      <div className="flex-1 space-y-1 overflow-hidden">
        {visibleItems.map((item, idx) => {
          if (item._itemType === 'holiday') {
            return (
              <div
                key={`hol-${item.id || idx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectItem && onSelectItem(item);
                }}
                className="group flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-rose-50 hover:bg-rose-100 text-rose-800 border-l-3 border-rose-500 truncate transition-colors shadow-2xs"
                title={`Government Holiday: ${item.name}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span className="truncate">{item.name}</span>
              </div>
            );
          }

          if (item._itemType === 'leave') {
            return (
              <div
                key={`leave-${item.id || idx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectItem && onSelectItem(item);
                }}
                className="group flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-l-3 border-emerald-500 truncate transition-colors shadow-2xs"
                title={`My Approved Leave: ${item.type || 'Leave'}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">Leave: {item.type || 'Approved'}</span>
              </div>
            );
          }

          if (item._itemType === 'event') {
            return (
              <div
                key={`evt-${item.id || idx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectItem && onSelectItem(item);
                }}
                className="group flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-sky-50 hover:bg-sky-100 text-sky-800 border-l-3 border-sky-500 truncate transition-colors shadow-2xs"
                title={`Company Event: ${item.title}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                <span className="truncate">{item.title}</span>
              </div>
            );
          }

          if (item._itemType === 'training') {
            return (
              <div
                key={`trn-${item.id || idx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectItem && onSelectItem(item);
                }}
                className="group flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-purple-50 hover:bg-purple-100 text-purple-800 border-l-3 border-purple-500 truncate transition-colors shadow-2xs"
                title={`Training: ${item.title}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                <span className="truncate">Training: {item.title}</span>
              </div>
            );
          }

          return null;
        })}

        {remainingCount > 0 && (
          <div className="text-[10px] font-semibold text-slate-500 hover:text-slate-700 pl-1 pt-0.5">
            +{remainingCount} more
          </div>
        )}
      </div>
    </div>
  );
};
