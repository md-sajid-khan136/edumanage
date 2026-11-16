import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { createAccountClient } from '../../lib/accountClient'

export default function Students() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Add / edit student modal
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ full_name: '', roll_number: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Create login modal
  const [loginModal, setLoginModal] = useState(null)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [loginSaving, setLoginSaving] = useState(false)

  useEffect(() => { fetchStudents() }, [])

  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*').order('created_at', { ascending: false })
    setStudents(data || [])
    setLoading(false)
  }

  const openAdd = () => { setEditing(null); setForm({ full_name: '', roll_number: '' }); setError(''); setModal(true) }
  const openEdit = (s) => { setEditing(s); setForm({ full_name: s.full_name, roll_number: s.roll_number }); setError(''); setModal(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')

    const { error } = editing
      ? await supabase.from('students').update(form).eq('id', editing.id)
      : await supabase.from('students').insert(form)

    if (error) { setError(error.message); setSaving(false); return }

    setModal(false); fetchStudents(); setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this student? Their grades and attendance will be deleted too.')) return
    await supabase.from('students').delete().eq('id', id)
    fetchStudents()
  }

  const openLogin = (s) => {
    setLoginModal(s)
    setLoginForm({ email: '', password: '' })
    setLoginError('')
  }

  const handleCreateLogin = async (e) => {
    e.preventDefault()
    setLoginSaving(true); setLoginError('')

    // Use a throwaway client so creating this account doesn't log the admin out
    const accountClient = createAccountClient()

    const { data, error: signUpError } = await accountClient.auth.signUp({
      email: loginForm.email,
      password: loginForm.password,
      options: { data: { full_name: loginModal.full_name, role: 'student' } },
    })

    if (signUpError) { setLoginError(signUpError.message); setLoginSaving(false); return }
    if (!data.user) { setLoginError('Account was not created. Check your Supabase email settings.'); setLoginSaving(false); return }

    // Make sure the profile exists with the student role (the DB trigger
    // normally does this, but upsert covers the case where it didn't).
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: loginModal.full_name,
      role: 'student',
    })

    if (profileError) { setLoginError(profileError.message); setLoginSaving(false); return }

    // Link the auth account to this student record
    const { error: linkError } = await supabase
      .from('students')
      .update({ profile_id: data.user.id })
      .eq('id', loginModal.id)

    if (linkError) { setLoginError(linkError.message); setLoginSaving(false); return }

    setLoginModal(null)
    fetchStudents()
    setLoginSaving(false)
  }

  const handleUnlink = async (s) => {
    if (!confirm('Unlink this login? The student will no longer be able to sign in and see their data.')) return
    await supabase.from('students').update({ profile_id: null }).eq('id', s.id)
    fetchStudents()
  }

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.roll_number.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Students</h1>
          <p className="text-gray-400 mt-1">{students.length} total students</p>
        </div>
        <button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + Add Student
        </button>
      </div>

      <div className="mb-4">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or roll number..."
          className="w-full md:w-80 bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
        />
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">#</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Name</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Roll Number</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Login</th>
              <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              [...Array(5)].map((_, i) => <tr key={i}><td colSpan={5} className="px-6 py-4"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td></tr>)
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-gray-500 py-12">No students found.</td></tr>
            ) : filtered.map((s, i) => (
              <tr key={s.id} className="hover:bg-gray-800/50 transition">
                <td className="px-6 py-4 text-gray-500 text-sm">{i + 1}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">{s.full_name[0].toUpperCase()}</div>
                    <span className="text-white text-sm font-medium">{s.full_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-300 text-sm font-mono">{s.roll_number}</td>
                <td className="px-6 py-4">
                  {s.profile_id ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                      Can sign in
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-700/50 text-gray-400 border border-gray-700">
                      No login
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right whitespace-nowrap">
                  {s.profile_id ? (
                    <button onClick={() => handleUnlink(s)} className="text-yellow-400 hover:text-yellow-300 text-sm mr-3">Unlink</button>
                  ) : (
                    <button onClick={() => openLogin(s)} className="text-green-400 hover:text-green-300 text-sm mr-3">Create login</button>
                  )}
                  <button onClick={() => openEdit(s)} className="text-indigo-400 hover:text-indigo-300 text-sm mr-3">Edit</button>
                  <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / edit student */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-md">
            <h2 className="text-white font-semibold text-lg mb-4">{editing ? 'Edit Student' : 'Add Student'}</h2>
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-2 mb-3 text-sm">{error}</div>}
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Full Name</label>
                <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Roll Number</label>
                <input value={form.roll_number} onChange={e => setForm({ ...form, roll_number: e.target.value })} required className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">{saving ? 'Saving...' : 'Save'}</button>
                <button type="button" onClick={() => setModal(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create login */}
      {loginModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-md">
            <h2 className="text-white font-semibold text-lg mb-1">Create Login</h2>
            <p className="text-gray-400 text-sm mb-4">
              For <span className="text-white">{loginModal.full_name}</span> (Roll {loginModal.roll_number})
            </p>
            {loginError && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-2 mb-3 text-sm">{loginError}</div>}
            <form onSubmit={handleCreateLogin} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Email</label>
                <input type="email" value={loginForm.email} onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} required className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Password</label>
                <input type="text" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} required minLength={6} placeholder="min 6 characters" className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500" />
              </div>
              <p className="text-gray-500 text-xs">Write these down — the student will use them to sign in.</p>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={loginSaving} className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">{loginSaving ? 'Creating...' : 'Create Login'}</button>
                <button type="button" onClick={() => setLoginModal(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
