import React from 'react';

export const Card = ({
  children,
  title,
  subtitle,
  action,
  className = '',
  bodyClassName = 'p-5 sm:p-6',
  headerClassName = 'p-5 sm:p-6 pb-0',
  footer,
  footerClassName = 'p-4 bg-slate-50/70 border-t border-slate-100 rounded-b-xl',
  hover = false
}) => {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/80 shadow-subtle ${
        hover ? 'hover:shadow-card hover:border-slate-300 transition-all duration-200' : ''
      } ${className}`}
    >
      {(title || action) && (
        <div className={`flex items-center justify-between gap-4 ${headerClassName}`}>
          <div>
            {title && (
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
      {footer && <div className={footerClassName}>{footer}</div>}
    </div>
  );
};

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  change,
  changeType = 'increase', // 'increase' | 'decrease' | 'neutral'
  color = 'blue', // 'blue' | 'emerald' | 'amber' | 'purple' | 'rose'
  onClick,
  className = ''
}) => {
  const colorStyles = {
    blue: { bg: 'bg-digix-50', text: 'text-digix-600', border: 'border-digix-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
  };

  const style = colorStyles[color] || colorStyles.blue;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200/80 p-5 shadow-subtle hover:shadow-card transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-slate-300' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {title}
        </span>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${style.bg} ${style.text} border ${style.border}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="mt-2">
        <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {value}
        </div>
        {(subtitle || change) && (
          <div className="flex items-center gap-2 mt-1 text-xs">
            {change && (
              <span
                className={`font-semibold ${
                  changeType === 'increase'
                    ? 'text-emerald-600'
                    : changeType === 'decrease'
                    ? 'text-rose-600'
                    : 'text-slate-500'
                }`}
              >
                {change}
              </span>
            )}
            {subtitle && <span className="text-slate-500">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
