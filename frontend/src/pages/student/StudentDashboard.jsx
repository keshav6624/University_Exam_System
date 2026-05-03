import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { studentAPI } from '../../services/api';
import StatCard from '../../components/common/StatCard';
import { FiBook, FiClipboard, FiAward, FiClock, FiArrowRight } from 'react-icons/fi';
import { formatDateTime, getExamStatus } from '../../utils/helpers';
import { format } from 'date-fns';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    studentAPI.getDashboard().then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const stats = [
    { icon: FiBook, label: 'Enrolled Courses', value: data?.stats?.courses ?? 0, color: 'primary' },
    { icon: FiClipboard, label: 'Upcoming Exams', value: data?.stats?.upcoming_exams ?? 0, color: 'blue' },
    { icon: FiAward, label: 'Completed Exams', value: data?.stats?.completed_exams ?? 0, color: 'green' },
    { icon: FiClock, label: 'Avg. Score', value: data?.stats?.avg_score ? `${data.stats.avg_score}%` : '—', color: 'orange' },
  ];

  const statusColors = { upcoming: 'badge-blue', active: 'badge-green', ended: 'badge-red' };

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Welcome */}
      <div>
        <h1 className="page-title">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{format(new Date(), 'EEEE, MMMM do yyyy')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Upcoming Exams */}
        <div className="card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 dark:border-[#2d3148]">
            <h2 className="section-title">Upcoming Exams</h2>
            <button onClick={() => navigate('/student/exams')} className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
              View all <FiArrowRight size={14} />
            </button>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-[#2d3148]">
            {loading ? [...Array(3)].map((_, i) => (
              <div key={i} className="px-6 py-4 space-y-2">
                <div className="h-4 skeleton rounded w-3/4" />
                <div className="h-3 skeleton rounded w-1/2" />
              </div>
            )) : data?.upcoming_exams?.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">No upcoming exams</div>
            ) : data?.upcoming_exams?.slice(0, 5).map((exam) => {
              const status = getExamStatus(exam);
              return (
                <div key={exam.id} className="px-6 py-4 flex items-center justify-between group">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{exam.title}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{exam.course_name} • {formatDateTime(exam.start_time)}</div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span className={`badge ${statusColors[status]}`}>{status}</span>
                    {status === 'active' && (
                      <button onClick={() => navigate(`/student/exam/${exam.id}`)} className="btn-primary py-1.5 text-xs">
                        Start
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Results */}
        <div className="card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 dark:border-[#2d3148]">
            <h2 className="section-title">Recent Results</h2>
            <button onClick={() => navigate('/student/results')} className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
              View all <FiArrowRight size={14} />
            </button>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-[#2d3148]">
            {loading ? [...Array(3)].map((_, i) => (
              <div key={i} className="px-6 py-4 space-y-2">
                <div className="h-4 skeleton rounded w-3/4" />
                <div className="h-3 skeleton rounded w-1/2" />
              </div>
            )) : data?.recent_results?.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">No results yet</div>
            ) : data?.recent_results?.slice(0, 5).map((result) => {
              const pct = result.total_marks > 0 ? Math.round((result.score / result.total_marks) * 100) : 0;
              return (
                <div key={result.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{result.exam_title}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{result.course_name}</div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <div className={`text-sm font-bold ${pct >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                      {pct}%
                    </div>
                    <span className={`badge ${pct >= 50 ? 'badge-green' : 'badge-red'}`}>
                      {pct >= 50 ? 'Pass' : 'Fail'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
