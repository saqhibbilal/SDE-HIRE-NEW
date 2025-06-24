'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type AuthContextType = {
  user: any
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Load session on mount
  useEffect(() => {
    const getSession = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (data?.user) setUser(data.user)
      setLoading(false)
    }

    getSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
  setLoading(true)
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (!error) {
    const { data } = await supabase.auth.getUser()
    setUser(data?.user || null)
    router.push('/dashboard')
  }

  setLoading(false)

  return error // ← send it back so form can show it
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
 

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    // This will clearly throw where the issue is happening
    throw new Error(
      "❌ useAuth() must be used within an <AuthProvider>. Check if the component using it is a client component and wrapped correctly."
    )
  }
  return context
}