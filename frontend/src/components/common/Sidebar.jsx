import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  FiHome, FiBook, FiFileText, FiUsers, FiSettings,
  FiLogOut, FiSun, FiMoon, FiMenu, FiX, FiBarChart2,
  FiClipboard, FiUserPlus, FiDatabase, FiActivity,
  FiChevronRight, FiAward, FiBell
} from 'react-icons/fi';

const navConfig = {
  student: [
    { to: '/student', icon: FiHome, label: 'Dashboard' },
    { to: '/student/courses', icon: FiBook, label: 'My Courses' },
    { to: '/student/exams', icon: FiClipboard, label: 'Exams' },
    { to: '/student/results', icon: FiAward, label: 'Results' },
  ],
  teacher: [
    { to: '/teacher', icon: FiHome, label: 'Dashboard' },
    { to: '/teacher/courses', icon: FiBook, label: 'Courses' },
    { to: '/teacher/exams', icon: FiFileText, label: 'Exams' },
    { to: '/teacher/grading', icon: FiClipboard, label: 'Grading' },
    { to: '/teacher/analytics', icon: FiBarChart2, label: 'Analytics' },
  ],
  admin: [
    { to: '/admin', icon: FiHome, label: 'Dashboard' },
    { to: '/admin/departments', icon: FiDatabase, label: 'Departments' },
    { to: '/admin/teachers', icon: FiUsers, label: 'Teachers' },
    { to: '/admin/students', icon: FiUserPlus, label: 'Students' },
    { to: '/admin/courses', icon: FiBook, label: 'Courses' },
    { to: '/admin/logs', icon: FiActivity, label: 'System Logs' },
  ],
};

const roleColors = {
  student: 'from-blue-600 to-indigo-600',
  teacher: 'from-violet-600 to-purple-700',
  admin: 'from-rose-600 to-pink-700',
};

const roleLabels = { student: 'Student Portal', teacher: 'Teacher Portal', admin: 'Admin Portal' };

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const links = navConfig[user?.role] || [];
  const gradientClass = roleColors[user?.role] || 'from-primary-600 to-primary-700';

  const handleLogout = () => { logout(); navigate('/login'); };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`bg-gradient-to-br ${gradientClass} p-5 flex items-center justify-between`}>
        {!collapsed && (
          <div>
            <div className="text-white font-display font-bold text-xl">UniExam</div>
            <div className="text-white/70 text-xs mt-0.5">{roleLabels[user?.role]}</div>
          </div>
        )}
        <button onClick={() => setCollapsed(c => !c)}
          className="text-white/80 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 hidden lg:block">
          <FiMenu size={18} />
        </button>
        <button onClick={() => setMobileOpen(false)}
          className="text-white/80 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 lg:hidden">
          <FiX size={18} />
        </button>
      </div>

      {/* User Info */}
      {!collapsed && (
        <div className="px-4 py-4 border-b border-gray-100 dark:border-[#2d3148]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</div>
            </div>
          </div>
        </div>
      )}

      {/* Nav Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to.split('/').length === 2}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
              ${isActive
                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
              } ${collapsed ? 'justify-center' : ''}`
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
            {!collapsed && <FiChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-50 transition-opacity" />}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-gray-100 dark:border-[#2d3148] space-y-1">
        <button onClick={toggle}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-all ${collapsed ? 'justify-center' : ''}`}>
          {dark ? <FiSun size={18} /> : <FiMoon size={18} />}
          {!collapsed && <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all ${collapsed ? 'justify-center' : ''}`}>
          <FiLogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white dark:bg-[#1a1d27] rounded-xl shadow-card border border-gray-100 dark:border-[#2d3148] text-gray-700 dark:text-gray-200">
        <FiMenu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`lg:hidden fixed left-0 top-0 h-full z-50 w-64 bg-white dark:bg-[#1a1d27] shadow-2xl transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col h-screen sticky top-0 bg-white dark:bg-[#1a1d27] border-r border-gray-100 dark:border-[#2d3148] transition-all duration-300 flex-shrink-0 ${collapsed ? 'w-16' : 'w-64'}`}>
        <SidebarContent />
      </aside>
    </>
  );
}
