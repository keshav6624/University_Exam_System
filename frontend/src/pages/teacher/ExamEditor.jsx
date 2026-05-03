import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { teacherAPI } from '../../services/api';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiSave, FiArrowLeft, FiEdit2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';

const defaultExam = {
  title: '', course_id: '', exam_type: 'quiz', description: '',
  start_time: '', end_time: '', duration_minutes: 60, total_marks: 100,
  pass_marks: 40, negative_marking: 0, shuffle_questions: false, instructions: '',
};

const defaultQuestion = {
  question_text: '', question_type: 'mcq', marks: 1,
  options: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }],
  correct_answer: '', explanation: '',
};

export default function ExamEditor() {
  const { id } = useParams();
  const isEdit = id && id !== 'new';
  const navigate = useNavigate();
  const [exam, setExam] = useState(defaultExam);
  const [questions, setQuestions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [qModal, setQModal] = useState(false);
  const [editingQ, setEditingQ] = useState(null);
  const [qForm, setQForm] = useState(defaultQuestion);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    teacherAPI.getCourses().then(r => setCourses(r.data?.courses || []));
    if (isEdit) {
      teacherAPI.getExam(id).then(r => {
        setExam(r.data?.exam || defaultExam);
        setQuestions(r.data?.questions || []);
        setLoading(false);
      }).catch(() => { navigate('/teacher/exams'); });
    }
  }, [id, isEdit, navigate]);

  const handleSaveExam = async () => {
    if (!exam.title || !exam.course_id || !exam.start_time || !exam.end_time) {
      return toast.error('Please fill all required fields');
    }
    setSaving(true);
    try {
      if (isEdit) {
        await teacherAPI.updateExam(id, exam);
        toast.success('Exam updated!');
      } else {
        const res = await teacherAPI.createExam(exam);
        toast.success('Exam created!');
        navigate(`/teacher/exams/${res.data.id}/edit`);
      }
    } finally { setSaving(false); }
  };

  const openAddQuestion = () => {
    setEditingQ(null);
    setQForm(defaultQuestion);
    setQModal(true);
  };

  const openEditQuestion = (q) => {
    setEditingQ(q);
    setQForm({ ...q, options: q.options || [{ text: '' }, { text: '' }, { text: '' }, { text: '' }] });
    setQModal(true);
  };

  const handleSaveQuestion = async () => {
    if (!qForm.question_text) return toast.error('Question text is required');
    if (qForm.question_type === 'mcq' && !qForm.correct_answer) return toast.error('Please set correct answer');
    try {
      if (editingQ) {
        await teacherAPI.updateQuestion(id, editingQ.id, qForm);
        setQuestions(qs => qs.map(q => q.id === editingQ.id ? { ...q, ...qForm } : q));
        toast.success('Question updated');
      } else {
        const res = await teacherAPI.addQuestion(id, qForm);
        setQuestions(qs => [...qs, res.data.question]);
        toast.success('Question added');
      }
      setQModal(false);
    } catch {}
  };

  const handleDeleteQuestion = async (qId) => {
    try {
      await teacherAPI.deleteQuestion(id, qId);
      setQuestions(qs => qs.filter(q => q.id !== qId));
      toast.success('Question deleted');
    } catch {}
  };

  const totalQuestionMarks = questions.reduce((s, q) => s + (q.marks || 0), 0);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-slide-up max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/teacher/exams')} className="p-2 btn-secondary rounded-xl">
            <FiArrowLeft size={16} />
          </button>
          <div>
            <h1 className="page-title">{isEdit ? 'Edit Exam' : 'Create Exam'}</h1>
            {isEdit && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{questions.length} questions · {totalQuestionMarks} marks</p>}
          </div>
        </div>
        <button onClick={handleSaveExam} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSave size={15} />}
          {isEdit ? 'Save Changes' : 'Create Exam'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-[#111420] rounded-xl w-fit">
        {['details', isEdit && 'questions'].filter(Boolean).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === tab ? 'bg-white dark:bg-[#1a1d27] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
            {tab} {tab === 'questions' && `(${questions.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'details' && (
        <div className="card p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Exam Title *</label>
              <input className="input" value={exam.title} onChange={e => setExam(ex => ({ ...ex, title: e.target.value }))} placeholder="e.g. Midterm Examination - Data Structures" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Course *</label>
              <select className="input" value={exam.course_id} onChange={e => setExam(ex => ({ ...ex, course_id: e.target.value }))}>
                <option value="">Select course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Exam Type *</label>
              <select className="input" value={exam.exam_type} onChange={e => setExam(ex => ({ ...ex, exam_type: e.target.value }))}>
                <option value="quiz">Quiz</option>
                <option value="midterm">Midterm</option>
                <option value="final">Final</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Time *</label>
              <input type="datetime-local" className="input" value={exam.start_time} onChange={e => setExam(ex => ({ ...ex, start_time: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Time *</label>
              <input type="datetime-local" className="input" value={exam.end_time} onChange={e => setExam(ex => ({ ...ex, end_time: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Duration (minutes)</label>
              <input type="number" className="input" value={exam.duration_minutes} min={1} onChange={e => setExam(ex => ({ ...ex, duration_minutes: parseInt(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Total Marks</label>
              <input type="number" className="input" value={exam.total_marks} min={1} onChange={e => setExam(ex => ({ ...ex, total_marks: parseInt(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pass Marks</label>
              <input type="number" className="input" value={exam.pass_marks} min={0} onChange={e => setExam(ex => ({ ...ex, pass_marks: parseInt(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Negative Marking (per wrong)</label>
              <input type="number" className="input" value={exam.negative_marking} min={0} step={0.25} onChange={e => setExam(ex => ({ ...ex, negative_marking: parseFloat(e.target.value) }))} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Instructions</label>
            <textarea className="input" rows={3} value={exam.instructions} onChange={e => setExam(ex => ({ ...ex, instructions: e.target.value }))} placeholder="Exam instructions for students..." />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-[#111420]">
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Shuffle Questions</div>
              <div className="text-xs text-gray-400 mt-0.5">Randomize question order for each student</div>
            </div>
            <button onClick={() => setExam(ex => ({ ...ex, shuffle_questions: !ex.shuffle_questions }))}
              className={`transition-colors ${exam.shuffle_questions ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`}>
              {exam.shuffle_questions ? <FiToggleRight size={32} /> : <FiToggleLeft size={32} />}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'questions' && isEdit && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">{questions.length} questions · {totalQuestionMarks} total marks</div>
            <button onClick={openAddQuestion} className="btn-primary flex items-center gap-2">
              <FiPlus size={15} /> Add Question
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="card py-16 text-center">
              <div className="text-gray-400 dark:text-gray-500 text-sm mb-4">No questions yet</div>
              <button onClick={openAddQuestion} className="btn-primary inline-flex items-center gap-2">
                <FiPlus size={15} /> Add First Question
              </button>
            </div>
          ) : questions.map((q, i) => (
            <div key={q.id} className="card p-5 flex items-start gap-4">
              <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-sm flex-shrink-0">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 dark:text-white font-medium">{q.question_text}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="badge badge-blue capitalize">{q.question_type?.replace('_', ' ')}</span>
                  <span className="text-xs text-gray-400">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                  {q.correct_answer && <span className="text-xs text-gray-400">Answer: <span className="text-emerald-600 dark:text-emerald-400">{q.correct_answer}</span></span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEditQuestion(q)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-primary-600 transition-colors">
                  <FiEdit2 size={14} />
                </button>
                <button onClick={() => handleDeleteQuestion(q.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Question Modal */}
      <Modal open={qModal} onClose={() => setQModal(false)} title={editingQ ? 'Edit Question' : 'Add Question'} size="lg"
        footer={
          <>
            <button onClick={() => setQModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSaveQuestion} className="btn-primary">Save Question</button>
          </>
        }>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Question Text *</label>
            <textarea className="input" rows={3} value={qForm.question_text} onChange={e => setQForm(f => ({ ...f, question_text: e.target.value }))} placeholder="Enter question..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
              <select className="input" value={qForm.question_type} onChange={e => setQForm(f => ({ ...f, question_type: e.target.value, correct_answer: '', options: f.options }))}>
                <option value="mcq">Multiple Choice (MCQ)</option>
                <option value="true_false">True/False</option>
                <option value="short_answer">Short Answer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Marks</label>
              <input type="number" className="input" value={qForm.marks} min={0.5} step={0.5} onChange={e => setQForm(f => ({ ...f, marks: parseFloat(e.target.value) }))} />
            </div>
          </div>

          {qForm.question_type === 'mcq' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Options (select correct answer)</label>
              {qForm.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-3">
                  <input type="radio" name="correct" checked={qForm.correct_answer === opt.text && opt.text !== ''}
                    onChange={() => setQForm(f => ({ ...f, correct_answer: opt.text }))} className="accent-primary-600" />
                  <input className="input flex-1" placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    value={opt.text} onChange={e => {
                      const opts = [...qForm.options];
                      opts[i] = { text: e.target.value };
                      setQForm(f => ({ ...f, options: opts }));
                    }} />
                </div>
              ))}
            </div>
          )}

          {qForm.question_type === 'true_false' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Correct Answer</label>
              <div className="flex gap-3">
                {['True', 'False'].map(opt => (
                  <button key={opt} onClick={() => setQForm(f => ({ ...f, correct_answer: opt }))}
                    className={`flex-1 py-3 rounded-xl border-2 font-semibold transition-all ${qForm.correct_answer === opt ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : 'border-gray-200 dark:border-[#2d3148] text-gray-500'}`}>{opt}</button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Explanation (optional)</label>
            <textarea className="input" rows={2} value={qForm.explanation} onChange={e => setQForm(f => ({ ...f, explanation: e.target.value }))} placeholder="Explanation shown after result is published..." />
          </div>
        </div>
      </Modal>
    </div>
  );
}
