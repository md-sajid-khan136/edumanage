import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function StudentAttendance() {
  const { profile } = useAuth()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile) fetchData() }, [profile])

  const fetchData = async () => {
    const { data: student } = await supabase.from('students').select('id').eq('profile_id', profile.id).single()
    if (student) {
      const { data } = await supabase.from('attendance').select('*').eq('student_id', student.id).order('date', { ascending: false })
      setRecords(data || [])
    }
    setLoading(false)
  }

  const total = records.length
  const present = records.filter(r => r.status === 'present').length
  const absent = records.filter(r => r.status === 'absent').length
  const late = records.filter(r => r.status === 'late').length
  const pct = total > 0 ? Math.round((present / total) * 100) : 0

  const statusStyles = {
    present: 'bg-green-500/20 text-green-400 border border-green-500/30',
    absent: 'bg-red-500/20 text-red-400 border border-red-500/30',
    late: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">My Attendance</h1>
        <p className="text-gray-400 mt-1">Your attendance record</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Classes', value: total, color: 'text-white' },
          { label: 'Present', value: present, color: 'text-green-400' },
          { label: 'Absent', value: absent, color: 'text-red-400' },
          { label: 'Late', value: late, color: 'text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <p className="text-gray-400 text-xs">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mb-6">
        <div className="flex justify-between items-center mb-2">
          <p className="text-gray-400 text-sm">Attendance Rate</p>
          <p className={`font-bold ${pct >= 75 ? 'text-green-400' : 'text-red-400'}`}>{pct}%</p>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${pct >= 75 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
        </div>
        {pct < 75 && <p className="text-red-400 text-xs mt-2">⚠ Below 75% required attendance</p>}
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Date</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              [...Array(5)].map((_, i) => <tr key={i}><td colSpan={2} className="px-6 py-4"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td></tr>)
            ) : records.length === 0 ? (
              <tr><td colSpan={2} className="text-center text-gray-500 py-12">No attendance records yet.</td></tr>
            ) : (
              records.map(r => (
                <tr key={r.id} className="hover:bg-gray-800/50 transition">
                  <td className="px-6 py-4 text-white text-sm">{new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusStyles[r.status]}`}>{r.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
