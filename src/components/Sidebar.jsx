import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
  { to: '/admin/students', label: 'Students', icon: '🎓' },
  { to: '/admin/teachers', label: 'Teachers', icon: '👩‍🏫' },
  { to: '/admin/assignments', label: 'Assignments', icon: '🔗' },
  { to: '/admin/grades', label: 'Grades', icon: '📝' },
  { to: '/admin/attendance', label: 'Attendance', icon: '📅' },
]

const teacherLinks = [
  { to: '/teacher', label: 'Dashboard', icon: '📊', end: true },
  { to: '/teacher/students', label: 'My Students', icon: '🎓' },
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

/**
 * Below the lg breakpoint this is a drawer that slides in from the left,
 * sitting above the page content. At lg and up it becomes a normal column
 * in the page flow and the open/onClose props stop mattering.
 */
export default function Sidebar({ open = false, onClose = () => {} }) {
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
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 w-64 shrink-0
        bg-gray-900 border-r border-gray-800 flex flex-col
        transform transition-transform duration-200 ease-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:static lg:z-auto lg:translate-x-0
      `}
    >
      <div className="p-6 border-b border-gray-800 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">EduManage</h1>
          <p className="text-gray-500 text-xs mt-1">Student Management</p>
        </div>
        {/* Only reachable on mobile; the drawer is always open at lg and up */}
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="lg:hidden text-gray-500 hover:text-white -mr-1 -mt-1 p-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
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
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
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
