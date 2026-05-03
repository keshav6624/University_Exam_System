import { format, formatDistanceToNow, isPast, isFuture } from 'date-fns';

export const formatDate = (date, fmt = 'MMM dd, yyyy') =>
  date ? format(new Date(date), fmt) : '—';

export const formatDateTime = (date) =>
  date ? format(new Date(date), 'MMM dd, yyyy • hh:mm a') : '—';

export const timeAgo = (date) =>
  date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : '—';

export const formatDuration = (minutes) => {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export const formatSeconds = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};

export const getExamStatus = (exam) => {
  const now = new Date();
  const start = new Date(exam.start_time);
  const end = new Date(exam.end_time);
  if (isFuture(start)) return 'upcoming';
  if (isPast(end)) return 'ended';
  return 'active';
};

export const getGradeColor = (score, total) => {
  const pct = (score / total) * 100;
  if (pct >= 90) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 75) return 'text-blue-600 dark:text-blue-400';
  if (pct >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

export const getGradeBadge = (score, total) => {
  const pct = (score / total) * 100;
  if (pct >= 90) return { label: 'A+', cls: 'badge-green' };
  if (pct >= 80) return { label: 'A', cls: 'badge-green' };
  if (pct >= 70) return { label: 'B', cls: 'badge-blue' };
  if (pct >= 60) return { label: 'C', cls: 'badge-yellow' };
  if (pct >= 50) return { label: 'D', cls: 'badge-yellow' };
  return { label: 'F', cls: 'badge-red' };
};

export const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const debounce = (fn, delay) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
};

export const downloadCSVTemplate = () => {
  const headers = 'name,email,password,department_id\n';
  const sample = 'John Doe,john@uni.edu,password123,1\nJane Smith,jane@uni.edu,password123,2\n';
  const blob = new Blob([headers + sample], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'students_template.csv';
  a.click(); URL.revokeObjectURL(url);
};
