import React from 'react';

export const Input = ({
  label,
  error,
  helperText,
  leftIcon = null,
  rightIcon = null,
  className = '',
  id,
  type = 'text',
  ...props
}) => {
  const inputId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative rounded-lg shadow-sm">
        {leftIcon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          type={type}
          className={`block w-full rounded-lg border text-sm transition-colors duration-150 py-2.5 px-3 ${
            leftIcon ? 'pl-9' : ''
          } ${rightIcon ? 'pr-9' : ''} ${
            error
              ? 'border-rose-300 text-rose-900 placeholder-rose-300 focus:border-rose-500 focus:ring-rose-500'
              : 'border-slate-300 text-slate-900 placeholder-slate-400 focus:border-digix-500 focus:ring-1 focus:ring-digix-500'
          } ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      {!error && helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
};

export const Select = ({
  label,
  options = [],
  error,
  helperText,
  className = '',
  id,
  ...props
}) => {
  const selectId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`block w-full rounded-lg border text-sm py-2.5 px-3 bg-white transition-colors duration-150 ${
          error
            ? 'border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-rose-500'
            : 'border-slate-300 text-slate-900 focus:border-digix-500 focus:ring-1 focus:ring-digix-500'
        } ${className}`}
        {...props}
      >
        {options.map((opt, idx) => (
          <option key={idx} value={typeof opt === 'object' ? opt.value : opt}>
            {typeof opt === 'object' ? opt.label : opt}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      {!error && helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
};
