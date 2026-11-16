import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function TeacherGrades() {
  const { profile } = useAuth()
  const [grades, setGrades] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ student_id: '', subject: '', score: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (profile) fetchData() }, [profile])

  const fetchData = async () => {
    const [g, s] = await Promise.all([
      supabase.from('grades').select('*, students(full_name, roll_number)').eq('teacher_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('students').select('*').order('full_name'),
    ])
    setGrades(g.data || [])
    setStudents(s.data || [])
    setLoading(false)
  }

  const openAdd = () => { setEditing(null); setForm({ student_id: '', subject: '', score: '' }); setError(''); setModal(true) }
  const openEdit = (g) => { setEditing(g); setForm({ student_id: g.student_id, subject: g.subject, score: String(g.score) }); setError(''); setModal(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')

    const score = parseInt(form.score, 10)
    if (isNaN(score) || score < 0 || score > 100) {
      setError('Score must be a number between 0 and 100')
      setSaving(false)
      return
    }

    const payload = { student_id: form.student_id, subject: form.subject, score, teacher_id: profile.id }

    const { error } = editing
      ? await supabase.from('grades').update(payload).eq('id', editing.id)
      : await supabase.from('grades').insert(payload)

    if (error) { setError(error.message); setSaving(false); return }

    setModal(false); fetchData(); setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this grade record?')) return
    await supabase.from('grades').delete().eq('id', id)
    fetchData()
  }

  const getColor = (score) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-blue-400'
    if (score >= 40) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Grades</h1>
          <p className="text-gray-400 mt-1">{grades.length} records you entered</p>
        </div>
        <button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + Add Grade
        </button>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Student</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Subject</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Score</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Date</th>
              <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              [...Array(5)].map((_, i) => <tr key={i}><td colSpan={5} className="px-6 py-4"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td></tr>)
            ) : grades.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-gray-500 py-12">No grades entered yet.</td></tr>
            ) : grades.map(g => (
              <tr key={g.id} className="hover:bg-gray-800/50 transition">
                <td className="px-6 py-4">
                  <p className="text-white text-sm font-medium">{g.students?.full_name}</p>
                  <p className="text-gray-500 text-xs font-mono">{g.students?.roll_number}</p>
                </td>
                <td className="px-6 py-4 text-gray-300 text-sm">{g.subject}</td>
                <td className="px-6 py-4"><span className={`font-bold text-sm ${getColor(g.score)}`}>{g.score}%</span></td>
                <td className="px-6 py-4 text-gray-500 text-sm">{new Date(g.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => openEdit(g)} className="text-indigo-400 hover:text-indigo-300 text-sm mr-3">Edit</button>
                  <button onClick={() => handleDelete(g.id)} className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-md">
            <h2 className="text-white font-semibold text-lg mb-4">{editing ? 'Edit Grade' : 'Add Grade'}</h2>
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-2 mb-3 text-sm">{error}</div>}
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Student</label>
                <select value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} required className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select a student...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.roll_number})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Subject</label>
                <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required placeholder="e.g. Mathematics" className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Score (0–100)</label>
                <input type="number" min="0" max="100" value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} required className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">{saving ? 'Saving...' : 'Save'}</button>
                <button type="button" onClick={() => setModal(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
