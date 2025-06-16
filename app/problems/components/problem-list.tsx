import { ProblemCard } from "./problem-card"
import type { Question } from "@/app/dsa-tutor/types"

interface ProblemListProps {
  filteredQuestions: Question[]
}

export function ProblemList({ filteredQuestions }: ProblemListProps) {
  if (filteredQuestions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No problems found matching your criteria.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {filteredQuestions.map((question, index) => (
        <ProblemCard
          key={question.id}
          id={question.id}
          index={index}
          title={question.title}
          difficulty={question.difficulty}
          question={question.question}
        />
      ))}
    </div>
  )
}
