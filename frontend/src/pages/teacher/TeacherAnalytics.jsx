import React, { useState, useEffect } from 'react';
import { teacherAPI } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#6366f1', '#f97316', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function TeacherAnalytics() {
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    teacherAPI.getExams({ limit: 100 }).then(r => setExams(r.data?.exams || []));
  }, []);

  useEffect(() => {
    if (!selectedExam) return;
    setLoading(true);
    teacherAPI.getAnalytics(selectedExam).then(r => { setAnalytics(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [selectedExam]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) return (
      <div className="bg-white dark:bg-[#1a1d27] border border-gray-100 dark:border-[#2d3148] rounded-xl px-4 py-3 shadow-lg text-sm">
        <div className="font-semibold text-gray-700 dark:text-gray-200">{label}</div>
        {payload.map(p => <div key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</div>)}
      </div>
    );
    return null;
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="page-title">Class Analytics</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Analyze exam performance and student outcomes</p>
      </div>

      <select className="input max-w-xs" value={selectedExam} onChange={e => setSelectedExam(e.target.value)}>
        <option value="">Select an exam...</option>
        {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
      </select>

      {loading && <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>}

      {analytics && !loading && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Average Score', value: `${analytics.avg_score ?? 0}%` },
              { label: 'Pass Rate', value: `${analytics.pass_rate ?? 0}%` },
              { label: 'Highest Score', value: `${analytics.highest_score ?? 0}%` },
              { label: 'Lowest Score', value: `${analytics.lowest_score ?? 0}%` },
            ].map(s => (
              <div key={s.label} className="card p-5 text-center">
                <div className="text-2xl font-display font-bold text-primary-600 dark:text-primary-400">{s.value}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Score Distribution */}
            <div className="card p-6">
              <h2 className="section-title mb-4">Score Distribution</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={analytics.score_distribution || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#6366f1" radius={[6,6,0,0]} name="Students" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pass/Fail */}
            <div className="card p-6">
              <h2 className="section-title mb-4">Pass / Fail Breakdown</h2>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={[
                    { name: 'Passed', value: analytics.passed || 0 },
                    { name: 'Failed', value: analytics.failed || 0 },
                  ]} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {[0, 1].map((_, i) => <Cell key={i} fill={i === 0 ? '#10b981' : '#ef4444'} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Per-question accuracy */}
            {analytics.question_accuracy?.length > 0 && (
              <div className="card p-6 xl:col-span-2">
                <h2 className="section-title mb-4">Question Accuracy Rate</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={analytics.question_accuracy}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="q_num" tick={{ fontSize: 12 }} label={{ value: 'Question #', position: 'insideBottom', offset: -5 }} />
                    <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} formatter={v => `${v}%`} />
                    <Bar dataKey="accuracy" radius={[6,6,0,0]} name="Accuracy">
                      {analytics.question_accuracy.map((entry, i) => (
                        <Cell key={i} fill={entry.accuracy >= 70 ? '#10b981' : entry.accuracy >= 40 ? '#f97316' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedExam && (
        <div className="card py-16 text-center text-gray-400 dark:text-gray-500 text-sm">
          Select an exam to view analytics
        </div>
      )}
    </div>
  );
}
