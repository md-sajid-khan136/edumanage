import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function TeacherAttendance() {
  const { profile } = useAuth()
  const [records, setRecords] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState('')
  const [marking, setMarking] = useState(null)

  useEffect(() => { if (profile) fetchData() }, [profile])

  const fetchData = async () => {
    const [r, s] = await Promise.all([
      supabase.from('attendance').select('*, students(full_name, roll_number)').order('date', { ascending: false }).limit(100),
      supabase.from('students').select('*').order('full_name'),
    ])
    setRecords(r.data || [])
    setStudents(s.data || [])
    setLoading(false)
  }

  const markAttendance = async (studentId, status) => {
    setMarking(studentId); setError('')

    const { error } = await supabase.from('attendance').upsert({
      student_id: studentId,
      teacher_id: profile.id,
      date,
      status,
    }, { onConflict: 'student_id,date' })

    if (error) setError(error.message)
    else await fetchData()

    setMarking(null)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this attendance record?')) return
    await supabase.from('attendance').delete().eq('id', id)
    fetchData()
  }

  const statusStyles = {
    present: 'bg-green-500/20 text-green-400 border border-green-500/30',
    absent: 'bg-red-500/20 text-red-400 border border-red-500/30',
    late: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  }

  const todayRecords = records.filter(r => r.date === date)
  const getStatus = (studentId) => todayRecords.find(r => r.student_id === studentId)?.status

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Attendance</h1>
        <p className="text-gray-400 mt-1">Mark and review attendance</p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mb-6">
        <label className="block text-sm text-gray-300 mb-2">Select Date</label>
        <input
          type="date" value={date} onChange={e => setDate(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 mb-8">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-white font-semibold">Mark Attendance for {new Date(date).toLocaleDateString()}</h2>
        </div>
        <div className="divide-y divide-gray-800">
          {loading ? (
            [...Array(4)].map((_, i) => <div key={i} className="px-6 py-4"><div className="h-6 bg-gray-800 rounded animate-pulse" /></div>)
          ) : students.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No students yet.</p>
          ) : students.map(s => {
            const current = getStatus(s.id)
            return (
              <div key={s.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {s.full_name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{s.full_name}</p>
                    <p className="text-gray-500 text-xs font-mono">{s.roll_number}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {['present', 'absent', 'late'].map(st => (
                    <button
                      key={st}
                      onClick={() => markAttendance(s.id, st)}
                      disabled={marking === s.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition disabled:opacity-50 ${
                        current === st ? statusStyles[st] : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-transparent'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-white font-semibold">All Records</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Student</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Date</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Status</th>
              <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {records.length === 0 && !loading ? (
              <tr><td colSpan={4} className="text-center text-gray-500 py-12">No records yet.</td></tr>
            ) : records.map(r => (
              <tr key={r.id} className="hover:bg-gray-800/50 transition">
                <td className="px-6 py-4">
                  <p className="text-white text-sm font-medium">{r.students?.full_name}</p>
                  <p className="text-gray-500 text-xs font-mono">{r.students?.roll_number}</p>
                </td>
                <td className="px-6 py-4 text-gray-300 text-sm">{new Date(r.date).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusStyles[r.status]}`}>{r.status}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDelete(r.id)} className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
