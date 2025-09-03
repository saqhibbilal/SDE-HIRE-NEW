"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Eye, CheckCircle, XCircle, Clock, Target, TrendingUp } from "lucide-react"

interface InterviewDetailsModalProps {
  sessionId: string
  techStack: string
  mcqMarks: number
  completedAt: string
  evaluationData?: any
  children: React.ReactNode
}

export function InterviewDetailsModal({ 
  sessionId, 
  techStack, 
  mcqMarks, 
  completedAt, 
  evaluationData,
  children 
}: InterviewDetailsModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Debug: Log evaluation data structure
  if (evaluationData && isOpen) {
    console.log('🔍 Interview Details Modal - Evaluation Data Structure:', {
      sessionId,
      hasMcqAnalysis: !!evaluationData.mcqAnalysis,
      hasMcqEvaluation: !!evaluationData.mcqEvaluation,
      hasStrengths: !!evaluationData.strengths,
      hasWeaknesses: !!evaluationData.weaknesses,
      hasRecommendations: !!evaluationData.recommendations,
      hasNextSteps: !!evaluationData.nextSteps,
      hasDetailedFeedback: !!evaluationData.detailedFeedback,
      evaluationDataKeys: Object.keys(evaluationData || {}),
      fullEvaluationData: evaluationData
    });
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return "default"
    if (score >= 60) return "secondary"
    return "destructive"
  }

  // Helper function to safely render text content
  const safeRenderText = (content: any): string => {
    if (typeof content === 'string') return content
    if (typeof content === 'number') return content.toString()
    if (Array.isArray(content)) return content.join(', ')
    if (content && typeof content === 'object') {
      console.warn('⚠️ Attempting to render object as text:', content)
      return JSON.stringify(content)
    }
    return ''
  }

  // Helper function to safely get array data
  const safeGetArray = (data: any, ...paths: string[]): any[] => {
    for (const path of paths) {
      const value = data?.[path]
      if (Array.isArray(value)) return value
    }
    return []
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Interview Report Details
          </DialogTitle>
          <DialogDescription>
            Detailed analysis of your technical interview performance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Interview Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Interview Overview</span>
                <Badge variant={getScoreBadgeVariant(mcqMarks)} className="text-lg px-3 py-1">
                  {mcqMarks}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tech Stack</p>
                  <p className="text-lg font-semibold">{techStack}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-lg font-semibold">{formatDate(completedAt)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Session ID</p>
                  <p className="text-sm font-mono text-muted-foreground">{sessionId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={mcqMarks >= 60 ? "default" : "destructive"}>
                    {mcqMarks >= 60 ? "PASS" : "FAIL"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Analysis */}
          {evaluationData && (() => {
            try {
              return (
                <>
              {/* MCQ Analysis */}
              {(() => {
                const mcqAnalysis = safeGetArray(evaluationData, 'mcqAnalysis', 'mcqEvaluation.mcqAnalysis')
                return mcqAnalysis.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        MCQ Analysis
                      </CardTitle>
                      <CardDescription>
                        Detailed breakdown of your multiple choice questions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {mcqAnalysis.map((question: any, index: number) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium">Question {index + 1}</h4>
                              {question.isCorrect ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600" />
                              )}
                            </div>
                            <p className="text-sm mb-3">{safeRenderText(question.questionText)}</p>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Your Answer:</p>
                                <p className="font-medium">{safeRenderText(question.userAnswer)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Correct Answer:</p>
                                <p className="font-medium">{safeRenderText(question.correctAnswer)}</p>
                              </div>
                            </div>

                            {Array.isArray(question.options) && question.options.length > 0 && (
                              <div className="mt-3">
                                <p className="text-sm text-muted-foreground mb-2">Options:</p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {question.options.map((option: any, optIndex: number) => (
                                    <div key={optIndex} className="flex items-center gap-2">
                                      <span className="font-mono">
                                        {String.fromCharCode(65 + optIndex)}:
                                      </span>
                                      <span>{safeRenderText(option)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })()}

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(() => {
                  const strengths = safeGetArray(evaluationData, 'strengths')
                  return strengths.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-5 w-5" />
                          Strengths
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {strengths.map((strength: any, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{safeRenderText(strength)}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )
                })()}

                {(() => {
                  const weaknesses = safeGetArray(evaluationData, 'weaknesses')
                  return weaknesses.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-600">
                          <XCircle className="h-5 w-5" />
                          Areas for Improvement
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {weaknesses.map((weakness: any, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{safeRenderText(weakness)}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )
                })()}
              </div>

              {/* Recommendations */}
              {(() => {
                const recommendations = safeGetArray(evaluationData, 'recommendations', 'detailedFeedback.recommendations')
                return recommendations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {recommendations.map((rec: any, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <div className="h-2 w-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                            <span className="text-sm">{safeRenderText(rec)}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )
              })()}

              {/* Next Steps */}
              {(() => {
                const nextSteps = safeGetArray(evaluationData, 'nextSteps', 'detailedFeedback.nextSteps')
                return nextSteps.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Next Steps
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {nextSteps.map((step: any, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                            <span className="text-sm">{safeRenderText(step)}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )
              })()}

              {/* Pro User Specific Metrics */}
              {(evaluationData.technicalAccuracy || evaluationData.practicalKnowledge || evaluationData.communicationClarity) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Detailed Assessment
                    </CardTitle>
                    <CardDescription>
                      AI-powered evaluation metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {evaluationData.technicalAccuracy && (
                        <div className="text-center">
                          <p className="text-sm font-medium text-muted-foreground">Technical Accuracy</p>
                          <div className="text-2xl font-bold text-blue-600">{evaluationData.technicalAccuracy}/10</div>
                        </div>
                      )}
                      {evaluationData.practicalKnowledge && (
                        <div className="text-center">
                          <p className="text-sm font-medium text-muted-foreground">Practical Knowledge</p>
                          <div className="text-2xl font-bold text-green-600">{evaluationData.practicalKnowledge}/10</div>
                        </div>
                      )}
                      {evaluationData.communicationClarity && (
                        <div className="text-center">
                          <p className="text-sm font-medium text-muted-foreground">Communication</p>
                          <div className="text-2xl font-bold text-purple-600">{evaluationData.communicationClarity}/10</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
                </>
              )
            } catch (error) {
              console.error('❌ Error rendering evaluation data:', error)
              return (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">Error displaying evaluation data. Please try again.</p>
                  </CardContent>
                </Card>
              )
            }
          })()}

          {/* No Evaluation Data */}
          {!evaluationData && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No detailed evaluation data available for this interview.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
