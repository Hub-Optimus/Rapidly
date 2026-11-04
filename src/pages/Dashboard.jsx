import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { toForm, profileCompleteness } from '../lib/profileSchema'
import { runAutopilot, lastRunText } from '../lib/autopilot'

const DAYS = 7

export default function Dashboard({ onOpenProfile, onOpenJobs }) {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  const [resumeCount, setResumeCount] = useState(0)
  const [jobStats, setJobStats] = useState({ good: 0, total: 0 })
  const [ap, setAp] = useState({ running: false, error: '', summary: '' })

  useEffect(() => {
    if (!user) return
    supabase
      .from('rapidly_resumes')
      .select('id')
      .then(({ data }) => setResumeCount(data?.length ?? 0))
  }, [user])

  const loadJobStats = useCallback(() => {
    supabase.from('rapidly_jobs').select('match_score,status').neq('status', 'hidden').then(({ data }) => {
      const bar = Number(profile?.min_match_score ?? 70)
      const rows = data || []
      setJobStats({ total: rows.length, good: rows.filter((j) => (j.match_score ?? -1) >= bar).length })
    })
  }, [profile?.min_match_score])

  useEffect(() => {
    if (user) loadJobStats()
  }, [user, loadJobStats])

  async function toggleAutopilot() {
    setAp((a) => ({ ...a, error: '' }))
    const { error } = await supabase.from('rapidly_profiles').update({ autopilot_enabled: !profile?.autopilot_enabled }).eq('id', user.id)
    if (error) setAp((a) => ({ ...a, error: 'Could not save that. Please try again.' }))
    await refreshProfile()
  }

  async function runNow() {
    setAp({ running: true, error: '', summary: '' })
    try {
      const r = await runAutopilot(supabase)
      setAp({ running: false, error: '', summary: r.summary || '' })
    } catch (e) {
      setAp({ running: false, error: e.message, summary: '' })
    }
    await refreshProfile()
    loadJobStats()
  }

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
        <div className="card wide" aria-busy={ap.running}>
          <div className="row spread">
            <h3>Autopilot</h3>
            <button type="button" role="switch" aria-checked={!!profile?.autopilot_enabled} aria-label="Autopilot daily check"
              className={`switch ${profile?.autopilot_enabled ? 'on' : ''}`} onClick={toggleAutopilot}><span /></button>
          </div>
          <p className="muted small">Every day Rapidly checks public company job pages (its built-in list plus yours) and scores new roles that fit your titles and places using AI. It does not apply to anything.</p>
          {profile?.autopilot_last_summary && !ap.summary && (
            <p className="small" data-testid="ap-last">{profile.autopilot_last_summary} <span className="muted">({lastRunText(profile.autopilot_last_run_at)})</span></p>
          )}
          {ap.summary && <p className="small" role="status" data-testid="ap-summary">{ap.summary}</p>}
          {ap.error && <p className="ferr" role="alert">{ap.error}</p>}
          <button className="btn primary" onClick={runNow} disabled={ap.running}>{ap.running ? 'Checking company pages… this can take up to 2 minutes' : 'Run now'}</button>
        </div>
        <div className="card">
          <h3>Jobs</h3>
          <p className="muted small">
            {jobStats.total === 0 ? 'No jobs yet. Paste one and get a match score.' : `${jobStats.good} good match${jobStats.good === 1 ? '' : 'es'} out of ${jobStats.total}.`}
          </p>
          <button className="btn primary" onClick={onOpenJobs}>{jobStats.total === 0 ? 'Add your first job' : 'Open jobs'}</button>
        </div>
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
