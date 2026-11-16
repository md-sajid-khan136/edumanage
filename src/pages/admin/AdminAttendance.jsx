import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminAttendance() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchRecords() }, [])

  const fetchRecords = async () => {
    const { data } = await supabase
      .from('attendance')
      .select('*, students(full_name, roll_number), profiles(full_name)')
      .order('date', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }

  const statusStyles = {
    present: 'bg-green-500/20 text-green-400 border border-green-500/30',
    absent: 'bg-red-500/20 text-red-400 border border-red-500/30',
    late: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  }

  const filtered = records.filter(r =>
    r.students?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.students?.roll_number?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">All Attendance</h1>
        <p className="text-gray-400 mt-1">{records.length} attendance records</p>
      </div>

      <div className="mb-4">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by student name or roll..."
          className="w-full md:w-80 bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
        />
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Student</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Date</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Status</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Marked By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              [...Array(5)].map((_, i) => <tr key={i}><td colSpan={4} className="px-6 py-4"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td></tr>)
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="text-center text-gray-500 py-12">No attendance records found.</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="hover:bg-gray-800/50 transition">
                <td className="px-6 py-4">
                  <p className="text-white text-sm font-medium">{r.students?.full_name || '—'}</p>
                  <p className="text-gray-500 text-xs font-mono">{r.students?.roll_number}</p>
                </td>
                <td className="px-6 py-4 text-gray-300 text-sm">{new Date(r.date).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusStyles[r.status]}`}>{r.status}</span>
                </td>
                <td className="px-6 py-4 text-gray-400 text-sm">{r.profiles?.full_name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
