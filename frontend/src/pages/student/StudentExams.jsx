import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentAPI } from '../../services/api';
import SearchBar from '../../components/common/SearchBar';
import { FiClock, FiCalendar, FiPlay, FiEye } from 'react-icons/fi';
import { formatDateTime, formatDuration, getExamStatus } from '../../utils/helpers';

const statusBadge = { upcoming: 'badge-blue', active: 'badge-green', ended: 'badge-red' };
const examTypeColor = { quiz: 'badge-blue', midterm: 'badge-purple', final: 'badge-red' };

export default function StudentExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    studentAPI.getExams().then(r => { setExams(r.data?.exams || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = exams.filter(e => {
    const matchSearch = e.title?.toLowerCase().includes(search.toLowerCase()) ||
      e.course_name?.toLowerCase().includes(search.toLowerCase());
    const status = getExamStatus(e);
    const matchFilter = filter === 'all' || status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="page-title">My Exams</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View and attempt scheduled examinations</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search exams..." className="flex-1" />
        <div className="flex gap-2">
          {['all', 'upcoming', 'active', 'ended'].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${filter === f ? 'bg-primary-600 text-white' : 'btn-secondary'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 skeleton rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="text-gray-400 dark:text-gray-500 text-sm">No exams found</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((exam) => {
            const status = getExamStatus(exam);
            return (
              <div key={exam.id} className="card p-6 flex flex-col gap-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge ${examTypeColor[exam.exam_type] || 'badge-blue'}`}>{exam.exam_type}</span>
                      <span className={`badge ${statusBadge[status]}`}>{status}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mt-2">{exam.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{exam.course_name}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <FiCalendar size={14} />
                    <span>{formatDateTime(exam.start_time)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <FiClock size={14} />
                    <span>Duration: {formatDuration(exam.duration_minutes)}</span>
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">
                    Total Marks: <span className="font-semibold text-gray-700 dark:text-gray-200">{exam.total_marks}</span>
                  </div>
                </div>

                <div className="mt-auto pt-3 border-t border-gray-50 dark:border-[#2d3148]">
                  {exam.submission_id ? (
                    <button onClick={() => navigate(`/student/results/${exam.submission_id}`)}
                      className="btn-secondary w-full flex items-center justify-center gap-2">
                      <FiEye size={15} /> View Result
                    </button>
                  ) : status === 'active' ? (
                    <button onClick={() => navigate(`/student/exam/${exam.id}`)}
                      className="btn-primary w-full flex items-center justify-center gap-2">
                      <FiPlay size={15} /> Start Exam
                    </button>
                  ) : status === 'upcoming' ? (
                    <button disabled className="btn-secondary w-full opacity-60 cursor-not-allowed">Not Started Yet</button>
                  ) : (
                    <button disabled className="btn-secondary w-full opacity-60 cursor-not-allowed">Exam Ended</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
