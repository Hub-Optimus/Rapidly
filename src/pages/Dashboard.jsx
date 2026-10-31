import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { toForm, profileCompleteness } from '../lib/profileSchema'

const DAYS = 7

export default function Dashboard({ onOpenProfile }) {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  const [resumeCount, setResumeCount] = useState(0)

  useEffect(() => {
    if (!user) return
    supabase
      .from('rapidly_resumes')
      .select('id')
      .then(({ data }) => setResumeCount(data?.length ?? 0))
  }, [user])

  const { percent, missing } = profileCompleteness(toForm(profile || {}), resumeCount)

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
        <div className="card wide">
          <div className="row spread">
            <h3>Your profile</h3>
            <span className="small">{percent}% complete</span>
          </div>
          <div
            className="progress"
            role="progressbar"
            aria-label="Profile completeness"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${percent}%` }} />
          </div>
          <p className="muted small">
            {percent < 100 ? `Next: ${missing.slice(0, 3).join(', ')}.` : 'Your profile is complete.'}
          </p>
          <button className="btn primary" onClick={onOpenProfile}>
            {percent < 100 ? 'Complete your profile' : 'Edit profile'}
          </button>
        </div>
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
