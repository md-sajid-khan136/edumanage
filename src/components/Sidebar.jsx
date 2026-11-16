import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
  { to: '/admin/students', label: 'Students', icon: '🎓' },
  { to: '/admin/teachers', label: 'Teachers', icon: '👩‍🏫' },
  { to: '/admin/grades', label: 'Grades', icon: '📝' },
  { to: '/admin/attendance', label: 'Attendance', icon: '📅' },
]

const teacherLinks = [
  { to: '/teacher', label: 'Dashboard', icon: '📊', end: true },
  { to: '/teacher/students', label: 'Students', icon: '🎓' },
  { to: '/teacher/grades', label: 'Grades', icon: '📝' },
  { to: '/teacher/attendance', label: 'Attendance', icon: '📅' },
]

const studentLinks = [
  { to: '/student', label: 'Dashboard', icon: '📊', end: true },
  { to: '/student/grades', label: 'My Grades', icon: '📝' },
  { to: '/student/attendance', label: 'My Attendance', icon: '📅' },
]

const roleBadgeColors = {
  admin: 'bg-purple-500/20 text-purple-400',
  teacher: 'bg-blue-500/20 text-blue-400',
  student: 'bg-green-500/20 text-green-400',
}

export default function Sidebar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const links = profile?.role === 'admin' ? adminLinks
    : profile?.role === 'teacher' ? teacherLinks
    : studentLinks

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">EduManage</h1>
        <p className="text-gray-500 text-xs mt-1">Student Management</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            <span>{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">
            {profile?.full_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{profile?.full_name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${roleBadgeColors[profile?.role]}`}>
              {profile?.role}
            </span>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full text-left px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg text-sm transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
