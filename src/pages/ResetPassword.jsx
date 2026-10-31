import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import PasswordInput from '../components/PasswordInput'

// Shown when the user opens the "reset password" link from their email
export default function ResetPassword() {
  const { finishRecovery } = useAuth()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (pw !== pw2) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    // remove the token from the address bar
    window.history.replaceState(null, '', window.location.pathname)
    setDone(true)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="logo">Rapidly</h1>
        {done ? (
          <>
            <h2 className="auth-title">Password updated</h2>
            <p className="muted">You are logged in with your new password.</p>
            <button className="btn primary" onClick={finishRecovery}>
              Continue to dashboard
            </button>
          </>
        ) : (
          <>
            <h2 className="auth-title">Set a new password</h2>
            <form onSubmit={submit}>
              <PasswordInput
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="New password"
                autoComplete="new-password"
                minLength={8}
              />
              <PasswordInput
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                minLength={8}
              />
              <p className="hint">At least 8 characters.</p>
              {error && <div className="msg error" role="alert">{error}</div>}
              <button className="btn primary" disabled={busy}>
                {busy ? 'Saving…' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
