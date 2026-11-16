import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
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
