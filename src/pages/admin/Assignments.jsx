import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Assignments() {
  const [teachers, setTeachers] = useState([])
  const [students, setStudents] = useState([])
  const [assignments, setAssignments] = useState([])
  const [selectedTeacher, setSelectedTeacher] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const [t, s, a] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'teacher').order('full_name'),
      supabase.from('students').select('*').order('full_name'),
      supabase.from('teacher_students').select('*'),
    ])
    setTeachers(t.data || [])
    setStudents(s.data || [])
    setAssignments(a.data || [])
    if (!selectedTeacher && t.data?.length) setSelectedTeacher(t.data[0])
    setLoading(false)
  }

  const isAssigned = (studentId) =>
    assignments.some(a => a.teacher_id === selectedTeacher?.id && a.student_id === studentId)

  const countFor = (teacherId) =>
    assignments.filter(a => a.teacher_id === teacherId).length

  const toggle = async (studentId) => {
    if (!selectedTeacher) return
    setBusy(studentId); setError('')

    if (isAssigned(studentId)) {
      const { error } = await supabase
        .from('teacher_students')
        .delete()
        .eq('teacher_id', selectedTeacher.id)
        .eq('student_id', studentId)
      if (error) setError(error.message)
    } else {
      const { error } = await supabase
        .from('teacher_students')
        .insert({ teacher_id: selectedTeacher.id, student_id: studentId })
      if (error) setError(error.message)
    }

    const { data } = await supabase.from('teacher_students').select('*')
    setAssignments(data || [])
    setBusy(null)
  }

  const assignAll = async () => {
    if (!selectedTeacher) return
    setError('')
    const rows = students
      .filter(s => !isAssigned(s.id))
      .map(s => ({ teacher_id: selectedTeacher.id, student_id: s.id }))

    if (rows.length === 0) return

    const { error } = await supabase.from('teacher_students').insert(rows)
    if (error) { setError(error.message); return }

    const { data } = await supabase.from('teacher_students').select('*')
    setAssignments(data || [])
  }

  const clearAll = async () => {
    if (!selectedTeacher) return
    if (!confirm(`Unassign all students from ${selectedTeacher.full_name}?`)) return
    setError('')

    const { error } = await supabase
      .from('teacher_students')
      .delete()
      .eq('teacher_id', selectedTeacher.id)
    if (error) { setError(error.message); return }

    const { data } = await supabase.from('teacher_students').select('*')
    setAssignments(data || [])
  }

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.roll_number.toLowerCase().includes(search.toLowerCase())
  )

  const assignedCount = selectedTeacher ? countFor(selectedTeacher.id) : 0

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 bg-gray-800 rounded animate-pulse mb-6" />
        <div className="h-64 bg-gray-900 rounded-xl border border-gray-800 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Assignments</h1>
        <p className="text-gray-400 mt-1">Choose which students each teacher can see and grade</p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}

      {teachers.length === 0 ? (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
          <p className="text-yellow-400 font-medium">No teachers yet.</p>
          <p className="text-gray-400 text-sm mt-1">Create one on the Teachers page first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Teacher picker */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden h-fit">
            <div className="px-5 py-3 border-b border-gray-800">
              <h2 className="text-white font-semibold text-sm">Teachers</h2>
            </div>
            <div className="divide-y divide-gray-800">
              {teachers.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTeacher(t)}
                  className={`w-full text-left px-5 py-3 flex items-center gap-3 transition ${
                    selectedTeacher?.id === t.id ? 'bg-indigo-600/20 border-l-2 border-indigo-500' : 'hover:bg-gray-800/50 border-l-2 border-transparent'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {t.full_name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">{t.full_name}</p>
                    <p className="text-gray-500 text-xs">{countFor(t.id)} assigned</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Student checklist */}
          <div className="lg:col-span-2 bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-white font-semibold text-sm">
                  Students for {selectedTeacher?.full_name}
                </h2>
                <p className="text-gray-500 text-xs mt-0.5">{assignedCount} of {students.length} assigned</p>
              </div>
              <div className="flex gap-2">
                <button onClick={assignAll} className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg transition">Assign all</button>
                <button onClick={clearAll} className="text-xs bg-gray-800 hover:bg-gray-700 text-red-400 px-3 py-1.5 rounded-lg transition">Clear all</button>
              </div>
            </div>

            <div className="px-5 py-3 border-b border-gray-800">
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search students..."
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
              />
            </div>

            <div className="divide-y divide-gray-800 max-h-[32rem] overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-gray-500 text-center py-12 text-sm">No students found.</p>
              ) : filtered.map(s => {
                const assigned = isAssigned(s.id)
                return (
                  <button
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    disabled={busy === s.id}
                    className="w-full px-5 py-3 flex items-center justify-between gap-3 hover:bg-gray-800/50 transition disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition ${
                        assigned ? 'bg-indigo-600 border-indigo-600' : 'border-gray-600'
                      }`}>
                        {assigned && (
                          <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-white text-sm font-medium truncate">{s.full_name}</p>
                        <p className="text-gray-500 text-xs font-mono">Roll: {s.roll_number}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
