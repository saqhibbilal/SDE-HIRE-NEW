import { FileText } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import type { Question } from "../types"

interface ChallengeDescriptionProps {
  currentQuestion: Question
  currentQuestionIndex: number
  challengeHeight: number
}

export function ChallengeDescription({
  currentQuestion,
  currentQuestionIndex,
  challengeHeight,
}: ChallengeDescriptionProps) {
  return (
    <div style={{ height: `${challengeHeight}px` }} className="border-b">
      <div className="border-b bg-muted/30 px-4 py-2 flex items-center h-10 dark:border-cyan-500 dark:neon-border-cyan">
        <FileText className="h-4 w-4 mr-2 dark:text-cyan-400" />
        <span className="font-medium dark:neon-text-cyan">Challenge</span>
      </div>

      <div className="p-4 space-y-4 overflow-auto" style={{ height: `${challengeHeight - 40}px` }}>
        <div>
          <h2 className="text-lg md:text-xl font-bold mb-2 dark:neon-text-cyan">
            {currentQuestionIndex + 1}. {currentQuestion.title}
          </h2>
          <div className="flex items-center gap-2 mb-4">
            <Badge
              variant={
                currentQuestion.difficulty === "Easy"
                  ? "outline"
                  : currentQuestion.difficulty === "Medium"
                    ? "secondary"
                    : "destructive"
              }
            >
              {currentQuestion.difficulty}
            </Badge>
          </div>
          <p className="whitespace-pre-line mb-4 text-sm md:text-base">{currentQuestion.question}</p>
        </div>

        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-sm md:text-base dark:neon-text-yellow">Input Format</h3>
            <p className="mt-1 whitespace-pre-line text-sm">{currentQuestion.input_format}</p>
          </div>

          <div>
            <h3 className="font-semibold text-sm md:text-base dark:neon-text-yellow">Output Format</h3>
            <p className="mt-1 whitespace-pre-line text-sm">{currentQuestion.output_format}</p>
          </div>

          <div>
            <h3 className="font-semibold text-sm md:text-base dark:neon-text-yellow">Constraints</h3>
            <p className="mt-1 whitespace-pre-line text-sm">{currentQuestion.constraints}</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-sm md:text-base dark:neon-text-yellow">Example:</h3>
            <div className="mt-2 space-y-2">
              <div>
                <div className="text-xs font-medium text-muted-foreground">Input:</div>
                <pre className="mt-1 bg-muted p-2 rounded-md overflow-x-auto text-xs">
                  <code>{currentQuestion.sample_input}</code>
                </pre>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Output:</div>
                <pre className="mt-1 bg-muted p-2 rounded-md overflow-x-auto text-xs">
                  <code>{currentQuestion.sample_output}</code>
                </pre>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm md:text-base dark:neon-text-yellow">Hint:</h3>
            <p className="mt-1 text-sm">{currentQuestion.hint}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
