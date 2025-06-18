import { FileText } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import type { Question } from "../types"
//import { Button } from "@/components/ui/button"; // ADDED Button import (assuming it's from your ui library)


interface ChallengeDescriptionProps {
  currentQuestion: Question
  currentQuestionIndex: number
  challengeHeight: number
  //isCollapsed: boolean; // ADDED
  //onToggleCollapse: () => void; // ADDED
}

export function ChallengeDescription({
  currentQuestion,
  currentQuestionIndex,
  challengeHeight,
}: ChallengeDescriptionProps) {
 // const collapsedHeight = 40;
  return (
    <div style={{ height: `${challengeHeight}px` }} className="border-b">
      <div className="border-b bg-muted/30 px-4 py-2 flex items-center h-10 dark:border-cyan-500 dark:neon-border-cyan">
        <FileText className="h-4 w-4 mr-2 dark:text-cyan-400" />
        <span className="font-medium dark:neon-text-cyan">Challenge</span>
      </div>
<div
  className="pt-4 pr-4 pl-4 space-y-4 overflow-y-auto"
  style={{ maxHeight: `${challengeHeight - 40}px`, paddingBottom: '10%' }}
>        
          <div>
          <h2 className="text-base md:text-lg font-bold mb-2 dark:neon-text-cyan">
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
          <p className="whitespace-pre-line mb-4 text-xs md:text-sm">{currentQuestion.question}</p>

        </div>

        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-xs md:text-sm dark:neon-text-yellow">Input Format</h3>
            <p className="mt-1 whitespace-pre-line text-xs">{currentQuestion.input_format}</p>
          </div>

          <div>
            <h3 className="font-semibold text-xs md:text-sm dark:neon-text-yellow">Output Format</h3>
            <p className="mt-1 whitespace-pre-line text-xs">{currentQuestion.output_format}</p>

          </div>

          <div>
            <h3 className="font-semibold text-xs md:text-sm dark:neon-text-yellow">Constraints</h3>
            <p className="mt-1 whitespace-pre-line text-xs">{currentQuestion.constraints}</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-xs md:text-sm dark:neon-text-yellow">Example:</h3>
            <div className="mt-2 space-y-2">
              <div>
                <div className="text-[11px] font-medium text-muted-foreground">Input:</div>
                <pre className="mt-1 bg-muted p-2 rounded-md overflow-x-auto text-[11px]">
                 <code>{currentQuestion.sample_input}</code>
                </pre>
              </div>
              <div>
                <div className="text-[11px] font-medium text-muted-foreground">Output:</div>
               <pre className="mt-1 bg-muted p-2 rounded-md overflow-x-auto text-[11px]">
               <code>{currentQuestion.sample_output}</code>
              </pre>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-xs md:text-sm dark:neon-text-yellow">Hint:</h3>

            <p className="mt-1 text-xs">{currentQuestion.hint}</p>

          </div>
        </div>
      </div>
    </div>
  )
}
