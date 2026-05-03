import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { teacherAPI } from '../../services/api';
import { Table, Pagination } from '../../components/common/Table';
import SearchBar from '../../components/common/SearchBar';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { formatDateTime } from '../../utils/helpers';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiBarChart2 } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function TeacherExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const pageSize = 10;
  const navigate = useNavigate();

  const fetchExams = () => {
    setLoading(true);
    teacherAPI.getExams({ search, page, limit: pageSize })
      .then(r => { setExams(r.data?.exams || []); setTotal(r.data?.total || 0); })
      .finally(() => setLoading(false));
  };

  useEffect(fetchExams, [search, page]);

  const handleDelete = async () => {
    try {
      await teacherAPI.deleteExam(deleteTarget.id);
      toast.success('Exam deleted');
      fetchExams();
    } catch {}
  };

  const handlePublish = async (examId) => {
    try {
      await teacherAPI.publishResults(examId);
      toast.success('Results published!');
      fetchExams();
    } catch {}
  };

  const columns = [
    { key: 'title', label: 'Title', render: (v, row) => (
      <div>
        <div className="font-medium text-gray-900 dark:text-white">{v}</div>
        <div className="text-xs text-gray-400 mt-0.5">{row.course_name}</div>
      </div>
    )},
    { key: 'exam_type', label: 'Type', render: (v) => <span className={`badge ${v === 'final' ? 'badge-red' : v === 'midterm' ? 'badge-purple' : 'badge-blue'} capitalize`}>{v}</span> },
    { key: 'start_time', label: 'Start', render: (v) => formatDateTime(v) },
    { key: 'duration_minutes', label: 'Duration', render: (v) => `${v} min` },
    { key: 'total_marks', label: 'Marks' },
    { key: 'status', label: 'Status', render: (v) => <span className={`badge ${v === 'published' ? 'badge-green' : 'badge-yellow'}`}>{v}</span> },
    { key: 'submissions_count', label: 'Submissions', render: (v) => v || 0 },
    { key: 'id', label: 'Actions', render: (v, row) => (
      <div className="flex items-center gap-1">
        <button onClick={() => navigate(`/teacher/exams/${v}/edit`)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 hover:text-primary-600 transition-colors" title="Edit">
          <FiEdit2 size={14} />
        </button>
        <button onClick={() => navigate(`/teacher/exams/${v}/submissions`)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 hover:text-blue-600 transition-colors" title="Submissions">
          <FiEye size={14} />
        </button>
        <button onClick={() => navigate(`/teacher/analytics?exam=${v}`)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 hover:text-green-600 transition-colors" title="Analytics">
          <FiBarChart2 size={14} />
        </button>
        {row.status !== 'published' && (
          <button onClick={() => handlePublish(v)} className="text-xs px-2 py-1 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 transition-colors" title="Publish">
            Publish
          </button>
        )}
        <button onClick={() => setDeleteTarget(row)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-500 transition-colors" title="Delete">
          <FiTrash2 size={14} />
        </button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Exams</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create and manage your examinations</p>
        </div>
        <button onClick={() => navigate('/teacher/exams/new')} className="btn-primary flex items-center gap-2">
          <FiPlus size={16} /> New Exam
        </button>
      </div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search exams..." className="max-w-md" />
      <div className="table-container">
        <Table columns={columns} data={exams} loading={loading} emptyMessage="No exams yet. Create your first exam!" />
        {total > pageSize && <Pagination page={page} totalPages={Math.ceil(total / pageSize)} total={total} pageSize={pageSize} onPageChange={setPage} />}
      </div>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Exam" message={`Are you sure you want to delete "${deleteTarget?.title}"? This will also delete all submissions.`}
        confirmLabel="Delete" danger />
    </div>
  );
}
