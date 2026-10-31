import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PasswordInput from '../components/PasswordInput'

export default function Auth() {
  const [mode, setMode] = useState('login') // login | signup | forgot
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [cooldown, setCooldown] = useState(0) // seconds before "send reset link" can be used again

  // If the user opened an expired/used email link, show a clear message
  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const code = h.get('error_code')
    if (code) {
      if (code === 'otp_expired') {
        setMode('forgot')
        setError('That link has expired or was already used. Enter your email to get a new one.')
      } else {
        setError(h.get('error_description') || 'Something went wrong with that link.')
      }
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  function switchMode(next) {
    setMode(next)
    setError('')
    setInfo('')
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        })
        if (error) throw error
        if (!data.session) setInfo('Account created. Check your email to confirm, then log in.')
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })
        if (error) throw error
        // same message whether or not the account exists (privacy)
        setInfo('If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.')
        setCooldown(60)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const buttonLabel =
    mode === 'signup'
      ? busy ? 'Please wait…' : 'Create account'
      : mode === 'forgot'
      ? cooldown > 0 ? `Resend in ${cooldown}s` : busy ? 'Sending…' : 'Send reset link'
      : busy ? 'Please wait…' : 'Log in'

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="logo">Rapidly</h1>
        {mode === 'forgot' ? (
          <>
            <h2 className="auth-title">Reset your password</h2>
            <p className="muted">Enter your email and we will send you a link to set a new password.</p>
          </>
        ) : (
          <p className="muted">Your AI job-search agent. You handle the interviews.</p>
        )}

        <form onSubmit={submit}>
          {mode === 'signup' && (
            <input
              placeholder="Full name"
              aria-label="Full name"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            aria-label="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {mode !== 'forgot' && (
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={mode === 'signup' ? 8 : undefined}
            />
          )}
          {mode === 'signup' && <p className="hint">At least 8 characters.</p>}
          {mode === 'login' && (
            <div className="forgot-row">
              <button type="button" className="link inline" onClick={() => switchMode('forgot')}>
                Forgot password?
              </button>
            </div>
          )}
          {error && <div className="msg error" role="alert">{error}</div>}
          {info && <div className="msg ok" role="status">{info}</div>}
          <button className="btn primary" disabled={busy || (mode === 'forgot' && cooldown > 0)}>
            {buttonLabel}
          </button>
        </form>

        {mode === 'forgot' ? (
          <button className="link" onClick={() => switchMode('login')}>
            Back to log in
          </button>
        ) : (
          <button className="link" onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Log in'}
          </button>
        )}
      </div>
    </div>
  )
}
