import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import Modal from '../../components/common/Modal';
import SearchBar from '../../components/common/SearchBar';
import { Table, Pagination } from '../../components/common/Table';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiUserX, FiUserCheck } from 'react-icons/fi';
import { formatDate } from '../../utils/helpers';

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', department_id: '' });
  const [editing, setEditing] = useState(null);

  const fetch = () => {
    setLoading(true);
    adminAPI.getTeachers({ search, page, limit: 10 })
      .then(r => { setTeachers(r.data?.teachers || []); setTotal(r.data?.total || 0); })
      .finally(() => setLoading(false));
  };
  useEffect(fetch, [search, page]);
  useEffect(() => { adminAPI.getDepts({ limit: 100 }).then(r => setDepts(r.data?.departments || [])); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', email: '', password: '', department_id: '' }); setModal(true); };
  const openEdit = (t) => { setEditing(t); setForm({ name: t.name, email: t.email, password: '', department_id: t.department_id }); setModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.email || (!editing && !form.password)) return toast.error('Please fill required fields');
    try {
      if (editing) { await adminAPI.updateTeacher(editing.id, form); toast.success('Teacher updated'); }
      else { await adminAPI.createTeacher(form); toast.success('Teacher added'); }
      setModal(false); fetch();
    } catch {}
  };

  const toggleStatus = async (t) => {
    const newStatus = t.status === 'active' ? 'suspended' : 'active';
    await adminAPI.updateUserStatus(t.id, newStatus);
    toast.success(`User ${newStatus}`);
    fetch();
  };

  const columns = [
    { key: 'name', label: 'Teacher', render: (v, row) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{v?.charAt(0)?.toUpperCase()}</div>
        <div><div className="font-medium text-gray-900 dark:text-white">{v}</div><div className="text-xs text-gray-400">{row.email}</div></div>
      </div>
    )},
    { key: 'department_name', label: 'Department', render: v => v || '—' },
    { key: 'courses_count', label: 'Courses', render: v => v || 0 },
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
        <div><h1 className="page-title">Teachers</h1><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage teacher accounts</p></div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2"><FiPlus size={16} /> Add Teacher</button>
      </div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search teachers..." className="max-w-md" />
      <div className="table-container">
        <Table columns={columns} data={teachers} loading={loading} emptyMessage="No teachers found" />
        {total > 10 && <Pagination page={page} totalPages={Math.ceil(total / 10)} total={total} pageSize={10} onPageChange={setPage} />}
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Teacher' : 'Add Teacher'}
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
    </div>
  );
}
