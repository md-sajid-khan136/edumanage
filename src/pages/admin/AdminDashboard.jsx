import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ students: 0, teachers: 0, grades: 0, attendance: 0 })
  const [recentStudents, setRecentStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const [s, t, g, a, rs] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
      supabase.from('grades').select('*', { count: 'exact', head: true }),
      supabase.from('attendance').select('*', { count: 'exact', head: true }),
      supabase.from('students').select('*').order('created_at', { ascending: false }).limit(5),
    ])
    setStats({ students: s.count || 0, teachers: t.count || 0, grades: g.count || 0, attendance: a.count || 0 })
    setRecentStudents(rs.data || [])
    setLoading(false)
  }

  const cards = [
    { label: 'Total Students', value: stats.students, icon: '🎓', color: 'text-blue-400' },
    { label: 'Total Teachers', value: stats.teachers, icon: '👩‍🏫', color: 'text-purple-400' },
    { label: 'Grade Records', value: stats.grades, icon: '📝', color: 'text-green-400' },
    { label: 'Attendance Records', value: stats.attendance, icon: '📅', color: 'text-yellow-400' },
  ]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-gray-400 mt-1">Overview of your institution</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <div className="text-2xl mb-2">{c.icon}</div>
            <p className={`text-3xl font-bold ${c.color}`}>{loading ? '...' : c.value}</p>
            <p className="text-gray-400 text-sm mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-white font-semibold">Recently Added Students</h2>
        </div>
        <div className="divide-y divide-gray-800">
          {recentStudents.length === 0 && !loading ? (
            <p className="text-gray-500 text-center py-8">No students yet. Add some from the Students page.</p>
          ) : recentStudents.map(s => (
            <div key={s.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                  {s.full_name[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{s.full_name}</p>
                  <p className="text-gray-500 text-xs">Roll: {s.roll_number}</p>
                </div>
              </div>
              <p className="text-gray-500 text-xs">{new Date(s.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
