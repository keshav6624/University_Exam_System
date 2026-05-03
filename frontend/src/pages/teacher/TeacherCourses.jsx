import React, { useState, useEffect } from 'react';
import { teacherAPI } from '../../services/api';
import Modal from '../../components/common/Modal';
import SearchBar from '../../components/common/SearchBar';
import toast from 'react-hot-toast';
import { FiPlus, FiBook, FiUsers, FiEdit2 } from 'react-icons/fi';

export default function TeacherCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [editing, setEditing] = useState(null);

  const fetchCourses = () => {
    teacherAPI.getCourses({ search }).then(r => { setCourses(r.data?.courses || []); setLoading(false); });
  };
  useEffect(() => { fetchCourses(); }, [search]);

  const openCreate = () => { setEditing(null); setForm({ name: '', code: '', description: '' }); setModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, code: c.code, description: c.description }); setModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.code) return toast.error('Name and code required');
    try {
      if (editing) { await teacherAPI.updateCourse(editing.id, form); toast.success('Course updated'); }
      else { await teacherAPI.createCourse(form); toast.success('Course created'); }
      setModal(false); fetchCourses();
    } catch {}
  };

  const filtered = courses.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.code?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Courses</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your teaching courses</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <FiPlus size={16} /> New Course
        </button>
      </div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search courses..." className="max-w-md" />
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 skeleton rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center text-gray-400 dark:text-gray-500 text-sm">No courses found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="card p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-primary-600 flex items-center justify-center">
                  <FiBook size={22} className="text-white" />
                </div>
                <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-primary-600 transition-colors">
                  <FiEdit2 size={15} />
                </button>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mt-4">{c.name}</h3>
              <div className="text-xs font-mono text-primary-600 dark:text-primary-400 mt-1">{c.code}</div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{c.description}</p>
              <div className="mt-4 pt-4 border-t border-gray-50 dark:border-[#2d3148] flex items-center text-xs text-gray-400 gap-1">
                <FiUsers size={12} />{c.enrolled_count || 0} enrolled
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Course' : 'Create Course'}
        footer={
          <>
            <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} className="btn-primary">Save</button>
          </>
        }>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Course Name *</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Data Structures and Algorithms" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Course Code *</label>
            <input className="input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. CS301" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
            <textarea className="input" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Course description..." />
          </div>
        </div>
      </Modal>
    </div>
  );
}
