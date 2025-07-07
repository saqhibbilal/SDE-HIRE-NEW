"use client"

import type React from "react"
import { createContext, useContext, useReducer, useEffect, useCallback, useState } from "react"
import { useAuth } from "@/lib/context/auth-context"
import { supabase } from "@/lib/supabase"
import type { Question } from "@/app/dsa-tutor/types"

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

const initialState: ProgressState = {
  problemsProgress: {},
  totalSolved: 0,
  totalAttempted: 0,
  streak: 0,
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined)

function progressReducer(state: ProgressState, action: ProgressAction): ProgressState {
  switch (action.type) {
    case "INIT_PROGRESS":
      return action.payload

    case "MARK_SOLVED": {
      const { problemId } = action.payload
      const existingProgress = state.problemsProgress[problemId]
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
      const today = new Date().toDateString()
      const lastActiveDate = state.lastActive ? new Date(state.lastActive).toDateString() : null

      if (lastActiveDate === today) {
        return state
      }

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayString = yesterday.toDateString()

      if (lastActiveDate === yesterdayString) {
        return { ...state, streak: state.streak + 1 }
      }

      return { ...state, streak: 0 }
    }

    case "RESET_PROGRESS":
      return initialState

    default:
      return state
  }
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [state, dispatch] = useReducer(progressReducer, initialState)
  const [problems, setProblems] = useState<Question[]>([])

  // Fetch problems from Supabase
  const loadProblems = useCallback(async () => {
    const { data, error } = await supabase
      .from("problems")
      .select("id, difficulty")
      .order("id", { ascending: true })

    if (error) {
      console.error("Error fetching problems:", error)
      setProblems([])
      return
    }

    setProblems(data as Question[])
  }, [])

  const loadProgress = useCallback(async () => {
    if (!user) return

    const { data, error } = await supabase
      .from("users")
      .select("progress")
      .eq("id", user.id)
      .single()

    if (error) {
      console.error("Error fetching progress:", error)
      return
    }

    if (data && data.progress) {
      const safeProgress = {
        problemsProgress: {},
        totalSolved: 0,
        totalAttempted: 0,
        streak: 0,
        ...data.progress, // If keys are missing, they will get default values
      }
      dispatch({ type: "INIT_PROGRESS", payload: safeProgress })
    }

    dispatch({ type: "UPDATE_STREAK" })
  }, [user])

  useEffect(() => {
    loadProgress()
    loadProblems()

    const intervalId = setInterval(() => {
      dispatch({ type: "UPDATE_STREAK" })
    }, 1000 * 60 * 60)

    return () => clearInterval(intervalId)
  }, [loadProgress, loadProblems])

  const saveProgress = async (updatedState: ProgressState) => {
    if (!user) return

    const { error } = await supabase
      .from("users")
      .update({ progress: updatedState })
      .eq("id", user.id)

    if (error) {
      console.error("Error saving progress:", error)
    }
  }

  const markProblemSolved = (problemId: number) => {
    const updatedState = progressReducer(state, { type: "MARK_SOLVED", payload: { problemId } })
    dispatch({ type: "MARK_SOLVED", payload: { problemId } })
    saveProgress(updatedState)
  }

  const markProblemAttempted = (problemId: number) => {
    const updatedState = progressReducer(state, { type: "MARK_ATTEMPTED", payload: { problemId } })
    dispatch({ type: "MARK_ATTEMPTED", payload: { problemId } })
    saveProgress(updatedState)
  }

  const resetProgress = () => {
    dispatch({ type: "RESET_PROGRESS" })
    saveProgress(initialState)
  }

  const getProblemStatus = (problemId: number): ProblemStatus => {
    return state.problemsProgress[problemId]?.status || "unsolved"
  }

  const getProgressByDifficulty = (difficulty: string) => {
    const problemsByDifficulty = problems.filter(
      (q) => q.difficulty.toLowerCase() === difficulty.toLowerCase(),
    )
    const solvedCount = problemsByDifficulty.filter(
      (q) => state.problemsProgress[q.id]?.status === "solved",
    ).length

    return { solved: solvedCount, total: problemsByDifficulty.length }
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

export function useProgress() {
  const context = useContext(ProgressContext)
  if (context === undefined) {
    throw new Error("useProgress must be used within a ProgressProvider")
  }
  return context
}
