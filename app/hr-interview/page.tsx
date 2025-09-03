"use client"

import { useState, useCallback, useEffect } from "react"
import { AuthLayout } from "@/components/layout/auth-layout"
import { HRResumeUpload } from "@/components/hr-resume-upload"
import { HRModeSelection } from "@/components/hr-mode-selection"
import { HRInterviewPanel } from "@/components/hr-interview-panel"
import { HRPresenceSidebar } from "@/components/hr-presence-sidebar"
import { HRInterviewReport } from "@/components/hr-interview-report" // New import
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import "./hr-interview.css"

type HRInterviewStage = "upload" | "analyzing" | "questions-ready" | "mode-selection" | "interview" | "report"
type InterviewMode = "pro" | "video"

interface HRResumeData {
  summary: string
  skills: string[]
  experience: string[]
}

interface HRResumeAnalysis {
  experienceLevel: string
  hrProfile: {
    topSkills: string[]
    primaryStrengths: string[]
    hasLeadershipExperience: boolean
    hasStrongCommunication: boolean
  }
  skills: Array<{
    name: string
    category: string
    score: number
  }>
  projectTypes: string[]
  industryExperience: string[]
  leadershipExperience: any
  communicationEvidence: any
  resultsAndImpact: string[]
  recommendedQuestionFocus: any
}

interface HRQuestion {
  id: number
  question_type: string
  question_text: string
  difficulty_level: string
  topic: string
  focus_area: string
}

// New interfaces for Phase 4: Response Tracking
interface InterviewResponse {
  questionId: number
  questionText: string
  questionType: string
  questionTopic: string
  userResponse: string
  timestamp: string
  responseLength: number
  hasResponse: boolean
}

interface ResponseStatus {
  isSaving: boolean
  lastSaved: string | null
  saveError: string | null
}

export default function HRInterviewSimulatorPage() {
  const [hrInterviewStage, setHRInterviewStage] = useState<HRInterviewStage>("upload")
  const [hrResumeData, setHRResumeData] = useState<HRResumeData | null>(null)
  const [hrResumeAnalysis, setHRResumeAnalysis] = useState<HRResumeAnalysis | null>(null)
  const [hrInterviewQuestions, setHRInterviewQuestions] = useState<HRQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [interviewMode, setInterviewMode] = useState<InterviewMode>("pro")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // New state for Phase 4: Response Tracking
  const [interviewResponses, setInterviewResponses] = useState<InterviewResponse[]>([])
  const [responseStatus, setResponseStatus] = useState<ResponseStatus>({
    isSaving: false,
    lastSaved: null,
    saveError: null
  })

  const handleHRResumeUpload = async (file: File) => {
    try {
      setIsLoading(true)
      setError(null)
      setHRInterviewStage("analyzing")

      // Read the file content
      const text = await file.text()
      
      // Step 1: Analyze resume
      const analysisResponse = await fetch('/api/hr-resume-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resumeText: text })
      })

      if (!analysisResponse.ok) {
        throw new Error('Failed to analyze resume')
      }

      const analysis = await analysisResponse.json()
      setHRResumeAnalysis(analysis)

      // Step 2: Generate questions
      const questionsResponse = await fetch('/api/hr-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resumeAnalysis: analysis })
      })

      if (!questionsResponse.ok) {
        throw new Error('Failed to generate questions')
      }

      const questions = await questionsResponse.json()
      setHRInterviewQuestions(questions)

      // Step 3: Move to questions-ready stage
      setHRInterviewStage("questions-ready")
      
    } catch (err) {
      console.error('Error processing resume:', err)
      setError(err instanceof Error ? err.message : 'Failed to process resume')
      setHRInterviewStage("upload")
    } finally {
      setIsLoading(false)
    }
  }

  const handleModeSelection = (mode: InterviewMode) => {
    // Clear setup completion flag when starting new interview
    localStorage.removeItem('hr_interview_setup_completed');
    console.log('[Mode Selection] Cleared setup completion flag for new interview');
    
    setInterviewMode(mode)
    setHRInterviewStage("interview")
  }

  const handleHRNextQuestion = () => {
    if (currentQuestionIndex < hrInterviewQuestions.length - 1) {
      // Save current response before moving to next question
      const currentResponse = interviewResponses[currentQuestionIndex];
      if (currentResponse && currentResponse.hasResponse) {
        console.log(`[Question Navigation] Saving response for Q${currentQuestionIndex + 1} before moving to next`);
        localStorage.setItem('hr_interview_responses', JSON.stringify(interviewResponses));
      }
      
      const nextIndex = currentQuestionIndex + 1;
      console.log(`[Question Navigation] Moving from Q${currentQuestionIndex + 1} to Q${nextIndex + 1}`);
      
      setCurrentQuestionIndex(nextIndex)
      
      // Load any existing response for the next question
      if (nextIndex < interviewResponses.length) {
        const nextResponse = interviewResponses[nextIndex];
        console.log(`[Question Navigation] Moving to Q${nextIndex + 1}, has existing response:`, nextResponse?.hasResponse);
      }
    } else {
      // Final question - ensure all responses are saved
      console.log('[Question Navigation] Final question reached, preparing for report');
      
      // Show summary of all responses
      const answeredCount = interviewResponses.filter(r => r.hasResponse).length;
      const totalCount = interviewResponses.length;
      console.log(`[Report Generation] Summary: ${answeredCount}/${totalCount} questions answered`);
      
      // Save to localStorage
      localStorage.setItem('hr_interview_responses', JSON.stringify(interviewResponses));
      
      // Generate final report
      setHRInterviewStage("report")
    }
  }

  const handleStartNewInterview = () => {
    // Final save before resetting
    try {
      if (interviewResponses.length > 0) {
        localStorage.setItem('hr_interview_responses', JSON.stringify(interviewResponses));
        console.log('[Reset] Final save completed before starting new interview');
      }
    } catch (e) {
      console.error('[Reset] Final save failed:', e);
    }
    
    // Clear setup completion flag for new interview
    localStorage.removeItem('hr_interview_setup_completed');
    console.log('[Reset] Cleared setup completion flag for new interview');
    
    setHRResumeData(null)
    setHRResumeAnalysis(null)
    setHRInterviewQuestions([])
    setCurrentQuestionIndex(0)
    setInterviewMode("pro")
    setHRInterviewStage("upload")
    setError(null)
    // Reset Phase 4 response tracking
    setInterviewResponses([])
    setResponseStatus({
      isSaving: false,
      lastSaved: null,
      saveError: null
    })
  }

  // Phase 4: Response Tracking Functions
  const initializeResponses = useCallback(() => {
    if (hrInterviewQuestions.length > 0) {
      const initialResponses = hrInterviewQuestions.map((question, index) => ({
        questionId: index,
        questionText: question.question_text,
        questionType: question.question_type,
        questionTopic: question.topic,
        userResponse: "",
        timestamp: "",
        responseLength: 0,
        hasResponse: false
      }))
      console.log('[Response Tracking] Initializing responses:', initialResponses.map((r, i) => `Q${i+1}: "${r.questionText.substring(0, 30)}..."`))
      setInterviewResponses(initialResponses)
      
      // Also try to load any existing responses from localStorage
      try {
        const storedResponses = localStorage.getItem('hr_interview_responses');
        if (storedResponses) {
          const parsed = JSON.parse(storedResponses);
          if (Array.isArray(parsed) && parsed.length === hrInterviewQuestions.length) {
            console.log('[Response Tracking] Loading stored responses from localStorage:', parsed.length);
            setInterviewResponses(parsed);
          }
        }
      } catch (e) {
        console.error('[Response Tracking] Failed to load from localStorage:', e);
      }
    }
  }, [hrInterviewQuestions])

  const updateResponse = useCallback(async (questionIndex: number, response: string) => {
    if (questionIndex >= 0 && questionIndex < interviewResponses.length) {
      setResponseStatus(prev => ({ ...prev, isSaving: true, saveError: null }))
      
      try {
        // Use map() to create new array ensuring React state updates properly
        const updatedResponses = interviewResponses.map((existingResponse, index) => {
          if (index === questionIndex) {
            return {
          ...existingResponse,
          userResponse: response,
          timestamp: new Date().toISOString(),
          responseLength: response.length,
          hasResponse: response.trim().length > 0
        }
          }
          return existingResponse
        })
        
        setInterviewResponses(updatedResponses)
        
        // Auto-save to localStorage
        localStorage.setItem('hr_interview_responses', JSON.stringify(updatedResponses))
        
        setResponseStatus(prev => ({
          ...prev,
          isSaving: false,
          lastSaved: new Date().toLocaleTimeString()
        }))
        
        console.log(`[Response Tracking] Updated Q${questionIndex + 1}: ${response.length} chars`)
        console.log(`[Response Tracking] All responses:`, updatedResponses.map((r, i) => ({
          q: i + 1,
          hasResponse: r.hasResponse,
          responseLength: r.responseLength,
          userResponse: r.userResponse?.substring(0, 50) + '...'
        })))
      } catch (error) {
        setResponseStatus(prev => ({
          ...prev,
          isSaving: false,
          saveError: 'Failed to save response'
        }))
        console.error('Error saving response:', error)
      }
    }
  }, [interviewResponses])

  const getCurrentResponse = useCallback((questionIndex: number) => {
    return interviewResponses[questionIndex] || null
  }, [interviewResponses])

  // Initialize responses when questions are ready
  useEffect(() => {
    if (hrInterviewStage === "questions-ready" && hrInterviewQuestions.length > 0) {
      initializeResponses()
      console.log('[Response Tracking] Initialized responses for', hrInterviewQuestions.length, 'questions')
    }
  }, [hrInterviewStage, hrInterviewQuestions, initializeResponses])

  // Recover responses from localStorage only once when starting interview
  useEffect(() => {
    if (hrInterviewStage === "interview" && hrInterviewQuestions.length > 0 && interviewResponses.length === 0) {
      try {
        const storedResponses = localStorage.getItem('hr_interview_responses');
        if (storedResponses) {
          const parsed = JSON.parse(storedResponses);
          if (Array.isArray(parsed) && parsed.length === hrInterviewQuestions.length) {
            console.log('[Response Recovery] Initial recovery from localStorage:', parsed.length);
            setInterviewResponses(parsed);
          }
        }
      } catch (e) {
        console.error('[Response Recovery] Failed to recover from localStorage:', e);
      }
    }
  }, [hrInterviewStage, hrInterviewQuestions, interviewResponses.length])

  // Manual refresh function for responses
  const refreshResponsesFromStorage = useCallback(() => {
    try {
      const storedResponses = localStorage.getItem('hr_interview_responses');
      if (storedResponses) {
        const parsed = JSON.parse(storedResponses);
        if (Array.isArray(parsed) && parsed.length === hrInterviewQuestions.length) {
          console.log('[Manual Refresh] Refreshing responses from localStorage:', parsed.length);
          setInterviewResponses(parsed);
          return true;
        }
      }
    } catch (e) {
      console.error('[Manual Refresh] Failed to refresh from localStorage:', e);
    }
    return false;
  }, [hrInterviewQuestions.length])

  // Debug: Log only important changes
  useEffect(() => {
    if (hrInterviewStage === "report") {
      console.log('[Report Stage] Final responses state:', {
        totalResponses: interviewResponses.length,
        responsesWithContent: interviewResponses.filter(r => r.hasResponse).length,
        allResponses: interviewResponses.map((r, i) => ({
          q: i + 1,
          hasResponse: r.hasResponse,
          responseLength: r.responseLength,
          userResponse: r.userResponse?.substring(0, 50) + '...'
        }))
      })
    }
  }, [hrInterviewStage, interviewResponses])

  // Monitor currentQuestionIndex changes
  useEffect(() => {
    console.log('[Main Page] currentQuestionIndex changed to:', currentQuestionIndex);
  }, [currentQuestionIndex]);

  return (
    <AuthLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col">
        <main className="flex-1 p-4 container mx-auto max-w-7xl">
          {hrInterviewStage === "upload" && (
            <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-4">
              <div className="w-full max-w-md">
                {error && (
                  <Card className="mb-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 animate-fade-in">
                    <CardContent className="pt-6">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                            Something went wrong
                          </h3>
                          <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                            {error}
                          </p>
                          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                            <Button
                              onClick={() => setError(null)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-950"
                            >
                              Dismiss
                            </Button>
                            <Button
                              onClick={() => window.location.reload()}
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-950"
                            >
                              Retry
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                <div className="animate-fade-in">
              <HRResumeUpload onFileUpload={handleHRResumeUpload} />
                </div>
              </div>
            </div>
          )}

          {hrInterviewStage === "analyzing" && (
            <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-4">
              <Card className="w-full max-w-lg animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-center text-xl">Analyzing Your Resume</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  {/* Enhanced Loading Animation */}
                  <div className="relative mb-6">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  
                  {/* Progress Steps */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" aria-label="Step completed"></div>
                      <span className="text-sm text-green-600 dark:text-green-400">Resume uploaded successfully</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" aria-label="Step in progress"></div>
                      <span className="text-sm text-blue-600 dark:text-blue-400">Analyzing skills and experience</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-gray-300 rounded-full" aria-label="Step pending"></div>
                      <span className="text-sm text-gray-500">Generating personalized questions</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    We're carefully analyzing your resume to understand your background, 
                    skills, and experience. This helps us create relevant interview questions 
                    tailored specifically for you.
                  </p>
                  
                  {/* Estimated Time */}
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      ⏱️ This usually takes 10-15 seconds
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {hrInterviewStage === "questions-ready" && (
            <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-4">
              <Card className="w-full max-w-lg animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-center text-xl text-green-600 dark:text-green-400">
                    🎉 Questions Generated Successfully!
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  {/* Success Animation */}
                  <div className="mb-6">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                      <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Analysis Summary */}
                  <div className="space-y-4 mb-6">
                    <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-green-700 dark:text-green-300 font-medium mb-2">
                        ✓ Resume Analysis Complete
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="text-left">
                          <span className="font-medium text-gray-700 dark:text-gray-300">Experience Level:</span>
                          <span className="ml-2 text-gray-600 dark:text-gray-400 capitalize">
                            {hrResumeAnalysis?.experienceLevel || 'Mid-level'}
                          </span>
                        </div>
                        <div className="text-left">
                          <span className="font-medium text-gray-700 dark:text-gray-300">Questions Generated:</span>
                          <span className="ml-2 text-gray-600 dark:text-gray-400">
                            {hrInterviewQuestions.length} personalized
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Primary Strengths */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="font-medium text-blue-700 dark:text-blue-300 mb-2">Primary Strengths Identified:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {hrResumeAnalysis?.hrProfile?.primaryStrengths?.map((strength, index) => (
                          <span 
                            key={index}
                            className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium animate-fade-in"
                            style={{ animationDelay: `${index * 100}ms` }}
                            role="listitem"
                            aria-label={`Strength: ${strength}`}
                          >
                            {strength}
                          </span>
                        )) || (
                          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                            Technical Skills
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <Button 
                    onClick={() => setHRInterviewStage("mode-selection")}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 text-lg transition-all duration-200 transform hover:scale-105"
                  >
                    🚀 Choose Interview Mode
                  </Button>
                  
                  {/* Additional Info */}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                    Your personalized questions are ready and tailored to your background
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {hrInterviewStage === "mode-selection" && <HRModeSelection onModeSelected={handleModeSelection} />}

          {hrInterviewStage === "interview" && hrInterviewQuestions.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-200px)] hr-layout">
              <div className="lg:col-span-1 hr-sidebar">
                <HRPresenceSidebar
                  interviewMode={interviewMode}
                  currentQuestionIndex={currentQuestionIndex}
                  totalQuestions={hrInterviewQuestions.length}
                />
              </div>
              <div className="lg:col-span-2 hr-main-panel">
                <HRInterviewPanel
                  key={`question-${currentQuestionIndex}`}
                  question={hrInterviewQuestions[currentQuestionIndex]?.question_text || ""}
                  onNextQuestion={handleHRNextQuestion}
                  isLastQuestion={currentQuestionIndex === hrInterviewQuestions.length - 1}
                  interviewMode={interviewMode}
                  // Phase 4: Response Tracking Props
                  currentQuestionIndex={currentQuestionIndex}
                  onUpdateResponse={updateResponse}
                  getCurrentResponse={getCurrentResponse}
                  responseStatus={responseStatus}
                  // Phase 5: Progress tracking
                  hrInterviewQuestions={hrInterviewQuestions}
                />
              </div>
            </div>
          )}

          {hrInterviewStage === "report" && (() => {
            // Phase 5: Final save and debug - Log data being passed to report
            // Ensure all responses are saved before generating report
            try {
              localStorage.setItem('hr_interview_responses', JSON.stringify(interviewResponses));
              console.log('[Report Stage] Final save completed');
            } catch (e) {
              console.error('[Report Stage] Final save failed:', e);
            }
            
            console.log('[Report Stage] Data being passed:', {
              stage: hrInterviewStage,
              responsesLength: interviewResponses.length,
              responses: interviewResponses.map((r, i) => ({
                q: i + 1,
                hasResponse: r.hasResponse,
                responseLength: r.responseLength,
                userResponse: r.userResponse?.substring(0, 30) + '...'
              }))
            })
            
            return (
            <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
                <HRInterviewReport 
                  onStartNewInterview={handleStartNewInterview}
                  resumeAnalysis={hrResumeAnalysis}
                  interviewResponses={interviewResponses}
                  onRefreshResponses={refreshResponsesFromStorage}
                />
            </div>
            )
          })()}
        </main>
      </div>
    </AuthLayout>
  )
}
