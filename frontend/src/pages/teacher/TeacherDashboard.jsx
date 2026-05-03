import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { teacherAPI } from '../../services/api';
import StatCard from '../../components/common/StatCard';
import { FiBook, FiFileText, FiUsers, FiBarChart2, FiArrowRight, FiPlus } from 'react-icons/fi';
import { formatDateTime } from '../../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function TeacherDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    teacherAPI.getDashboard().then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const stats = [
    { icon: FiBook, label: 'Total Courses', value: data?.stats?.courses ?? 0, color: 'primary' },
    { icon: FiFileText, label: 'Total Exams', value: data?.stats?.exams ?? 0, color: 'purple' },
    { icon: FiUsers, label: 'Total Students', value: data?.stats?.students ?? 0, color: 'blue' },
    { icon: FiBarChart2, label: 'Pending Grading', value: data?.stats?.pending_grading ?? 0, color: 'orange' },
  ];

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Teacher Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your courses and examinations</p>
        </div>
        <button onClick={() => navigate('/teacher/exams/new')} className="btn-primary flex items-center gap-2">
          <FiPlus size={16} /> Create Exam
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Score Distribution Chart */}
        <div className="xl:col-span-3 card p-6">
          <h2 className="section-title mb-4">Score Distribution (Last Exam)</h2>
          {data?.score_distribution?.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.score_distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-[#2d3148]" />
                <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, fontSize: 13 }} />
                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-40 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">No data yet</div>}
        </div>

        {/* Recent Exams */}
        <div className="xl:col-span-2 card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 dark:border-[#2d3148]">
            <h2 className="section-title">Recent Exams</h2>
            <button onClick={() => navigate('/teacher/exams')} className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
              All <FiArrowRight size={14} />
            </button>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-[#2d3148]">
            {loading ? [...Array(4)].map((_, i) => (
              <div key={i} className="px-6 py-4 space-y-2"><div className="h-4 skeleton rounded w-3/4" /><div className="h-3 skeleton rounded w-1/2" /></div>
            )) : data?.recent_exams?.slice(0, 5).map((exam) => (
              <div key={exam.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{exam.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{formatDateTime(exam.start_time)}</div>
                  </div>
                  <span className={`badge ml-3 flex-shrink-0 ${exam.status === 'published' ? 'badge-green' : 'badge-yellow'}`}>
                    {exam.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
