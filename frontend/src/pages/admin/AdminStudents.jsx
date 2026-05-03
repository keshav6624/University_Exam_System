import React, { useState, useEffect, useRef } from 'react';
import { adminAPI } from '../../services/api';
import Modal from '../../components/common/Modal';
import SearchBar from '../../components/common/SearchBar';
import { Table, Pagination } from '../../components/common/Table';
import toast from 'react-hot-toast';
import { FiPlus, FiUpload, FiEdit2, FiUserX, FiUserCheck, FiDownload } from 'react-icons/fi';
import { formatDate, downloadCSVTemplate } from '../../utils/helpers';
import Papa from 'papaparse';

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', department_id: '' });
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const fetch = () => {
    setLoading(true);
    adminAPI.getStudents({ search, page, limit: 10 })
      .then(r => { setStudents(r.data?.students || []); setTotal(r.data?.total || 0); })
      .finally(() => setLoading(false));
  };
  useEffect(fetch, [search, page]);
  useEffect(() => { adminAPI.getDepts({ limit: 100 }).then(r => setDepts(r.data?.departments || [])); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', email: '', password: '', department_id: '' }); setModal(true); };
  const openEdit = (s) => { setEditing(s); setForm({ name: s.name, email: s.email, password: '', department_id: s.department_id }); setModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.email || (!editing && !form.password)) return toast.error('Please fill required fields');
    try {
      if (editing) { await adminAPI.updateTeacher(editing.id, form); toast.success('Student updated'); }
      else { await adminAPI.createStudent(form); toast.success('Student added'); }
      setModal(false); fetch();
    } catch {}
  };

  const toggleStatus = async (s) => {
    const newStatus = s.status === 'active' ? 'suspended' : 'active';
    await adminAPI.updateUserStatus(s.id, newStatus);
    toast.success(`User ${newStatus}`);
    fetch();
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await adminAPI.bulkUploadStudents(formData);
      toast.success(`${res.data.created} students uploaded!`);
      setBulkModal(false);
      fetch();
    } catch {} finally { setUploading(false); }
  };

  const columns = [
    { key: 'name', label: 'Student', render: (v, row) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{v?.charAt(0)?.toUpperCase()}</div>
        <div><div className="font-medium text-gray-900 dark:text-white">{v}</div><div className="text-xs text-gray-400">{row.email}</div></div>
      </div>
    )},
    { key: 'department_name', label: 'Department', render: v => v || '—' },
    { key: 'enrolled_courses', label: 'Courses', render: v => v || 0 },
    { key: 'exams_taken', label: 'Exams', render: v => v || 0 },
    { key: 'created_at', label: 'Joined', render: v => formatDate(v) },
    { key: 'status', label: 'Status', render: v => <span className={`badge ${v === 'active' ? 'badge-green' : 'badge-red'}`}>{v}</span> },
    { key: 'id', label: 'Actions', render: (_, row) => (
      <div className="flex items-center gap-1">
        <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-primary-600 transition-colors"><FiEdit2 size={14} /></button>
        <button onClick={() => toggleStatus(row)} className={`p-1.5 rounded-lg transition-colors ${row.status === 'active' ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500' : 'hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-400 hover:text-green-500'}`}>
          {row.status === 'active' ? <FiUserX size={14} /> : <FiUserCheck size={14} />}
        </button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Students</h1><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage student accounts</p></div>
        <div className="flex items-center gap-2">
          <button onClick={() => setBulkModal(true)} className="btn-secondary flex items-center gap-2"><FiUpload size={15} /> Bulk Upload</button>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2"><FiPlus size={16} /> Add Student</button>
        </div>
      </div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search students..." className="max-w-md" />
      <div className="table-container">
        <Table columns={columns} data={students} loading={loading} emptyMessage="No students found" />
        {total > 10 && <Pagination page={page} totalPages={Math.ceil(total / 10)} total={total} pageSize={10} onPageChange={setPage} />}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Student' : 'Add Student'}
        footer={<><button onClick={() => setModal(false)} className="btn-secondary">Cancel</button><button onClick={handleSave} className="btn-primary">Save</button></>}>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email *</label><input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password {editing ? '(leave blank to keep)' : '*'}</label><input type="password" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Department</label>
            <select className="input" value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
              <option value="">Select department</option>
              {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      <Modal open={bulkModal} onClose={() => setBulkModal(false)} title="Bulk Upload Students" size="sm"
        footer={<button onClick={() => setBulkModal(false)} className="btn-secondary">Close</button>}>
        <div className="space-y-4">
          <button onClick={downloadCSVTemplate} className="btn-secondary w-full flex items-center justify-center gap-2">
            <FiDownload size={14} /> Download CSV Template
          </button>
          <div className="border-2 border-dashed border-gray-200 dark:border-[#2d3148] rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 transition-colors" onClick={() => fileRef.current?.click()}>
            <FiUpload size={24} className="mx-auto text-gray-400 mb-2" />
            <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">Click to upload CSV file</div>
            <div className="text-xs text-gray-400 mt-1">Format: name, email, password, department_id</div>
            <input type="file" ref={fileRef} accept=".csv" className="hidden" onChange={handleBulkUpload} />
          </div>
          {uploading && <div className="flex items-center justify-center gap-2 text-sm text-gray-500"><div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />Uploading...</div>}
        </div>
      </Modal>
    </div>
  );
}
