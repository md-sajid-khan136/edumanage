import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminGrades() {
  const [grades, setGrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchGrades() }, [])

  const fetchGrades = async () => {
    const { data } = await supabase
      .from('grades')
      .select('*, students(full_name, roll_number), profiles(full_name)')
      .order('created_at', { ascending: false })
    setGrades(data || [])
    setLoading(false)
  }

  const getColor = (score) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-blue-400'
    if (score >= 40) return 'text-yellow-400'
    return 'text-red-400'
  }

  const filtered = grades.filter(g =>
    g.students?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    g.subject?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">All Grades</h1>
        <p className="text-gray-400 mt-1">{grades.length} grade records across the institution</p>
      </div>

      <div className="mb-4">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by student or subject..."
          className="w-full md:w-80 bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
        />
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Student</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Subject</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Score</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Teacher</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              [...Array(5)].map((_, i) => <tr key={i}><td colSpan={5} className="px-6 py-4"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td></tr>)
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-gray-500 py-12">No grade records found.</td></tr>
            ) : filtered.map(g => (
              <tr key={g.id} className="hover:bg-gray-800/50 transition">
                <td className="px-6 py-4">
                  <p className="text-white text-sm font-medium">{g.students?.full_name || '—'}</p>
                  <p className="text-gray-500 text-xs font-mono">{g.students?.roll_number}</p>
                </td>
                <td className="px-6 py-4 text-gray-300 text-sm">{g.subject}</td>
                <td className="px-6 py-4"><span className={`font-bold text-sm ${getColor(g.score)}`}>{g.score}%</span></td>
                <td className="px-6 py-4 text-gray-400 text-sm">{g.profiles?.full_name || '—'}</td>
                <td className="px-6 py-4 text-gray-500 text-sm">{new Date(g.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
