import { useEffect, useState } from "react"
import { BookOpen, Award, Clock } from "lucide-react"
import { StatsCard } from "./stats-card"
import { useProgress } from "@/lib/context/progress-context"
import { supabase } from "@/lib/supabase"

export function StatsSection() {
  const { state } = useProgress()
  const [totalProblems, setTotalProblems] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch total problems from Supabase
  useEffect(() => {
    const fetchTotalProblems = async () => {
      try {
        const { count, error } = await supabase
          .from("problems")
          .select("*", { count: "exact", head: true }) // Use count query for efficiency

        if (error) {
          throw new Error(`Error fetching problems: ${error.message}`)
        }

        setTotalProblems(count ?? 0)
      } catch (err) {
        console.error("Error fetching total problems:", err)
        setError("Failed to load total problems. Please try again.")
        setTotalProblems(0) // Fallback to 0 to avoid breaking UI
      }
    }

    fetchTotalProblems()
  }, [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <StatsCard
        title="DSA Problems"
        description="Practice data structures and algorithms"
        value={totalProblems !== null ? totalProblems : "Loading..."}
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