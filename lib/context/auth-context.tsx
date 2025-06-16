"use client"

import type React from "react"
import { createContext, useContext, useReducer, useEffect } from "react"
import { useRouter } from "next/navigation"

// Define types
type User = {
  id: string
  name: string
  email: string
  role: string
  avatar?: string
}

type AuthState = {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

type AuthAction =
  | { type: "LOGIN_START" }
  | { type: "LOGIN_SUCCESS"; payload: User }
  | { type: "LOGIN_FAILURE"; payload: string }
  | { type: "LOGOUT" }
  | { type: "CLEAR_ERROR" }

type AuthContextType = {
  state: AuthState
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  clearError: () => void
}

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Reducer function
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN_START":
      return {
        ...state,
        isLoading: true,
        error: null,
      }
    case "LOGIN_SUCCESS":
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload,
        error: null,
      }
    case "LOGIN_FAILURE":
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: action.payload,
      }
    case "LOGOUT":
      return {
        ...state,
        isAuthenticated: false,
        user: null,
      }
    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
      }
    default:
      return state
  }
}

// Provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState)
  const router = useRouter()

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        dispatch({ type: "LOGIN_SUCCESS", payload: user })
      } catch (error) {
        localStorage.removeItem("user")
      }
    }
  }, [])

  // Login function
  const login = async (email: string, password: string) => {
    dispatch({ type: "LOGIN_START" })

    try {
      // In a real app, this would be an API call
      // For demo purposes, we'll simulate a successful login
      if (email && password) {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const user: User = {
          id: "1",
          name: "John Doe",
          email: email,
          role: "user",
          avatar: "/abstract-geometric-shapes.png",
        }

        // Store user in localStorage for persistence
        localStorage.setItem("user", JSON.stringify(user))

        dispatch({ type: "LOGIN_SUCCESS", payload: user })
        router.push("/dashboard")
      } else {
        dispatch({ type: "LOGIN_FAILURE", payload: "Invalid email or password" })
      }
    } catch (error) {
      dispatch({
        type: "LOGIN_FAILURE",
        payload: error instanceof Error ? error.message : "An error occurred during login",
      })
    }
  }

  // Logout function
  const logout = () => {
    localStorage.removeItem("user")
    dispatch({ type: "LOGOUT" })
    router.push("/login")
  }

  // Clear error function
  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" })
  }

  return <AuthContext.Provider value={{ state, login, logout, clearError }}>{children}</AuthContext.Provider>
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
