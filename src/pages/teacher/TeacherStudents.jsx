import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function TeacherStudents() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchStudents() }, [])

  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*').order('full_name')
    setStudents(data || [])
    setLoading(false)
  }

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.roll_number.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">My Students</h1>
        <p className="text-gray-400 mt-1">{students.length} students</p>
      </div>

      <div className="mb-6">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search students..."
          className="w-full md:w-80 bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="bg-gray-900 rounded-xl border border-gray-800 p-5 h-24 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <p className="text-gray-500">No students found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => (
            <div key={s.id} className="bg-gray-900 rounded-xl border border-gray-800 p-5 hover:border-gray-700 transition">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                  {s.full_name[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">{s.full_name}</p>
                  <p className="text-gray-500 text-sm font-mono">Roll: {s.roll_number}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
