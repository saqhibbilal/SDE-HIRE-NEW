"use client"

import { useEffect, useState } from "react"
import { AuthLayout } from "@/components/layout/auth-layout"
import { ProblemHeader } from "./components/problem-header"
import { ProblemFilters } from "./components/problem-filters"
import { ProblemList } from "./components/problem-list"
import { supabase } from "@/lib/supabase"

type Problem = {
  id: number
  title: string
  description: string
  difficulty: string
}

export default function ProblemsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState("all")
  const [problems, setProblems] = useState<Problem[]>([])

  useEffect(() => {
    const fetchProblems = async () => {
      const { data, error } = await supabase
        .from("problems")
        .select("id, title, description, difficulty")
        .order("id", { ascending: true })

      if (error) {
        console.error("Error fetching problems:", error)
      } else {
        setProblems(data)
      }
    }

    fetchProblems()
  }, [])

  const filteredProblems = problems.filter((problem) => {
    const matchesSearch = problem.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDifficulty =
      difficultyFilter === "all" || problem.difficulty.toLowerCase() === difficultyFilter.toLowerCase()
    return matchesSearch && matchesDifficulty
  })

  return (
    <AuthLayout>
      <div className="p-6">
        <ProblemHeader />

        <ProblemFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          difficultyFilter={difficultyFilter}
          setDifficultyFilter={setDifficultyFilter}
        />

        <ProblemList filteredQuestions={filteredProblems} />
      </div>
    </AuthLayout>
  )
}
