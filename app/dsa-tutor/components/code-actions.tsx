"use client"

import { Button } from "@/components/ui/button"
import { Play, Send } from "lucide-react"
import type { Language } from "../types"

interface CodeActionsProps {
  selectedLanguage: Language
  handleLanguageChange: (value: string) => void
  handleRunCode: () => void
  isRunning: boolean
  handleSubmitCode: () => void
  isSubmitting: boolean
  isMobile?: boolean
}

export function CodeActions({
  selectedLanguage,
  handleLanguageChange,
  handleRunCode,
  isRunning,
  handleSubmitCode,
  isSubmitting,
  isMobile = false,
}: CodeActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleRunCode}
        disabled={isRunning}
        className="h-8 px-3 gap-1 dark:border-green-500 dark:neon-border-green"
      >
        <Play className="h-3.5 w-3.5" />
        Run
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSubmitCode}
        disabled={isSubmitting}
        className="h-8 px-3 gap-1 dark:border-blue-500 dark:neon-border-blue"
      >
        <Send className="h-3.5 w-3.5" />
        Submit
      </Button>
    </div>
  )
}
