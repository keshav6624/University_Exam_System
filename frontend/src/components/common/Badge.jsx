import React from 'react';

const variants = {
  active: 'badge-green',
  inactive: 'badge-red',
  suspended: 'badge-red',
  published: 'badge-green',
  draft: 'badge-yellow',
  upcoming: 'badge-blue',
  active_exam: 'badge-green',
  ended: 'badge-red',
  submitted: 'badge-purple',
  graded: 'badge-green',
  pending: 'badge-yellow',
  quiz: 'badge-blue',
  midterm: 'badge-purple',
  final: 'badge-red',
};

export default function Badge({ status, label, custom }) {
  const cls = custom || variants[status] || 'badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300';
  return <span className={cls}>{label || status}</span>;
}
