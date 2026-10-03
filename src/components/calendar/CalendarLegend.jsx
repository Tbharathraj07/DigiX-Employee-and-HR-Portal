import React from 'react';

export const CalendarLegend = ({ className = '' }) => {
  const legendItems = [
    {
      label: 'Government Holiday',
      colorDot: 'bg-rose-500',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
      borderIndicator: 'border-l-rose-500'
    },
    {
      label: 'Weekend',
      colorDot: 'bg-amber-500',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      borderIndicator: 'border-l-amber-500'
    },
    {
      label: 'My Leave',
      colorDot: 'bg-emerald-500',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      borderIndicator: 'border-l-emerald-500'
    },
    {
      label: 'Company Event',
      colorDot: 'bg-sky-500',
      badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
      borderIndicator: 'border-l-sky-500'
    },
    {
      label: 'Training',
      colorDot: 'bg-purple-500',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
      borderIndicator: 'border-l-purple-500'
    }
  ];

  return (
    <div className={`flex flex-wrap items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1">
        Legend:
      </span>
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg shadow-2xs">
          <span className={`w-2.5 h-2.5 rounded-full ${item.colorDot} shrink-0`} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
};
