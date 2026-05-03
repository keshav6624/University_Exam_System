import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { teacherAPI } from '../../services/api';
import { Table, Pagination } from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import SearchBar from '../../components/common/SearchBar';
import { formatDateTime } from '../../utils/helpers';
import { FiEdit2, FiCheck, FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function TeacherGrading() {
  const { examId } = useParams();
  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedExam, setSelectedExam] = useState(examId || '');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [gradeModal, setGradeModal] = useState(false);
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [grades, setGrades] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    teacherAPI.getExams({ limit: 100 }).then(r => setExams(r.data?.exams || []));
  }, []);

  useEffect(() => {
    if (!selectedExam) return;
    setLoading(true);
    teacherAPI.getSubmissions(selectedExam, { search, page, limit: 10 })
      .then(r => { setSubmissions(r.data?.submissions || []); setTotal(r.data?.total || 0); })
      .finally(() => setLoading(false));
  }, [selectedExam, search, page]);

  const openGrading = (sub) => {
    setGradingSubmission(sub);
    const initGrades = {};
    sub.answers?.forEach(a => { if (a.question_type === 'short_answer') initGrades[a.question_id] = a.marks_obtained || 0; });
    setGrades(initGrades);
    setGradeModal(true);
  };

  const handleGrade = async () => {
    try {
      const gradeData = Object.entries(grades).map(([qId, marks]) => ({ question_id: parseInt(qId), marks: parseFloat(marks) }));
      await teacherAPI.gradeSubmission(gradingSubmission.id, { grades: gradeData });
      toast.success('Graded successfully!');
      setGradeModal(false);
      teacherAPI.getSubmissions(selectedExam, { page, limit: 10 }).then(r => setSubmissions(r.data?.submissions || []));
    } catch {}
  };

  const columns = [
    { key: 'student_name', label: 'Student' },
    { key: 'submitted_at', label: 'Submitted', render: (v) => formatDateTime(v) },
    { key: 'score', label: 'Score', render: (v, row) => {
      const pct = row.total_marks ? Math.round((v / row.total_marks) * 100) : 0;
      return <span className={`font-semibold ${pct >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{v ?? '—'} / {row.total_marks}</span>;
    }},
    { key: 'auto_submitted', label: 'Submit Type', render: (v) => <span className={`badge ${v ? 'badge-yellow' : 'badge-green'}`}>{v ? 'Auto' : 'Manual'}</span> },
    { key: 'grading_status', label: 'Status', render: (v) => <span className={`badge ${v === 'graded' ? 'badge-green' : 'badge-yellow'}`}>{v || 'pending'}</span> },
    { key: 'id', label: 'Actions', render: (_, row) => (
      <button onClick={() => openGrading(row)} className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5">
        <FiEdit2 size={12} /> Grade
      </button>
    )},
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="page-title">Grading</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Review and grade student submissions</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <select className="input max-w-xs" value={selectedExam} onChange={e => { setSelectedExam(e.target.value); setPage(1); }}>
          <option value="">Select an exam...</option>
          {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
        {selectedExam && <SearchBar value={search} onChange={setSearch} placeholder="Search student..." className="max-w-xs" />}
      </div>

      {selectedExam && (
        <div className="table-container">
          <Table columns={columns} data={submissions} loading={loading} emptyMessage="No submissions for this exam" />
          {total > 10 && <Pagination page={page} totalPages={Math.ceil(total / 10)} total={total} pageSize={10} onPageChange={setPage} />}
        </div>
      )}

      {/* Grading Modal */}
      <Modal open={gradeModal} onClose={() => setGradeModal(false)} title="Grade Submission" size="xl"
        footer={
          <>
            <button onClick={() => setGradeModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleGrade} className="btn-primary flex items-center gap-2"><FiCheck size={14} /> Save Grades</button>
          </>
        }>
        {gradingSubmission && (
          <div className="space-y-5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-900 dark:text-white">{gradingSubmission.student_name}</span>
              <span className="text-gray-500 dark:text-gray-400">{formatDateTime(gradingSubmission.submitted_at)}</span>
            </div>
            {gradingSubmission.answers?.map((a, i) => (
              <div key={a.question_id} className="p-4 rounded-xl border border-gray-100 dark:border-[#2d3148] bg-gray-50 dark:bg-[#111420]">
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">{i + 1}. {a.question_text}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Answer: <span className="font-medium">{a.student_answer || '(No answer)'}</span>
                </div>
                {a.question_type !== 'short_answer' ? (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span className={`badge ${a.is_correct ? 'badge-green' : 'badge-red'}`}>{a.is_correct ? 'Correct' : 'Incorrect'}</span>
                    <span className="text-gray-400">{a.marks_obtained}/{a.marks} marks</span>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-3">
                    <label className="text-sm text-gray-500 dark:text-gray-400">Marks:</label>
                    <input type="number" min={0} max={a.marks} step={0.5}
                      value={grades[a.question_id] ?? ''}
                      onChange={e => setGrades(g => ({ ...g, [a.question_id]: e.target.value }))}
                      className="input w-20 text-center" />
                    <span className="text-sm text-gray-400">/ {a.marks}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
