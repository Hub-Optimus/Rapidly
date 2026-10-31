import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [mode, setMode] = useState('login') // login | signup
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

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

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="logo">Rapidly</h1>
        <p className="muted">Your AI job-search agent. You handle the interviews.</p>

        <form onSubmit={submit}>
          {mode === 'signup' && (
            <input
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          {error && <div className="msg error">{error}</div>}
          {info && <div className="msg ok">{info}</div>}
          <button className="btn primary" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}
          </button>
        </form>

        <button
          className="link"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login')
            setError('')
            setInfo('')
          }}
        >
          {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  )
}
