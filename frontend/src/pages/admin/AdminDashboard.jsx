import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import StatCard from '../../components/common/StatCard';
import { FiUsers, FiBook, FiDatabase, FiActivity, FiFileText, FiAward } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import { formatDateTime } from '../../utils/helpers';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const toNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const statsData = data?.stats || {};
  const usersStats = statsData.users || {};
  const coursesStats = statsData.courses || {};
  const examsStats = statsData.exams || {};

  useEffect(() => {
    adminAPI.getDashboard().then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const stats = [
    { icon: FiUsers, label: 'Total Students', value: toNumber(statsData.students ?? usersStats.students), color: 'blue' },
    { icon: FiActivity, label: 'Total Teachers', value: toNumber(statsData.teachers ?? usersStats.teachers), color: 'purple' },
    { icon: FiDatabase, label: 'Departments', value: toNumber(statsData.departments), color: 'primary' },
    { icon: FiBook, label: 'Total Courses', value: toNumber(statsData.courses_total ?? statsData.courses ?? coursesStats.total), color: 'green' },
    { icon: FiFileText, label: 'Total Exams', value: toNumber(statsData.exams_total ?? statsData.exams ?? examsStats.total), color: 'orange' },
    { icon: FiAward, label: 'Submissions', value: toNumber(statsData.submissions), color: 'red' },
  ];

  const CustomTooltip = ({ active, payload, label }) => active && payload?.length ? (
    <div className="bg-white dark:bg-[#1a1d27] border border-gray-100 dark:border-[#2d3148] rounded-xl px-4 py-3 shadow-lg text-sm">
      <div className="font-semibold text-gray-700 dark:text-gray-200">{label}</div>
      {payload.map(p => <div key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</div>)}
    </div>
  ) : null;

  return (
    <div className="space-y-8 animate-slide-up">
      <div>
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">System overview and analytics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* User Registration Trend */}
        <div className="card p-6">
          <h2 className="section-title mb-4">User Registrations (Last 7 Days)</h2>
          {data?.registrations?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.registrations}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-[#2d3148]" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="students" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} name="Students" />
                <Line type="monotone" dataKey="teachers" stroke="#f97316" strokeWidth={2.5} dot={{ r: 3 }} name="Teachers" />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="h-40 flex items-center justify-center text-gray-400 text-sm">No data</div>}
        </div>

        {/* Exams per Dept */}
        <div className="card p-6">
          <h2 className="section-title mb-4">Exams per Department</h2>
          {data?.exams_by_dept?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.exams_by_dept}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-[#2d3148]" />
                <XAxis dataKey="dept" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[6,6,0,0]} name="Exams" />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-40 flex items-center justify-center text-gray-400 text-sm">No data</div>}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-50 dark:border-[#2d3148]">
          <h2 className="section-title">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-[#2d3148]">
          {loading ? [...Array(5)].map((_, i) => (
            <div key={i} className="px-6 py-4 flex items-center gap-4">
              <div className="w-8 h-8 skeleton rounded-full" />
              <div className="flex-1 space-y-2"><div className="h-3 skeleton rounded w-2/3" /><div className="h-2 skeleton rounded w-1/3" /></div>
            </div>
          )) : data?.recent_activity?.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">No recent activity</div>
          ) : data?.recent_activity?.map((log, i) => (
            <div key={i} className="px-6 py-4 flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 text-xs font-bold flex-shrink-0">
                {log.user_name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-700 dark:text-gray-300 truncate">{log.action}</div>
                <div className="text-xs text-gray-400 mt-0.5">{log.user_name} · {formatDateTime(log.created_at)}</div>
              </div>
              <span className={`badge flex-shrink-0 ${log.user_role === 'admin' || log.role === 'admin' ? 'badge-red' : log.user_role === 'teacher' || log.role === 'teacher' ? 'badge-purple' : 'badge-blue'}`}>{log.user_role || log.role}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
