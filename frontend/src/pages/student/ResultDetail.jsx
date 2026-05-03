import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { generateResultPDF } from '../../utils/pdfGenerator';
import { formatDateTime, getGradeBadge } from '../../utils/helpers';
import { FiDownload, FiArrowLeft, FiCheck, FiX } from 'react-icons/fi';

export default function ResultDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    studentAPI.getResult(id).then(r => { setResult(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!result) return <div className="card p-8 text-center text-gray-400">Result not found</div>;

  const { exam, submission, questions = [] } = result;
  const score = submission?.score || 0;
  const total = submission?.total_marks || exam?.total_marks || 100;
  const pct = Math.round((score / total) * 100);
  const { label: grade, cls: gradeCls } = getGradeBadge(score, total);
  const pass = pct >= 50;

  return (
    <div className="space-y-6 animate-slide-up max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl btn-secondary">
            <FiArrowLeft size={16} />
          </button>
          <div>
            <h1 className="page-title">{exam?.title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{formatDateTime(submission?.submitted_at)}</p>
          </div>
        </div>
        <button onClick={() => generateResultPDF(result, user)} className="btn-primary flex items-center gap-2">
          <FiDownload size={15} /> Download PDF
        </button>
      </div>

      {/* Score Card */}
      <div className={`card p-8 flex items-center gap-8 ${pass ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-red-500'}`}>
        <div className="text-center">
          <div className={`text-5xl font-display font-bold ${pass ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{pct}%</div>
          <div className="text-gray-500 dark:text-gray-400 text-sm mt-1">{score} / {total} marks</div>
        </div>
        <div className="h-16 w-px bg-gray-100 dark:bg-[#2d3148]" />
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className={`badge text-base px-4 py-1.5 ${gradeCls}`}>Grade: {grade}</span>
            <span className={`badge text-sm ${pass ? 'badge-green' : 'badge-red'}`}>{pass ? '✓ Passed' : '✗ Failed'}</span>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{exam?.course_name} · {exam?.exam_type}</div>
        </div>
      </div>

      {/* Questions */}
      {questions.length > 0 && submission?.result_published && (
        <div className="space-y-4">
          <h2 className="section-title">Answer Review</h2>
          {questions.map((q, i) => {
            const correct = q.is_correct;
            const isSubjective = q.question_type === 'short_answer';
            return (
              <div key={q.id} className={`card p-6 border-l-4 ${isSubjective ? 'border-l-blue-400' : correct ? 'border-l-emerald-400' : 'border-l-red-400'}`}>
                <div className="flex items-start justify-between">
                  <p className="font-medium text-gray-900 dark:text-white">{i + 1}. {q.question_text}</p>
                  <div className="flex items-center gap-2 ml-4">
                    {!isSubjective && (
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${correct ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-red-100 dark:bg-red-900/30 text-red-500'}`}>
                        {correct ? <FiCheck size={14} /> : <FiX size={14} />}
                      </div>
                    )}
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{q.marks_obtained || 0}/{q.marks}</span>
                  </div>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="text-gray-500 dark:text-gray-400">Your answer: <span className={`font-medium ${!isSubjective && !correct ? 'text-red-500' : 'text-gray-800 dark:text-gray-200'}`}>{q.student_answer || '(No answer)'}</span></div>
                  {!isSubjective && q.correct_answer && <div className="text-gray-500 dark:text-gray-400">Correct answer: <span className="font-medium text-emerald-600 dark:text-emerald-400">{q.correct_answer}</span></div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
