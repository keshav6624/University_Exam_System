import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export function Table({ columns, data, loading, emptyMessage = 'No data found' }) {
  if (loading) return (
    <div className="space-y-3 p-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 skeleton rounded-xl" style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="table-header text-left first:rounded-tl-2xl last:rounded-tr-2xl whitespace-nowrap">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} className="table-cell text-center py-12 text-gray-400 dark:text-gray-500">{emptyMessage}</td></tr>
          ) : data.map((row, i) => (
            <tr key={row.id || i} className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors group">
              {columns.map((col) => (
                <td key={col.key} className="table-cell whitespace-nowrap">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, totalPages, total, pageSize, onPageChange }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50 dark:border-[#2d3148]">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
          className="p-2 rounded-lg border border-gray-200 dark:border-[#2d3148] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
          <FiChevronLeft size={16} />
        </button>
        {[...Array(Math.min(totalPages, 5))].map((_, i) => {
          const p = i + 1;
          return (
            <button key={p} onClick={() => onPageChange(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors
                ${page === p ? 'bg-primary-600 text-white' : 'border border-gray-200 dark:border-[#2d3148] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'}`}>
              {p}
            </button>
          );
        })}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
          className="p-2 rounded-lg border border-gray-200 dark:border-[#2d3148] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
          <FiChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
