import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function TeacherDashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ students: 0, grades: 0, attendance: 0 })
  const [recentGrades, setRecentGrades] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile) fetchData() }, [profile])

  const fetchData = async () => {
    const [s, g, a, rg] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }),
      supabase.from('grades').select('*', { count: 'exact', head: true }).eq('teacher_id', profile.id),
      supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('teacher_id', profile.id),
      supabase.from('grades').select('*, students(full_name, roll_number)').eq('teacher_id', profile.id).order('created_at', { ascending: false }).limit(5),
    ])
    setStats({ students: s.count || 0, grades: g.count || 0, attendance: a.count || 0 })
    setRecentGrades(rg.data || [])
    setLoading(false)
  }

  const cards = [
    { label: 'Total Students', value: stats.students, icon: '🎓', color: 'text-blue-400' },
    { label: 'Grades I Entered', value: stats.grades, icon: '📝', color: 'text-green-400' },
    { label: 'Attendance I Marked', value: stats.attendance, icon: '📅', color: 'text-yellow-400' },
  ]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Welcome, {profile?.full_name}</h1>
        <p className="text-gray-400 mt-1">Your teaching overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
          <h2 className="text-white font-semibold">Recent Grades You Entered</h2>
        </div>
        <div className="divide-y divide-gray-800">
          {recentGrades.length === 0 && !loading ? (
            <p className="text-gray-500 text-center py-8">No grades entered yet. Head to the Grades page.</p>
          ) : recentGrades.map(g => (
            <div key={g.id} className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">{g.students?.full_name}</p>
                <p className="text-gray-500 text-xs">{g.subject} · Roll {g.students?.roll_number}</p>
              </div>
              <span className={`font-bold text-sm ${g.score >= 80 ? 'text-green-400' : g.score >= 60 ? 'text-blue-400' : g.score >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                {g.score}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
