import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

async function fetchProfile(uid) {
  const q = () => supabase.from('rapidly_profiles').select('*').eq('id', uid).maybeSingle()
  let { data } = await q()
  if (!data) {
    // profile is created by a DB trigger; wait a moment and retry once
    await new Promise((r) => setTimeout(r, 800))
    ;({ data } = await q())
  }
  return data
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async (uid) => {
    if (!uid) return setProfile(null)
    setProfile(await fetchProfile(uid))
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await refreshProfile(data.session?.user.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setTimeout(() => refreshProfile(s?.user.id), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [refreshProfile])

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    refreshProfile: () => refreshProfile(session?.user.id),
    signOut: () => supabase.auth.signOut(),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
