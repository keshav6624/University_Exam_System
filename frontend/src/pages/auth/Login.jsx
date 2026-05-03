import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';
import { FiMail, FiLock, FiEye, FiEyeOff, FiSun, FiMoon } from 'react-icons/fi';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Please fill in all fields');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(`/${user.role}`);
    } catch (err) {
      // error handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    const demos = {
      student: { email: 'student@university.edu', password: 'Password@123' },
      teacher: { email: 'teacher@university.edu', password: 'Password@123' },
      admin: { email: 'admin@university.edu', password: 'Password@123' },
    };
    setForm(demos[role]);
  };

  return (
    <div className="min-h-screen flex bg-[var(--color-bg)]">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-violet-800 p-12 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-20 w-80 h-80 rounded-full bg-accent-400 blur-3xl" />
        </div>
        <div className="absolute top-0 right-0 w-full h-full opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10">
          <div className="text-white font-display font-bold text-3xl mb-2">UniExam</div>
          <div className="text-white/60 text-sm">University Examination System</div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <h1 className="text-white font-display text-4xl font-bold leading-tight mb-6">
            Conduct Exams<br />with Confidence
          </h1>
          <p className="text-white/70 text-lg leading-relaxed mb-10">
            A modern platform for universities to manage examinations, grading, and student assessments — all in one place.
          </p>

          <div className="space-y-4">
            {[
              { icon: '🎓', title: 'For Students', desc: 'Take exams with timer, review answers, and get instant results' },
              { icon: '📝', title: 'For Teachers', desc: 'Create exams, auto-grade MCQs, and analyze class performance' },
              { icon: '⚙️', title: 'For Admins', desc: 'Manage departments, users, and view system-wide analytics' },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-4">
                <span className="text-2xl">{f.icon}</span>
                <div>
                  <div className="text-white font-semibold text-sm">{f.title}</div>
                  <div className="text-white/60 text-xs mt-0.5">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Theme toggle */}
          <div className="flex justify-end mb-8">
            <button onClick={toggle} className="p-2.5 rounded-xl border border-gray-200 dark:border-[#2d3148] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              {dark ? <FiSun size={18} /> : <FiMoon size={18} />}
            </button>
          </div>

          <div className="lg:hidden mb-8">
            <div className="text-primary-600 font-display font-bold text-2xl">UniExam</div>
            <div className="text-gray-500 dark:text-gray-400 text-sm">University Examination System</div>
          </div>

          <h2 className="page-title mb-2">Welcome back</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">Sign in to your account to continue</p>

          {/* Demo Buttons */}
          <div className="bg-gray-50 dark:bg-[#111420] rounded-2xl p-4 mb-6">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Quick Demo Access</div>
            <div className="flex gap-2">
              {['student', 'teacher', 'admin'].map((role) => (
                <button key={role} onClick={() => fillDemo(role)}
                  className="flex-1 py-2 text-xs font-medium rounded-xl border border-gray-200 dark:border-[#2d3148] text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-[#1a1d27] hover:text-primary-600 dark:hover:text-primary-400 transition-all capitalize">
                  {role}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
              <div className="relative">
                <FiMail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input type="email" placeholder="your@university.edu"
                  value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  className="input pl-10" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
              <div className="relative">
                <FiLock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input type={showPass ? 'text' : 'password'} placeholder="••••••••"
                  value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  className="input pl-10 pr-10" required />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  {showPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-8">
            © 2024 UniExam. University Examination & Assessment System.
          </p>
        </div>
      </div>
    </div>
  );
}
