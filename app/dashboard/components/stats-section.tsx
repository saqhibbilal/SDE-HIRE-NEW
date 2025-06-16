import { BookOpen, Award, Clock } from "lucide-react"
import { StatsCard } from "./stats-card"
import { useProgress } from "@/lib/context/progress-context"

export function StatsSection() {
  const { state } = useProgress()

  // Get total problems count from questions.json
  const questions = require("@/app/dsa-tutor/questions.json")
  const totalProblems = questions.length

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <StatsCard
        title="DSA Problems"
        description="Practice data structures and algorithms"
        value={totalProblems}
        icon={<BookOpen className="h-4 w-4" />}
        linkHref="/problems"
        linkText="View Problems"
      />

      <StatsCard
        title="Completed"
        description="Problems you've solved"
        value={state.totalSolved}
        icon={<Award className="h-4 w-4" />}
        linkHref="/profile"
        linkText="View Progress"
      />

      <StatsCard
        title="Streak"
        description="Your daily coding streak"
        value={`${state.streak} days`}
        icon={<Clock className="h-4 w-4" />}
        linkHref="/activity"
        linkText="View Activity"
      />
    </div>
  )
}
