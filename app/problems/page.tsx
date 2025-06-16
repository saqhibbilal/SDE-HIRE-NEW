"use client"

import { useState } from "react"
import { AuthLayout } from "@/components/layout/auth-layout"
import { ProblemHeader } from "./components/problem-header"
import { ProblemFilters } from "./components/problem-filters"
import { ProblemList } from "./components/problem-list"

// Import questions from the DSA tutor
import questionsData from "../dsa-tutor/questions.json"

export default function ProblemsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState("all")

  // Filter questions based on search query and difficulty
  const filteredQuestions = questionsData.filter((question) => {
    const matchesSearch = question.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDifficulty =
      difficultyFilter === "all" || question.difficulty.toLowerCase() === difficultyFilter.toLowerCase()
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

        <ProblemList filteredQuestions={filteredQuestions} />
      </div>
    </AuthLayout>
  )
}
