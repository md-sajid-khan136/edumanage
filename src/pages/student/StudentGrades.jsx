import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function StudentGrades() {
  const { profile } = useAuth()
  const [grades, setGrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [studentId, setStudentId] = useState(null)

  useEffect(() => { if (profile) fetchData() }, [profile])

  const fetchData = async () => {
    const { data: student } = await supabase.from('students').select('id').eq('profile_id', profile.id).single()
    if (student) {
      setStudentId(student.id)
      const { data } = await supabase.from('grades').select('*').eq('student_id', student.id).order('created_at', { ascending: false })
      setGrades(data || [])
    }
    setLoading(false)
  }

  const getGradeColor = (score) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-blue-400'
    if (score >= 40) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getLetter = (score) => {
    if (score >= 90) return 'A+'
    if (score >= 80) return 'A'
    if (score >= 70) return 'B'
    if (score >= 60) return 'C'
    if (score >= 50) return 'D'
    return 'F'
  }

  const avg = grades.length > 0
    ? (grades.reduce((s, g) => s + g.score, 0) / grades.length).toFixed(1)
    : null

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">My Grades</h1>
        <p className="text-gray-400 mt-1">Your academic performance</p>
      </div>

      {avg && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mb-6 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Overall Average</p>
            <p className={`text-4xl font-bold mt-1 ${getGradeColor(parseFloat(avg))}`}>{avg}%</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-sm">Letter Grade</p>
            <p className={`text-4xl font-bold mt-1 ${getGradeColor(parseFloat(avg))}`}>{getLetter(parseFloat(avg))}</p>
          </div>
        </div>
      )}

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Subject</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Score</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Grade</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              [...Array(5)].map((_, i) => <tr key={i}><td colSpan={4} className="px-6 py-4"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td></tr>)
            ) : grades.length === 0 ? (
              <tr><td colSpan={4} className="text-center text-gray-500 py-12">No grades recorded yet.</td></tr>
            ) : (
              grades.map((g) => (
                <tr key={g.id} className="hover:bg-gray-800/50 transition">
                  <td className="px-6 py-4 text-white text-sm font-medium">{g.subject}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${g.score >= 80 ? 'bg-green-500' : g.score >= 60 ? 'bg-blue-500' : g.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${g.score}%` }} />
                      </div>
                      <span className={`font-bold text-sm ${getGradeColor(g.score)}`}>{g.score}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4"><span className={`font-bold ${getGradeColor(g.score)}`}>{getLetter(g.score)}</span></td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{new Date(g.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
