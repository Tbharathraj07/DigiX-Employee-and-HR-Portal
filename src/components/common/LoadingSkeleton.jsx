import React from 'react';

export const LoadingSkeleton = ({ count = 3, className = 'h-16' }) => {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={`w-full bg-slate-100 rounded-xl border border-slate-200/60 ${className}`}
        />
      ))}
    </div>
  );
};
