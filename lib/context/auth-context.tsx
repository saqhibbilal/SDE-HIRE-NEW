
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type AuthContextType = {
  user: any
  loading: boolean
  isRegistered: boolean
  login: (email: string, password: string) => Promise<any>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isRegistered, setIsRegistered] = useState(false)
  const router = useRouter()

  // Check if user is registered
  const checkRegistrationStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('is_registered')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error checking registration status:', error)
        return false
      }

      return data?.is_registered || false
    } catch (error) {
      console.error('Error checking registration status:', error)
      return false
    }
  }

  // Load session on mount
  useEffect(() => {
    const getSession = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (data?.user) {
        setUser(data.user)
        const registered = await checkRegistrationStatus(data.user.id)
        setIsRegistered(registered)
      }
      setLoading(false)
    }

    getSession()

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user)
        const registered = await checkRegistrationStatus(session.user.id)
        setIsRegistered(registered)
      } else {
        setUser(null)
        setIsRegistered(false)
      }
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
      if (data?.user) {
        setUser(data.user)
        const registered = await checkRegistrationStatus(data.user.id)
        setIsRegistered(registered)
        
        // Redirect based on registration status
        if (registered) {
          router.push('/dashboard')
        } else {
          router.push('/register')
        }
      }
    }

    setLoading(false)
    return error // ← send it back so form can show it
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsRegistered(false)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, loading, isRegistered, login, logout }}>
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

