import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import SearchBar from '../../components/common/SearchBar';
import { Table, Pagination } from '../../components/common/Table';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function AdminDepartments() {
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetch = () => {
    setLoading(true);
    adminAPI.getDepts({ search, page, limit: 10 })
      .then(r => { setDepts(r.data?.departments || []); setTotal(r.data?.total || 0); })
      .finally(() => setLoading(false));
  };
  useEffect(fetch, [search, page]);

  const openCreate = () => { setEditing(null); setForm({ name: '', code: '', description: '' }); setModal(true); };
  const openEdit = (d) => { setEditing(d); setForm({ name: d.name, code: d.code, description: d.description }); setModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.code) return toast.error('Name and code required');
    try {
      if (editing) { await adminAPI.updateDept(editing.id, form); toast.success('Department updated'); }
      else { await adminAPI.createDept(form); toast.success('Department created'); }
      setModal(false); fetch();
    } catch {}
  };

  const handleDelete = async () => {
    await adminAPI.deleteDept(deleteTarget.id);
    toast.success('Department deleted');
    fetch();
  };

  const columns = [
    { key: 'name', label: 'Department', render: (v, row) => <div><div className="font-medium text-gray-900 dark:text-white">{v}</div><div className="text-xs text-gray-400">{row.code}</div></div> },
    { key: 'description', label: 'Description', render: (v) => <span className="text-gray-500 dark:text-gray-400 text-sm">{v || '—'}</span> },
    { key: 'teacher_count', label: 'Teachers', render: v => v || 0 },
    { key: 'student_count', label: 'Students', render: v => v || 0 },
    { key: 'id', label: 'Actions', render: (_, row) => (
      <div className="flex items-center gap-1">
        <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-primary-600 transition-colors"><FiEdit2 size={14} /></button>
        <button onClick={() => setDeleteTarget(row)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"><FiTrash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Departments</h1><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage university departments</p></div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2"><FiPlus size={16} /> Add Department</button>
      </div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search departments..." className="max-w-md" />
      <div className="table-container">
        <Table columns={columns} data={depts} loading={loading} emptyMessage="No departments yet" />
        {total > 10 && <Pagination page={page} totalPages={Math.ceil(total / 10)} total={total} pageSize={10} onPageChange={setPage} />}
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Department' : 'Add Department'}
        footer={<><button onClick={() => setModal(false)} className="btn-secondary">Cancel</button><button onClick={handleSave} className="btn-primary">Save</button></>}>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Department Name *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Computer Science" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Code *</label><input className="input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. CS" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label><textarea className="input" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Department description..." /></div>
        </div>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Department" message={`Delete "${deleteTarget?.name}"? This cannot be undone.`} confirmLabel="Delete" danger />
    </div>
  );
}
