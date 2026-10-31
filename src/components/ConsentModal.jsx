import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function ConsentModal() {
  const { user, refreshProfile, signOut } = useAuth()
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function accept() {
    setBusy(true)
    setError('')
    const { error } = await supabase
      .from('rapidly_profiles')
      .update({ consent_given_at: new Date().toISOString() })
      .eq('id', user.id)
    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }
    await refreshProfile()
  }

  return (
    <div className="overlay">
      <div className="modal">
        <h2>Before we start</h2>
        <div className="consent-text">
          <p>Rapidly works on your behalf to find and apply for jobs. Please read how it works:</p>
          <ul>
            <li>
              <b>Data we store:</b> your profile, resumes, job matches, application history and
              recruiter emails, so the agent can work for you.
            </li>
            <li>
              <b>Email access:</b> if you connect Gmail, Rapidly reads job alerts and recruiter
              emails, drafts replies, and may use your email to verify accounts on company sites.
            </li>
            <li>
              <b>Automation risk:</b> job portals such as LinkedIn, Naukri and Indeed restrict
              automated activity in their terms. Using auto-apply can lead to limits on your
              account there. You use it at your own risk.
            </li>
            <li>
              <b>Your control:</b> you can pause the agent and review every action on your
              dashboard.
            </li>
            <li>
              <b>Delete anytime:</b> you can request account deletion whenever you want. Your
              data is removed after 7 days. If you return within 7 days, you can restore it.
            </li>
          </ul>
        </div>

        <label className="check">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          I have read this and I agree.
        </label>
        {error && <div className="msg error">{error}</div>}

        <div className="row">
          <button className="btn" onClick={signOut} disabled={busy}>
            Decline and log out
          </button>
          <button className="btn primary" onClick={accept} disabled={!agree || busy}>
            {busy ? 'Saving…' : 'I agree, continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
