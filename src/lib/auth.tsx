import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, errorMessage } from './supabase'
import type { Profile } from './types'

interface AuthState {
  profile: Profile | null
  profiles: Record<string, Profile>
  signedIn: boolean
  loading: boolean
  error: string
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [profileLoading, setProfileLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id ?? null

  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setProfiles({})
      setError('')
      return
    }
    let cancelled = false
    setProfileLoading(true)
    supabase
      .from('profiles')
      .select('id, full_name, role')
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) {
          setError(errorMessage(err))
        } else {
          const map: Record<string, Profile> = {}
          for (const p of data as Profile[]) map[p.id] = p
          setProfiles(map)
          setProfile(map[userId] ?? null)
          setError(map[userId] ? '' : 'Профиль пользователя не найден')
        }
        setProfileLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const loading = !sessionReady || (!!userId && (profileLoading || (!profile && !error)))

  return (
    <AuthContext.Provider value={{ profile, profiles, signedIn: !!userId, loading, error, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
