import { useAuth } from './context/AuthContext'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import ConsentModal from './components/ConsentModal'

export default function App() {
  const { session, profile, loading } = useAuth()

  if (loading) return <div className="center">Loading…</div>
  if (!session) return <Auth />

  const needsConsent = profile && !profile.consent_given_at

  return (
    <>
      <Dashboard />
      {needsConsent && <ConsentModal />}
    </>
  )
}
