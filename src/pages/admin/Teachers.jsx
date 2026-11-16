import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { createAccountClient } from '../../lib/accountClient'

export default function Teachers() {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchTeachers() }, [])

  const fetchTeachers = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'teacher').order('created_at', { ascending: false })
    setTeachers(data || [])
    setLoading(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')

    // Use a throwaway client so creating this account doesn't log the admin out
    const accountClient = createAccountClient()

    const { data, error: signUpError } = await accountClient.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.full_name, role: 'teacher' } },
    })

    if (signUpError) { setError(signUpError.message); setSaving(false); return }
    if (!data.user) { setError('Account was not created. Check your Supabase email settings.'); setSaving(false); return }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: form.full_name,
      role: 'teacher',
    })

    if (profileError) { setError(profileError.message); setSaving(false); return }

    setModal(false)
    setForm({ full_name: '', email: '', password: '' })
    fetchTeachers()
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this teacher profile? Their login account will remain in Supabase Auth.')) return
    await supabase.from('profiles').delete().eq('id', id)
    fetchTeachers()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Teachers</h1>
          <p className="text-gray-400 mt-1">{teachers.length} total teachers</p>
        </div>
        <button onClick={() => { setError(''); setModal(true) }} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + Add Teacher
        </button>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">#</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Name</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Added</th>
              <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              [...Array(3)].map((_, i) => <tr key={i}><td colSpan={4} className="px-6 py-4"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td></tr>)
            ) : teachers.length === 0 ? (
              <tr><td colSpan={4} className="text-center text-gray-500 py-12">No teachers yet.</td></tr>
            ) : teachers.map((t, i) => (
              <tr key={t.id} className="hover:bg-gray-800/50 transition">
                <td className="px-6 py-4 text-gray-500 text-sm">{i + 1}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold">{t.full_name[0].toUpperCase()}</div>
                    <span className="text-white text-sm font-medium">{t.full_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-500 text-sm">{new Date(t.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDelete(t.id)} className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-md">
            <h2 className="text-white font-semibold text-lg mb-4">Add Teacher</h2>
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-2 mb-3 text-sm">{error}</div>}
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Full Name</label>
                <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Email (login)</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Password</label>
                <input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} placeholder="min 6 characters" className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500" />
              </div>
              <p className="text-gray-500 text-xs">Write these down — the teacher will use them to sign in.</p>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">{saving ? 'Creating...' : 'Create Teacher'}</button>
                <button type="button" onClick={() => setModal(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
