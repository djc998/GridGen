'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const clearSession = useCallback(() => {
    setUser(null)
    setLoading(false)
    router.push('/login')
  }, [router])

  const handleSession = useCallback((session: Session | null) => {
    if (session?.user) {
      setUser(session.user)
    } else {
      setUser(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    let mounted = true

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      handleSession(session)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return
        
        switch (event) {
          case 'SIGNED_IN':
            handleSession(session)
            router.push('/dashboard')
            break
          case 'SIGNED_OUT':
            clearSession()
            break
          case 'TOKEN_REFRESHED':
            handleSession(session)
            break
          case 'USER_UPDATED':
            handleSession(session)
            break
        }
      }
    )

    // Cleanup subscription
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router, clearSession, handleSession])

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      if (!data?.session) throw new Error('No session created')

      handleSession(data.session)
      router.push('/dashboard')
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      await supabase.auth.signOut()
      clearSession()
    } catch (error) {
      console.error('Sign out error:', error)
      clearSession()
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
} 