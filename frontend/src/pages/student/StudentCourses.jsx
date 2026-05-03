import React, { useState, useEffect } from 'react';
import { studentAPI } from '../../services/api';
import { FiBook, FiUser, FiUsers } from 'react-icons/fi';

export default function StudentCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentAPI.getCourses().then(r => { setCourses(r.data?.courses || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="page-title">My Courses</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Courses you're enrolled in this semester</p>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 skeleton rounded-2xl" />)}
        </div>
      ) : courses.length === 0 ? (
        <div className="card py-16 text-center text-gray-400 dark:text-gray-500">No courses enrolled</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {courses.map((course) => (
            <div key={course.id} className="card p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center mb-4">
                <FiBook size={22} className="text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{course.name}</h3>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{course.code}</div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{course.description}</p>
              <div className="mt-4 pt-4 border-t border-gray-50 dark:border-[#2d3148] flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-1"><FiUser size={12} />{course.teacher_name}</div>
                <div className="flex items-center gap-1"><FiUsers size={12} />{course.enrolled_count || 0} students</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
