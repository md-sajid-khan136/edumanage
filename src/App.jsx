import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'

import Login from './pages/Login'

import AdminDashboard from './pages/admin/AdminDashboard'
import Students from './pages/admin/Students'
import Teachers from './pages/admin/Teachers'
import Assignments from './pages/admin/Assignments'
import AdminGrades from './pages/admin/AdminGrades'
import AdminAttendance from './pages/admin/AdminAttendance'

import TeacherDashboard from './pages/teacher/TeacherDashboard'
import TeacherStudents from './pages/teacher/TeacherStudents'
import TeacherGrades from './pages/teacher/TeacherGrades'
import TeacherAttendance from './pages/teacher/TeacherAttendance'

import StudentDashboard from './pages/student/StudentDashboard'
import StudentGrades from './pages/student/StudentGrades'
import StudentAttendance from './pages/student/StudentAttendance'

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Tapping a link on mobile should navigate AND close the drawer,
  // otherwise the menu stays over the page you just opened.
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Dimmed backdrop, mobile only. Tapping it closes the drawer. */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* min-w-0 stops wide tables from forcing this column wider than the screen */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-3 h-14 px-4 shrink-0 bg-gray-900 border-b border-gray-800">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="text-gray-400 hover:text-white p-1 -ml-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-white font-semibold">EduManage</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

/** Wraps a page in the sidebar layout and locks it to the given roles. */
function Guarded({ roles, children }) {
  return (
    <ProtectedRoute allowedRoles={roles}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Admin */}
          <Route path="/admin" element={<Guarded roles={['admin']}><AdminDashboard /></Guarded>} />
          <Route path="/admin/students" element={<Guarded roles={['admin']}><Students /></Guarded>} />
          <Route path="/admin/teachers" element={<Guarded roles={['admin']}><Teachers /></Guarded>} />
          <Route path="/admin/assignments" element={<Guarded roles={['admin']}><Assignments /></Guarded>} />
          <Route path="/admin/grades" element={<Guarded roles={['admin']}><AdminGrades /></Guarded>} />
          <Route path="/admin/attendance" element={<Guarded roles={['admin']}><AdminAttendance /></Guarded>} />

          {/* Teacher */}
          <Route path="/teacher" element={<Guarded roles={['teacher']}><TeacherDashboard /></Guarded>} />
          <Route path="/teacher/students" element={<Guarded roles={['teacher']}><TeacherStudents /></Guarded>} />
          <Route path="/teacher/grades" element={<Guarded roles={['teacher']}><TeacherGrades /></Guarded>} />
          <Route path="/teacher/attendance" element={<Guarded roles={['teacher']}><TeacherAttendance /></Guarded>} />

          {/* Student */}
          <Route path="/student" element={<Guarded roles={['student']}><StudentDashboard /></Guarded>} />
          <Route path="/student/grades" element={<Guarded roles={['student']}><StudentGrades /></Guarded>} />
          <Route path="/student/attendance" element={<Guarded roles={['student']}><StudentAttendance /></Guarded>} />

          {/* Fallbacks */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
