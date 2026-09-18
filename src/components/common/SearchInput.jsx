import React from 'react';
import { Search, X } from 'lucide-react';

export const SearchInput = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  className = '',
  showShortcut = false,
  onShortcutClick
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-9 pr-14 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-digix-500 focus:ring-1 focus:ring-digix-500 transition-colors duration-150"
      />
      {value && onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : showShortcut ? (
        <div
          onClick={onShortcutClick}
          className="absolute right-2.5 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 border border-slate-200 bg-white rounded text-[10px] font-mono text-slate-400 select-none shadow-xs"
        >
          <span>⌘</span>
          <span>K</span>
        </div>
      ) : null}
    </div>
  );
};
