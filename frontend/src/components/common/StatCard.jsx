import React from 'react';

export default function StatCard({ icon: Icon, label, value, sub, color = 'primary', trend }) {
  const colorMap = {
    primary: 'from-primary-500 to-primary-600 shadow-glow',
    green: 'from-emerald-500 to-green-600',
    orange: 'from-orange-500 to-accent-500 shadow-glow-accent',
    red: 'from-red-500 to-rose-600',
    purple: 'from-violet-500 to-purple-600',
    blue: 'from-blue-500 to-cyan-500',
  };
  return (
    <div className="stat-card">
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center flex-shrink-0 shadow-lg`}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-gray-900 dark:text-white font-display">{value ?? '—'}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</div>}
        {trend !== undefined && (
          <div className={`text-xs font-medium mt-1 ${trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% from last month
          </div>
        )}
      </div>
    </div>
  );
}
