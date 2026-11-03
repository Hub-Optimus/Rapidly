import { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext'
import Auth from './pages/Auth'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Jobs from './pages/Jobs'
import Companies from './pages/Companies'
import ConsentModal from './components/ConsentModal'

export default function App() {
  const { session, profile, loading, recovery } = useAuth()
  const [view, setView] = useState('dashboard') // dashboard | profile | jobs | companies

  // browser Back button returns from the profile page to the dashboard
  useEffect(() => {
    const onPop = (e) => setView(['profile', 'jobs', 'companies'].includes(e.state?.view) ? e.state.view : 'dashboard')
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // after logout, always start from the dashboard on the next login
  useEffect(() => {
    if (!session) setView('dashboard')
  }, [session])

  const open = (v) => {
    window.history.pushState({ view: v }, '')
    setView(v)
  }
  const close = () => {
    if (window.history.state?.view) window.history.back()
    else setView('dashboard')
  }

  if (loading) return <div className="center">Loading…</div>
  // user opened the reset-password link from email
  if (recovery && session) return <ResetPassword />
  if (!session) return <Auth />

  const needsConsent = profile && !profile.consent_given_at

  return (
    <>
      {view === 'profile' && profile ? (
        <Profile onBack={close} />
      ) : view === 'jobs' && profile ? (
        <Jobs onBack={close} onOpenCompanies={() => open('companies')} />
      ) : view === 'companies' && profile ? (
        <Companies onBack={close} onOpenJobs={() => { window.history.go(-1) }} />
      ) : (
        <Dashboard onOpenProfile={() => open('profile')} onOpenJobs={() => open('jobs')} />
      )}
      {needsConsent && <ConsentModal />}
    </>
  )
}
