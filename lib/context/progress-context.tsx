"use client"

import type React from "react"
import { createContext, useContext, useReducer, useEffect } from "react"
import type { Question } from "@/app/dsa-tutor/types"

// Define types
type ProblemStatus = "unsolved" | "solved" | "attempted"

type ProblemProgress = {
  id: number
  status: ProblemStatus
  lastAttempted?: string
  completedAt?: string
  attempts: number
}

type ProgressState = {
  problemsProgress: Record<number, ProblemProgress>
  totalSolved: number
  totalAttempted: number
  streak: number
  lastActive?: string
}

type ProgressAction =
  | { type: "INIT_PROGRESS"; payload: ProgressState }
  | { type: "MARK_SOLVED"; payload: { problemId: number } }
  | { type: "MARK_ATTEMPTED"; payload: { problemId: number } }
  | { type: "RESET_PROGRESS" }
  | { type: "UPDATE_STREAK" }

type ProgressContextType = {
  state: ProgressState
  markProblemSolved: (problemId: number) => void
  markProblemAttempted: (problemId: number) => void
  resetProgress: () => void
  getProblemStatus: (problemId: number) => ProblemStatus
  getProgressByDifficulty: (difficulty: string) => { solved: number; total: number }
}

// Initial state
const initialState: ProgressState = {
  problemsProgress: {},
  totalSolved: 0,
  totalAttempted: 0,
  streak: 0,
}

// Create context
const ProgressContext = createContext<ProgressContextType | undefined>(undefined)

// Reducer function
function progressReducer(state: ProgressState, action: ProgressAction): ProgressState {
  switch (action.type) {
    case "INIT_PROGRESS":
      return action.payload

    case "MARK_SOLVED": {
      const { problemId } = action.payload
      const existingProgress = state.problemsProgress[problemId]

      // Only count as newly solved if it wasn't already solved
      const isNewlySolved = !existingProgress || existingProgress.status !== "solved"

      return {
        ...state,
        problemsProgress: {
          ...state.problemsProgress,
          [problemId]: {
            id: problemId,
            status: "solved",
            attempts: existingProgress ? existingProgress.attempts + 1 : 1,
            lastAttempted: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          },
        },
        totalSolved: isNewlySolved ? state.totalSolved + 1 : state.totalSolved,
        totalAttempted: existingProgress ? state.totalAttempted : state.totalAttempted + 1,
        lastActive: new Date().toISOString(),
      }
    }

    case "MARK_ATTEMPTED": {
      const { problemId } = action.payload
      const existingProgress = state.problemsProgress[problemId]

      // Only increment totalAttempted if this is the first attempt
      const isFirstAttempt = !existingProgress

      return {
        ...state,
        problemsProgress: {
          ...state.problemsProgress,
          [problemId]: {
            id: problemId,
            status: existingProgress?.status === "solved" ? "solved" : "attempted",
            attempts: existingProgress ? existingProgress.attempts + 1 : 1,
            lastAttempted: new Date().toISOString(),
            completedAt: existingProgress?.completedAt,
          },
        },
        totalAttempted: isFirstAttempt ? state.totalAttempted + 1 : state.totalAttempted,
        lastActive: new Date().toISOString(),
      }
    }

    case "UPDATE_STREAK": {
      // Check if user was active today
      const today = new Date().toDateString()
      const lastActiveDate = state.lastActive ? new Date(state.lastActive).toDateString() : null

      // If active today, streak continues
      if (lastActiveDate === today) {
        return state
      }

      // If active yesterday, increment streak
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayString = yesterday.toDateString()

      if (lastActiveDate === yesterdayString) {
        return {
          ...state,
          streak: state.streak + 1,
        }
      }

      // If not active yesterday or today, reset streak
      return {
        ...state,
        streak: 0,
      }
    }

    case "RESET_PROGRESS":
      return initialState

    default:
      return state
  }
}

// Provider component
export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(progressReducer, initialState)

  // Load progress from localStorage on mount
  useEffect(() => {
    const storedProgress = localStorage.getItem("problemsProgress")
    if (storedProgress) {
      try {
        const parsedProgress = JSON.parse(storedProgress)
        dispatch({ type: "INIT_PROGRESS", payload: parsedProgress })
      } catch (error) {
        console.error("Failed to parse stored progress:", error)
      }
    }

    // Update streak daily
    dispatch({ type: "UPDATE_STREAK" })

    // Set up daily streak check
    const intervalId = setInterval(
      () => {
        dispatch({ type: "UPDATE_STREAK" })
      },
      1000 * 60 * 60,
    ) // Check every hour

    return () => clearInterval(intervalId)
  }, [])

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("problemsProgress", JSON.stringify(state))
  }, [state])

  // Mark a problem as solved
  const markProblemSolved = (problemId: number) => {
    dispatch({ type: "MARK_SOLVED", payload: { problemId } })
  }

  // Mark a problem as attempted
  const markProblemAttempted = (problemId: number) => {
    dispatch({ type: "MARK_ATTEMPTED", payload: { problemId } })
  }

  // Reset all progress
  const resetProgress = () => {
    dispatch({ type: "RESET_PROGRESS" })
  }

  // Get the status of a specific problem
  const getProblemStatus = (problemId: number): ProblemStatus => {
    return state.problemsProgress[problemId]?.status || "unsolved"
  }

  // Get progress statistics by difficulty
  const getProgressByDifficulty = (difficulty: string) => {
    // This would typically fetch problems from an API or context
    // For now, we'll import from the questions.json directly
    const questions = require("@/app/dsa-tutor/questions.json") as Question[]

    const problemsByDifficulty = questions.filter((q) => q.difficulty.toLowerCase() === difficulty.toLowerCase())

    const solvedCount = problemsByDifficulty.filter((q) => state.problemsProgress[q.id]?.status === "solved").length

    return {
      solved: solvedCount,
      total: problemsByDifficulty.length,
    }
  }

  return (
    <ProgressContext.Provider
      value={{
        state,
        markProblemSolved,
        markProblemAttempted,
        resetProgress,
        getProblemStatus,
        getProgressByDifficulty,
      }}
    >
      {children}
    </ProgressContext.Provider>
  )
}

// Custom hook to use the progress context
export function useProgress() {
  const context = useContext(ProgressContext)
  if (context === undefined) {
    throw new Error("useProgress must be used within a ProgressProvider")
  }
  return context
}
