import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { Table, Pagination } from '../../components/common/Table';
import SearchBar from '../../components/common/SearchBar';
import { formatDateTime } from '../../utils/helpers';

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    adminAPI.getLogs({ search, page, limit: 20 })
      .then(r => { setLogs(r.data?.logs || []); setTotal(r.data?.total || 0); })
      .finally(() => setLoading(false));
  }, [search, page]);

  const roleColor = { admin: 'badge-red', teacher: 'badge-purple', student: 'badge-blue' };
  const columns = [
    { key: 'user_name', label: 'User', render: (v, row) => (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{v?.charAt(0)?.toUpperCase()}</div>
        <div><div className="text-sm font-medium text-gray-900 dark:text-white">{v}</div><span className={`badge text-xs ${roleColor[row.user_role]}`}>{row.user_role}</span></div>
      </div>
    )},
    { key: 'action', label: 'Action', render: v => <span className="text-sm text-gray-700 dark:text-gray-300">{v}</span> },
    { key: 'ip_address', label: 'IP Address', render: v => <span className="font-mono text-xs text-gray-500">{v || '—'}</span> },
    { key: 'created_at', label: 'Timestamp', render: v => <span className="text-xs text-gray-400">{formatDateTime(v)}</span> },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="page-title">System Logs</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Audit trail of all system activities</p>
      </div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search logs..." className="max-w-md" />
      <div className="table-container">
        <Table columns={columns} data={logs} loading={loading} emptyMessage="No logs found" />
        {total > 20 && <Pagination page={page} totalPages={Math.ceil(total / 20)} total={total} pageSize={20} onPageChange={setPage} />}
      </div>
    </div>
  );
}
