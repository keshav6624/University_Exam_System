import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import Modal from '../../components/common/Modal';
import SearchBar from '../../components/common/SearchBar';
import { Table, Pagination } from '../../components/common/Table';
import toast from 'react-hot-toast';
import { FiLink } from 'react-icons/fi';

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ course_id: '', user_id: '', role: 'student' });

  const fetch = () => {
    setLoading(true);
    adminAPI.getCourses({ search, page, limit: 10 })
      .then(r => { setCourses(r.data?.courses || []); setTotal(r.data?.total || 0); })
      .finally(() => setLoading(false));
  };
  useEffect(fetch, [search, page]);
  useEffect(() => {
    adminAPI.getTeachers({ limit: 100 }).then(r => setTeachers(r.data?.teachers || []));
    adminAPI.getStudents({ limit: 100 }).then(r => setStudents(r.data?.students || []));
  }, []);

  const handleAssign = async () => {
    if (!form.course_id || !form.user_id) return toast.error('Please fill all fields');
    try {
      await adminAPI.assignCourse(form);
      toast.success('Assigned successfully!');
      setModal(false); fetch();
    } catch {}
  };

  const columns = [
    { key: 'name', label: 'Course', render: (v, row) => <div><div className="font-medium text-gray-900 dark:text-white">{v}</div><div className="text-xs text-primary-600 dark:text-primary-400 font-mono">{row.code}</div></div> },
    { key: 'teacher_name', label: 'Teacher', render: v => v || '—' },
    { key: 'department_name', label: 'Department', render: v => v || '—' },
    { key: 'enrolled_count', label: 'Students', render: v => v || 0 },
    { key: 'exams_count', label: 'Exams', render: v => v || 0 },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Courses</h1><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage course assignments</p></div>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2"><FiLink size={15} /> Assign Course</button>
      </div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search courses..." className="max-w-md" />
      <div className="table-container">
        <Table columns={columns} data={courses} loading={loading} emptyMessage="No courses found" />
        {total > 10 && <Pagination page={page} totalPages={Math.ceil(total / 10)} total={total} pageSize={10} onPageChange={setPage} />}
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="Assign Course" size="sm"
        footer={<><button onClick={() => setModal(false)} className="btn-secondary">Cancel</button><button onClick={handleAssign} className="btn-primary">Assign</button></>}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Course</label>
            <select className="input" value={form.course_id} onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}>
              <option value="">Select course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
            <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value, user_id: '' }))}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{form.role === 'teacher' ? 'Teacher' : 'Student'}</label>
            <select className="input" value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}>
              <option value="">Select {form.role}</option>
              {(form.role === 'teacher' ? teachers : students).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
