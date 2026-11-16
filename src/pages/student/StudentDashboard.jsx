import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function StudentDashboard() {
  const { profile } = useAuth()
  const [student, setStudent] = useState(null)
  const [grades, setGrades] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile) fetchData() }, [profile])

  const fetchData = async () => {
    const { data: s } = await supabase.from('students').select('*').eq('profile_id', profile.id).single()

    if (s) {
      setStudent(s)
      const [g, a] = await Promise.all([
        supabase.from('grades').select('*').eq('student_id', s.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('attendance').select('*').eq('student_id', s.id).order('date', { ascending: false }).limit(5),
      ])
      setGrades(g.data || [])
      setAttendance(a.data || [])
    }
    setLoading(false)
  }

  const statusStyles = {
    present: 'bg-green-500/20 text-green-400 border border-green-500/30',
    absent: 'bg-red-500/20 text-red-400 border border-red-500/30',
    late: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  }

  const getColor = (score) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-blue-400'
    if (score >= 40) return 'text-yellow-400'
    return 'text-red-400'
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 bg-gray-800 rounded animate-pulse mb-6" />
        <div className="h-32 bg-gray-900 rounded-xl border border-gray-800 animate-pulse" />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white mb-4">Welcome, {profile?.full_name}</h1>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
          <p className="text-yellow-400 font-medium">Your account isn't linked to a student record yet.</p>
          <p className="text-gray-400 text-sm mt-2">
            Ask your administrator to link your login to your student profile so you can see your grades and attendance.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Welcome, {student.full_name}</h1>
        <p className="text-gray-400 mt-1">Your academic overview</p>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
            {student.full_name[0].toUpperCase()}
          </div>
          <div>
            <p className="text-white text-lg font-semibold">{student.full_name}</p>
            <p className="text-gray-400 text-sm font-mono">Roll Number: {student.roll_number}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-white font-semibold">Recent Grades</h2>
          </div>
          <div className="divide-y divide-gray-800">
            {grades.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm">No grades yet.</p>
            ) : grades.map(g => (
              <div key={g.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">{g.subject}</p>
                  <p className="text-gray-500 text-xs">{new Date(g.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`font-bold text-sm ${getColor(g.score)}`}>{g.score}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-white font-semibold">Recent Attendance</h2>
          </div>
          <div className="divide-y divide-gray-800">
            {attendance.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm">No attendance records yet.</p>
            ) : attendance.map(a => (
              <div key={a.id} className="px-6 py-3 flex items-center justify-between">
                <p className="text-gray-300 text-sm">{new Date(a.date).toLocaleDateString()}</p>
                <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusStyles[a.status]}`}>{a.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
