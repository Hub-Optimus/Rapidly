import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const DAYS = 7

export default function Dashboard() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const [busy, setBusy] = useState(false)

  const deletionAt = profile?.deletion_requested_at
    ? new Date(new Date(profile.deletion_requested_at).getTime() + DAYS * 86400000)
    : null

  async function setDeletion(value) {
    setBusy(true)
    await supabase.from('rapidly_profiles').update({ deletion_requested_at: value }).eq('id', user.id)
    await refreshProfile()
    setBusy(false)
  }

  async function requestDelete() {
    if (!window.confirm('Delete your account? Your data will be removed after 7 days. You can restore it before then.')) return
    await setDeletion(new Date().toISOString())
  }

  return (
    <div className="page">
      <header className="topbar">
        <h1 className="logo">Rapidly</h1>
        <div className="row">
          <span className="muted">{profile?.full_name || user?.email}</span>
          <button className="btn" onClick={signOut}>Log out</button>
        </div>
      </header>

      {deletionAt && (
        <div className="banner">
          Your account is scheduled for deletion on {deletionAt.toLocaleDateString()}.
          <button className="btn primary" onClick={() => setDeletion(null)} disabled={busy}>
            Restore my account
          </button>
        </div>
      )}

      <main className="grid">
        <div className="card"><h3>Matched jobs</h3><p className="muted">Coming in a later step</p></div>
        <div className="card"><h3>Applied</h3><p className="muted">Coming in a later step</p></div>
        <div className="card"><h3>Needs your action</h3><p className="muted">Coming in a later step</p></div>
        <div className="card"><h3>Agent activity</h3><p className="muted">Coming in a later step</p></div>
      </main>

      <footer className="foot">
        {!deletionAt && (
          <button className="link danger" onClick={requestDelete} disabled={busy}>
            Delete my account
          </button>
        )}
      </footer>
    </div>
  )
}
