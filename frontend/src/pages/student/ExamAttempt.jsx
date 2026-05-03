import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { formatSeconds, shuffleArray } from '../../utils/helpers';
import { FiFlag, FiChevronLeft, FiChevronRight, FiSend, FiAlertTriangle, FiMaximize } from 'react-icons/fi';
import Modal from '../../components/common/Modal';

export default function ExamAttempt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [tabWarnings, setTabWarnings] = useState(0);
  const [fullscreenWarning, setFullscreenWarning] = useState(false);
  const timerRef = useRef(null);
  const startedRef = useRef(false);

  const handleSubmit = useCallback(async (auto = false) => {
    if (submitting) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const payload = {
        answers: Object.entries(answers).map(([qId, answer]) => ({ question_id: parseInt(qId), answer })),
        auto_submitted: auto,
        time_taken: exam ? (exam.duration_minutes * 60) - timeLeft : 0,
      };
      const res = await studentAPI.submitExam(id, payload);
      toast.success('Exam submitted successfully!');
      navigate(`/student/results/${res.data.submission_id}`);
    } catch {
      setSubmitting(false);
    }
  }, [answers, exam, id, navigate, submitting, timeLeft]);

  // Anti-cheat: tab switch detection
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && !loading) {
        const warns = tabWarnings + 1;
        setTabWarnings(warns);
        toast.error(`⚠️ Tab switch detected! Warning ${warns}/3`, { duration: 4000 });
        if (warns >= 3) {
          toast.error('Auto-submitting due to multiple tab switches!', { duration: 5000 });
          handleSubmit(true);
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [tabWarnings, loading, handleSubmit]);

  // Fullscreen enforcement
  useEffect(() => {
    const onFSChange = () => {
      if (!document.fullscreenElement && !loading && exam) {
        setFullscreenWarning(true);
      }
    };
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, [loading, exam]);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await studentAPI.startExam(id);
        const { exam: e, questions: qs, time_remaining } = res.data;
        setExam(e);
        setQuestions(e.shuffle_questions ? shuffleArray(qs) : qs);
        setTimeLeft(time_remaining || e.duration_minutes * 60);
        startedRef.current = true;
      } catch { navigate('/student/exams'); }
      finally { setLoading(false); }
    };
    init();
  }, [id, navigate]);

  // Timer
  useEffect(() => {
    if (timeLeft === null || !startedRef.current) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          toast.error('Time is up! Auto-submitting...', { duration: 5000 });
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timeLeft === null]); // eslint-disable-line

  const enterFullscreen = () => {
    document.documentElement.requestFullscreen();
    setFullscreenWarning(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="text-gray-500 dark:text-gray-400">Loading exam...</div>
      </div>
    </div>
  );

  const q = questions[current];
  const answered = Object.keys(answers).length;
  const pct = timeLeft / (exam?.duration_minutes * 60);
  const timerCritical = timeLeft < 300; // 5 min

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white dark:bg-[#1a1d27] border-b border-gray-100 dark:border-[#2d3148] shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-gray-900 dark:text-white text-sm">{exam?.title}</h1>
            <div className="text-xs text-gray-500 dark:text-gray-400">{answered}/{questions.length} answered</div>
          </div>

          {/* Timer */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-lg ${
            timerCritical ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 timer-critical' :
            'bg-gray-50 dark:bg-[#111420] text-gray-800 dark:text-gray-200'
          }`}>
            {formatSeconds(timeLeft || 0)}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={enterFullscreen} className="btn-secondary py-2 px-3 text-sm flex items-center gap-1.5">
              <FiMaximize size={14} /> Fullscreen
            </button>
            <button onClick={() => setConfirmSubmit(true)} className="btn-primary py-2 flex items-center gap-2">
              <FiSend size={14} /> Submit
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-[#111420]">
          <div className={`h-full transition-all duration-300 ${timerCritical ? 'bg-red-500' : 'bg-primary-600'}`}
            style={{ width: `${pct * 100}%` }} />
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-6 py-6 flex gap-6 flex-1">
        {/* Question Panel */}
        <div className="flex-1 space-y-6">
          {q && (
            <div className="card p-8 animate-slide-up">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Question {current + 1} of {questions.length}</span>
                    <span className="badge badge-blue capitalize">{q.question_type?.replace('_', ' ')}</span>
                    <span className="text-xs text-gray-400">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                    {exam?.negative_marking > 0 && <span className="text-xs text-red-500">-{exam.negative_marking} on wrong</span>}
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium text-lg leading-relaxed">{q.question_text}</p>
                </div>
                <button onClick={() => setFlagged(prev => { const n = new Set(prev); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; })}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ml-4 ${flagged.has(q.id) ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20'}`}>
                  <FiFlag size={18} />
                </button>
              </div>

              {/* MCQ Options */}
              {q.question_type === 'mcq' && (
                <div className="space-y-3">
                  {q.options?.map((opt, i) => (
                    <button key={i} onClick={() => setAnswers(a => ({ ...a, [q.id]: opt.text }))}
                      className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-150 text-sm
                        ${answers[q.id] === opt.text
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                          : 'border-gray-100 dark:border-[#2d3148] hover:border-primary-300 dark:hover:border-primary-700 text-gray-700 dark:text-gray-300'
                        }`}>
                      <span className="font-semibold mr-3 text-gray-400">{String.fromCharCode(65 + i)}.</span>
                      {opt.text}
                    </button>
                  ))}
                </div>
              )}

              {/* True/False */}
              {q.question_type === 'true_false' && (
                <div className="flex gap-4">
                  {['True', 'False'].map((opt) => (
                    <button key={opt} onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
                      className={`flex-1 py-4 rounded-xl border-2 font-semibold transition-all ${
                        answers[q.id] === opt ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : 'border-gray-100 dark:border-[#2d3148] text-gray-700 dark:text-gray-300 hover:border-primary-300'
                      }`}>{opt}</button>
                  ))}
                </div>
              )}

              {/* Short Answer */}
              {q.question_type === 'short_answer' && (
                <textarea
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                  rows={5}
                  placeholder="Type your answer here..."
                  className="input resize-none"
                />
              )}
            </div>
          )}

          {/* Nav Buttons */}
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}
              className="btn-secondary flex items-center gap-2 disabled:opacity-40">
              <FiChevronLeft size={16} /> Previous
            </button>
            <span className="text-sm text-gray-400">{current + 1} / {questions.length}</span>
            <button onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))} disabled={current === questions.length - 1}
              className="btn-secondary flex items-center gap-2 disabled:opacity-40">
              Next <FiChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Question Navigator */}
        <div className="w-56 flex-shrink-0 hidden lg:block">
          <div className="card p-4 sticky top-24">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Navigator</h3>
            <div className="grid grid-cols-5 gap-1.5 mb-4">
              {questions.map((q2, i) => (
                <button key={i} onClick={() => setCurrent(i)}
                  className={`w-9 h-9 rounded-lg text-xs font-semibold transition-all ${
                    i === current ? 'bg-primary-600 text-white' :
                    flagged.has(q2.id) ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                    answers[q2.id] ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                    'bg-gray-100 dark:bg-[#111420] text-gray-500 dark:text-gray-400'
                  }`}>{i + 1}</button>
              ))}
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30 border border-green-200" /><span className="text-gray-500 dark:text-gray-400">Answered</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-orange-100 dark:bg-orange-900/30 border border-orange-200" /><span className="text-gray-500 dark:text-gray-400">Flagged</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-gray-100 dark:bg-[#111420] border border-gray-200 dark:border-[#2d3148]" /><span className="text-gray-500 dark:text-gray-400">Not answered</span></div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#2d3148] text-sm text-gray-600 dark:text-gray-300">
              <div>{answered} / {questions.length} answered</div>
              {flagged.size > 0 && <div className="text-orange-500 mt-1">{flagged.size} flagged</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Submit Modal */}
      <Modal open={confirmSubmit} onClose={() => setConfirmSubmit(false)} title="Submit Exam" size="sm"
        footer={
          <>
            <button onClick={() => setConfirmSubmit(false)} className="btn-secondary">Continue Exam</button>
            <button onClick={() => { setConfirmSubmit(false); handleSubmit(false); }} className="btn-primary">Submit Now</button>
          </>
        }>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
            <FiAlertTriangle size={20} className="text-orange-500" />
          </div>
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              You've answered <strong>{answered}</strong> out of <strong>{questions.length}</strong> questions.
              {questions.length - answered > 0 && <span className="text-red-500"> {questions.length - answered} unanswered.</span>}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Once submitted, you cannot change your answers.</p>
          </div>
        </div>
      </Modal>

      {/* Fullscreen Warning */}
      <Modal open={fullscreenWarning} onClose={() => setFullscreenWarning(false)} title="Fullscreen Required" size="sm"
        footer={<button onClick={enterFullscreen} className="btn-primary">Enter Fullscreen</button>}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <FiMaximize size={20} className="text-red-500" />
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">This exam must be taken in fullscreen mode. Exiting fullscreen may flag your submission.</p>
        </div>
      </Modal>
    </div>
  );
}
