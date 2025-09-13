"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Brain, Sparkles } from "lucide-react"

interface AIModelSelectionProps {
  isOpen: boolean
  onModelSelected: (model: string) => void
  onClose: () => void
  onBack: () => void
}

const AI_MODELS = [
  { id: "openai", name: "OpenAI", icon: "🤖" },
  { id: "mistral", name: "Mistral", icon: "🧠" },
  { id: "gemini", name: "Gemini", icon: "💎" },
  { id: "grok", name: "Grok", icon: "⚡" }
]

export function AIModelSelection({ isOpen, onModelSelected, onClose, onBack }: AIModelSelectionProps) {
  const [selectedModel, setSelectedModel] = useState<string>("")

  const handleContinue = () => {
    if (selectedModel) {
      onModelSelected(selectedModel)
      // Don't call onClose() here - let the parent handle the navigation
    }
  }

  const selectedModelInfo = AI_MODELS.find(model => model.id === selectedModel)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
            <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-100">
            Choose Your AI Model
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            Select your preferred AI model for enhanced analysis.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Model Selection Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              AI Model
            </label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-full h-11">
                <SelectValue placeholder="Select an AI model..." />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{model.icon}</span>
                      <span className="font-medium">{model.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Model Preview */}
          {selectedModelInfo && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedModelInfo.icon}</span>
                <div>
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300">
                    {selectedModelInfo.name} Selected
                  </h4>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Ready to proceed with enhanced analysis
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            Back
          </Button>
          <Button 
            onClick={handleContinue}
            disabled={!selectedModel}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 order-1 sm:order-2"
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
