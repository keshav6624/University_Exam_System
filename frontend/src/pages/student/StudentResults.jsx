import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentAPI } from '../../services/api';
import { Table, Pagination } from '../../components/common/Table';
import SearchBar from '../../components/common/SearchBar';
import { formatDate, getGradeBadge } from '../../utils/helpers';
import { FiEye, FiDownload } from 'react-icons/fi';

export default function StudentResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    studentAPI.getResults({ search, page, limit: pageSize })
      .then(r => { setResults(r.data?.results || []); setTotal(r.data?.total || 0); })
      .finally(() => setLoading(false));
  }, [search, page]);

  const columns = [
    { key: 'exam_title', label: 'Exam' },
    { key: 'course_name', label: 'Course' },
    { key: 'exam_type', label: 'Type', render: (v) => <span className={`badge ${v === 'final' ? 'badge-red' : v === 'midterm' ? 'badge-purple' : 'badge-blue'}`}>{v}</span> },
    { key: 'score', label: 'Score', render: (v, row) => {
      const pct = row.total_marks ? Math.round((v / row.total_marks) * 100) : 0;
      const { label, cls } = getGradeBadge(v, row.total_marks);
      return (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 dark:text-white">{v}/{row.total_marks}</span>
          <span className={`badge ${cls}`}>{label}</span>
          <span className="text-gray-400 text-xs">({pct}%)</span>
        </div>
      );
    }},
    { key: 'submitted_at', label: 'Date', render: (v) => formatDate(v) },
    { key: 'id', label: 'Actions', render: (v) => (
      <button onClick={() => navigate(`/student/results/${v}`)} className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5">
        <FiEye size={13} /> View
      </button>
    )},
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="page-title">My Results</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View your exam results and grades</p>
      </div>
      <div className="flex gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by exam or course..." className="max-w-md" />
      </div>
      <div className="table-container">
        <Table columns={columns} data={results} loading={loading} emptyMessage="No results yet" />
        {total > pageSize && (
          <Pagination page={page} totalPages={Math.ceil(total / pageSize)} total={total} pageSize={pageSize} onPageChange={setPage} />
        )}
      </div>
    </div>
  );
}
