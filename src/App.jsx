import { useAuth } from './context/AuthContext'
import Auth from './pages/Auth'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import ConsentModal from './components/ConsentModal'

export default function App() {
  const { session, profile, loading, recovery } = useAuth()

  if (loading) return <div className="center">Loading…</div>
  // user opened the reset-password link from email
  if (recovery && session) return <ResetPassword />
  if (!session) return <Auth />

  const needsConsent = profile && !profile.consent_given_at

  return (
    <>
      <Dashboard />
      {needsConsent && <ConsentModal />}
    </>
  )
}
