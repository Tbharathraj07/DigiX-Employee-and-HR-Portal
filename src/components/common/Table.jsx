import React from 'react';

export const Table = ({
  columns = [],
  data = [],
  keyField = 'id',
  isLoading = false,
  emptyMessage = 'No records found',
  onRowClick,
  className = ''
}) => {
  return (
    <div className={`w-full overflow-x-auto rounded-xl border border-slate-200/80 bg-white ${className}`}>
      <table className="w-full min-w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80">
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={`py-3 px-3 sm:px-4 text-[11px] sm:text-xs font-semibold tracking-wider text-slate-600 uppercase whitespace-nowrap ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-xs sm:text-sm text-slate-700">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-slate-400">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-digix-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium text-slate-500">Loading data...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-10 text-center text-slate-400 text-sm font-medium">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={row[keyField] || rowIdx}
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-colors duration-150 ${
                  onRowClick ? 'cursor-pointer hover:bg-slate-50/80' : 'hover:bg-slate-50/50'
                }`}
              >
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className={`py-3 sm:py-3.5 px-3 sm:px-4 whitespace-nowrap ${col.cellClassName || ''}`}>
                    {col.render ? col.render(row, rowIdx) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
