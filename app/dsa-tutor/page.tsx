"use client"

import { useEffect, useState, useRef, useLayoutEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AuthLayout } from "@/components/layout/auth-layout"

import questionsData from "./questions.json"
import { languages } from "./languages"
import type { Question, ExecutionResult, ProblemAssistance } from "./types"

// Import components
import { ProblemHeader } from "./components/problem-header"
import { CodeActions } from "./components/code-actions"
import { ChallengeDescription } from "./components/challenge-description"
import { CodeAssistance } from "./components/code-assistance"
import { CodeEditorSection } from "./components/code-editor-section"
import { OutputSection } from "./components/output-section"
import { useProgress } from "@/lib/context/progress-context"

import "./dsa-tutor.css"

// Error boundary for ResizeObserver errors
const errorHandler = (e: ErrorEvent) => {
  if (e.message.includes("ResizeObserver") || e.error?.message?.includes("ResizeObserver")) {
    e.stopImmediatePropagation()
  }
}

interface TestCaseResult {
  passed: boolean
  input: string
  expected_output: string
  stdout: string | null
  stderr: string | null
  compile_output: string | null
  status: {
    id: number
    description: string
  }
  time: string
  memory: string
}

interface SubmissionResult {
  results: TestCaseResult[]
  summary: {
    total: number
    passed: number
    failed: number
  }
}

export default function DSATutorPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0])
  const [code, setCode] = useState("")
  const [output, setOutput] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)
  const [executionStatus, setExecutionStatus] = useState<"idle" | "running" | "success" | "error">("idle")
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null)
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "submitting" | "success" | "partial" | "failed">(
    "idle",
  )
  const [showSubmissionDetails, setShowSubmissionDetails] = useState(false)
  const [editorHasFocus, setEditorHasFocus] = useState(false)
  const editorRef = useRef<any>(null)
  const [windowHeight, setWindowHeight] = useState(0)
  const [windowWidth, setWindowWidth] = useState(0)

  // Custom test case states
  const [useCustomInput, setUseCustomInput] = useState(false)
  const [customInput, setCustomInput] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)

  // Responsive layout state
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

  // Problem assistance state
  const [problemAssistance, setProblemAssistance] = useState<ProblemAssistance>({
    explaining: "",
    solution: "",
    stepByStep: "",
    isLoading: false,
    fromCache: false,
  })

  // Add error handler for ResizeObserver errors
  useEffect(() => {
    window.addEventListener("error", errorHandler)
    return () => {
      window.removeEventListener("error", errorHandler)
    }
  }, [])

  // Get window dimensions for responsive layout
  useLayoutEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth
      const height = window.innerHeight

      setWindowWidth(width)
      setWindowHeight(height)
      setIsMobile(width < 768)
      setIsTablet(width >= 768 && width < 1024)
    }

    updateDimensions()
    window.addEventListener("resize", updateDimensions)
    return () => window.removeEventListener("resize", updateDimensions)
  }, [])

  useEffect(() => {
    // Load questions from the JSON file
    setQuestions(questionsData as Question[])
  }, [])

  useEffect(() => {
    if (questions.length > 0) {
      // Reset editor state when changing questions
      setCode("")
      setEditorHasFocus(false)
      setSubmissionResult(null)
      setSubmissionStatus("idle")
      setShowSubmissionDetails(false)
      setCustomInput("")
      setUseCustomInput(false)

      // Reset problem assistance
      setProblemAssistance({
        explaining: "",
        solution: "",
        stepByStep: "",
        isLoading: false,
        fromCache: false,
      })
    }
  }, [questions, currentQuestionIndex])

  // Function to fetch problem assistance
  const fetchProblemAssistance = async (forceRefresh = false) => {
    if (questions.length === 0) return

    // Set loading state
    setProblemAssistance((prev) => ({
      ...prev,
      isLoading: true,
      error: undefined,
      streamingText: "",
    }))

    try {
      // Create the URL for the SSE endpoint
      const url = forceRefresh
        ? `http://localhost:3005/explain-stream?index=${currentQuestionIndex}&refresh=true&language=${selectedLanguage.name}`
        : `http://localhost:3005/explain-stream?index=${currentQuestionIndex}&language=${selectedLanguage.name}`

      console.log(`Requesting problem assistance with language: ${selectedLanguage.name} (${selectedLanguage.label})`)

      // Create an EventSource for SSE
      const eventSource = new EventSource(url)

      let accumulatedText = ""

      // Handle metadata event
      eventSource.addEventListener("metadata", (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log("Received metadata:", data)

          // Update fromCache status
          setProblemAssistance((prev) => ({
            ...prev,
            fromCache: data.fromCache || false,
          }))
        } catch (error) {
          console.error("Error parsing metadata:", error)
        }
      })

      // Handle data chunks
      eventSource.addEventListener("data", (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.text) {
            // Accumulate the text
            accumulatedText += data.text

            // Update the streaming text in the UI
            setProblemAssistance((prev) => ({
              ...prev,
              streamingText: accumulatedText,
            }))
          }
        } catch (error) {
          console.error("Error parsing data chunk:", error)
        }
      })

      // Handle completion
      eventSource.addEventListener("complete", (event) => {
        try {
          console.log("Stream complete")

          // Parse the accumulated text into sections
          const sections = parseResponseIntoSections(accumulatedText)

          // Update the final state
          setProblemAssistance({
            explaining: sections.explaining || "No explanation available.",
            solution: sections.solution || "No solution strategy available.",
            stepByStep: sections.stepByStep || "No step-by-step approach available.",
            isLoading: false,
            fromCache: false,
            streamingText: "",
          })

          // Close the event source
          eventSource.close()
        } catch (error) {
          console.error("Error handling completion:", error)
        }
      })

      // Handle errors
      eventSource.addEventListener("error", (event) => {
        console.error("SSE Error:", event)

        setProblemAssistance((prev) => ({
          ...prev,
          isLoading: false,
          error: "Error receiving streaming response. Please try again.",
          streamingText: "",
        }))

        // Close the event source
        eventSource.close()
      })

      // Clean up function to close the event source if component unmounts
      return () => {
        eventSource.close()
      }
    } catch (error) {
      console.error("Error setting up SSE:", error)
      setProblemAssistance((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Error setting up streaming connection",
        streamingText: "",
      }))
    }
  }

  // Function to force refresh the explanation
  const refreshExplanation = () => {
    fetchProblemAssistance(true)
  }

  // Helper function to parse the response into sections
  const parseResponseIntoSections = (text: string) => {
    // Initialize with empty sections
    const result = {
      explaining: "",
      solution: "",
      stepByStep: "", // This will remain empty with the new format
    }

    // Extract "SECTION 1: Problem Explanation" section
    const explainMatch = text.match(/SECTION 1: Problem Explanation([\s\S]*?)(?=SECTION 2:|$)/i)
    if (explainMatch && explainMatch[1]) {
      result.explaining = explainMatch[1].trim()
    } else {
      // Fallback to old format if needed
      const oldExplainMatch = text.match(/Explaining the Problem:([\s\S]*?)(?=Solution:|SECTION 2:|$)/i)
      if (oldExplainMatch && oldExplainMatch[1]) {
        result.explaining = oldExplainMatch[1].trim()
      }
    }

    // Extract "SECTION 2: Key DSA Topic and Explanation" section
    const dsaTopicsMatch = text.match(/SECTION 2: Key DSA Topic and Explanation([\s\S]*?)(?=$)/i)
    if (dsaTopicsMatch && dsaTopicsMatch[1]) {
      result.solution = dsaTopicsMatch[1].trim()
    } else {
      // Fallback to old format if needed
      const oldSolutionMatch = text.match(/DSA Topics Involved:([\s\S]*?)(?=Step-by-Step Approach:|SECTION 3:|$)/i)
      if (oldSolutionMatch && oldSolutionMatch[1]) {
        result.solution = oldSolutionMatch[1].trim()
      }
    }

    // The stepByStep section will remain empty with the new format
    // We're keeping it in the result object for backward compatibility

    return result
  }

  // Helper function to normalize output strings for comparison
  const normalizeOutput = (output: string | null): string => {
    if (output === null || output === undefined) return ""

    // Convert to string if it's not already
    let outputStr = String(output)

    // Remove carriage returns (Windows line endings)
    outputStr = outputStr.replace(/\r/g, "")

    // Remove trailing newlines
    outputStr = outputStr.replace(/\n+$/g, "")

    // Trim whitespace from both ends
    outputStr = outputStr.trim()

    // Normalize internal whitespace (replace multiple spaces, tabs, etc. with a single space)
    // Only do this for non-code outputs to preserve indentation in code
    if (!outputStr.includes("{") && !outputStr.includes(";")) {
      outputStr = outputStr.replace(/\s+/g, " ")
    }

    return outputStr
  }

  // Helper function to compare outputs with more flexibility
  const compareOutputs = (actual: string, expected: string | number | boolean): boolean => {
    // Convert expected to string if it's not already
    const expectedStr = expected !== null && expected !== undefined ? String(expected) : ""

    // Try direct string comparison first
    if (actual === expectedStr) return true

    // Try case-insensitive comparison
    if (actual.toLowerCase() === expectedStr.toLowerCase()) return true

    // Try numeric comparison if expected is a number or can be parsed as a number
    if (typeof expected === "number" || !isNaN(Number(expected))) {
      const numActual = Number(actual)
      const numExpected = typeof expected === "number" ? expected : Number(expected)

      if (!isNaN(numActual)) {
        return numActual === numExpected
      }
    }

    // Try boolean comparison
    const boolActual = actual.toLowerCase().trim()
    const boolExpected = expectedStr.toLowerCase().trim()

    if ((boolActual === "true" || boolActual === "false") && (boolExpected === "true" || boolExpected === "false")) {
      return boolActual === boolExpected
    }

    // Try comparing after removing all whitespace
    const noWhitespaceActual = actual.replace(/\s+/g, "")
    const noWhitespaceExpected = expectedStr.replace(/\s+/g, "")

    if (noWhitespaceActual === noWhitespaceExpected) return true

    // If we get here, the outputs don't match
    return false
  }

  const handleLanguageChange = (value: string) => {
    const language = languages.find((lang) => lang.value === value) || languages[0]
    setSelectedLanguage(language)

    // Reset editor state when changing language
    if (!editorHasFocus) {
      setCode(getPlaceholderComment(language))
    } else {
      // If editor has focus, update the code with appropriate template for the selected language
      const currentQuestion = questions[currentQuestionIndex]
      if (currentQuestion) {
        const templateCode = getLanguageTemplate(language, currentQuestion.id)
        if (templateCode && code === "") {
          setCode(templateCode)
        }
      }
    }

    // Update Monaco editor language mode if editor is available
    if (editorRef.current) {
      try {
        const editor = editorRef.current
        const model = editor.getModel()

        if (model && model._monaco) {
          // Set language-specific editor options
          const options = getLanguageEditorOptions(language.name)
          editor.updateOptions(options)

          // Update the model's language
          model._monaco.editor.setModelLanguage(model, language.name)
        }
      } catch (error) {
        console.error("Error updating editor language:", error)
      }
    }
  }

  // Get language-specific editor options
  const getLanguageEditorOptions = (languageName: string) => {
    const baseOptions = {
      minimap: { enabled: window.innerWidth >= 1024 },
      scrollBeyondLastLine: false,
      fontSize: window.innerWidth < 768 ? 12 : 14,
      lineNumbers: window.innerWidth < 768 ? "off" : "on",
      wordWrap: "on",
      automaticLayout: true,
      renderLineHighlight: "all",
    }

    switch (languageName) {
      case "python":
        return {
          ...baseOptions,
          tabSize: 4,
          insertSpaces: true,
        }
      case "java":
        return {
          ...baseOptions,
          tabSize: 4,
          insertSpaces: true,
        }
      case "cpp":
        return {
          ...baseOptions,
          tabSize: 2,
          insertSpaces: true,
        }
      case "javascript":
        return {
          ...baseOptions,
          tabSize: 2,
          insertSpaces: true,
        }
      default:
        return baseOptions
    }
  }

  // Get language-specific template based on question ID
  const getLanguageTemplate = (language: any, questionId: number): string => {
    if (language.name === "python") {
      return getPythonTemplate(questionId)
    } else if (language.name === "java") {
      return getJavaTemplate(questionId)
    } else if (language.name === "cpp") {
      return getCppTemplate(questionId)
    } else if (language.name === "c") {
      return getCTemplate(questionId)
    } else if (language.name === "javascript") {
      return getJavaScriptTemplate(questionId)
    }
    return language.defaultCode
  }

  // Get C template based on question ID
  const getCTemplate = (questionId: number): string => {
    const template = languages.find((lang) => lang.name === "c")?.defaultCode || ""
    return template
  }

  // Get Python template based on question ID
  const getPythonTemplate = (questionId: number): string => {
    // This function is already defined in languages.ts
    // We're just calling it here
    const template = languages.find((lang) => lang.name === "python")?.defaultCode || ""
    return template
  }

  // Get Java template based on question ID
  const getJavaTemplate = (questionId: number): string => {
    const template = languages.find((lang) => lang.name === "java")?.defaultCode || ""
    return template
  }

  // Get C++ template based on question ID
  const getCppTemplate = (questionId: number): string => {
    const template = languages.find((lang) => lang.name === "cpp")?.defaultCode || ""
    return template
  }

  // Get JavaScript template based on question ID
  const getJavaScriptTemplate = (questionId: number): string => {
    const template = languages.find((lang) => lang.name === "javascript")?.defaultCode || ""
    return template
  }

  // Get placeholder comment based on selected language
  const getPlaceholderComment = (language = selectedLanguage) => {
    if (editorHasFocus) return ""

    switch (language.name) {
      case "python":
        return "# Write your function here"
      case "javascript":
        return "// Write your function here"
      case "java":
        return "// Write your function here"
      case "cpp":
        return "// Write your function here"
      default:
        return "// Write your function here"
    }
  }

  const handleRunCode = async () => {
    if (!editorRef.current) return

    // Don't run if only placeholder is present
    if (!editorHasFocus && code === getPlaceholderComment()) {
      setExecutionStatus("error")
      setOutput("Please write your code first before running.")
      return
    }

    // Don't run if custom input is enabled but empty
    if (useCustomInput && !customInput.trim()) {
      setExecutionStatus("error")
      setOutput("Please provide custom input before running.")
      return
    }

    setIsRunning(true)
    setExecutionStatus("running")
    setOutput("")
    setExecutionResult(null)

    // Get the input to use
    const currentQuestion = questions[currentQuestionIndex]
    const inputToUse = useCustomInput ? customInput : currentQuestion.sample_input

    // Show what's being compiled
    const sourceCode = editorRef.current.getValue()
    setOutput(
      `Compiling and running your ${selectedLanguage.label} code with the following input:\n\n${inputToUse}\n\nPlease wait...`,
    )

    try {
      // Call our API route
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language_id: selectedLanguage.id,
          source_code: sourceCode,
          stdin: inputToUse,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log("Execution result:", result) // Log the full result for debugging
      console.log("Execution status:", result.status ? `${result.status.id} - ${result.status.description}` : "Unknown")
      setExecutionResult(result)

      // Check if the execution was successful
      if (result.status && result.status.id === 3) {
        // Status 3 means Accepted
        if (useCustomInput) {
          // For custom input, just show the output
          setExecutionStatus("success")
          setOutput(result.stdout || "")
        } else {
          // For sample input, check against expected output
          const expectedOutput = currentQuestion.sample_output
          const actualOutput = result.stdout || ""

          // Normalize both outputs for comparison
          const normalizedExpected = normalizeOutput(expectedOutput)
          const normalizedActual = normalizeOutput(actualOutput)

          if (compareOutputs(normalizedActual, normalizedExpected)) {
            setExecutionStatus("success")
            setOutput(result.stdout || "")
          } else {
            // Output doesn't match expected output
            setExecutionStatus("error")
            setOutput(
              `Your code compiled and ran successfully, but the output doesn't match the expected output.\n\nExpected Output:\n${expectedOutput}\n\nYour Output:\n${actualOutput}`,
            )
          }
        }
      } else if (result.status && result.status.id === 4) {
        // Status 4 means Wrong Answer
        if (useCustomInput) {
          // For custom input, just show the output
          setExecutionStatus("success")
          setOutput(result.stdout || "")
        } else {
          // For sample input, check against expected output
          const expectedOutput = currentQuestion.sample_output
          const actualOutput = result.stdout || ""

          // Normalize both outputs for comparison
          const normalizedExpected = normalizeOutput(expectedOutput)
          const normalizedActual = normalizeOutput(actualOutput)

          // Do our own comparison to check if the outputs match despite Judge0's status
          if (compareOutputs(normalizedActual, normalizedExpected)) {
            // If our comparison says they match, override Judge0's status
            setExecutionStatus("success")
            setOutput(result.stdout || "")
          } else {
            // Output doesn't match expected output
            setExecutionStatus("error")
            setOutput(
              `Your code compiled and ran successfully, but produced the wrong answer.\n\nExpected Output:\n${expectedOutput}\n\nYour Output:\n${actualOutput}`,
            )
          }
        }
      } else {
        // Handle other execution statuses
        setExecutionStatus("error")

        let errorMessage = ""

        if (result.stderr) {
          errorMessage += `Runtime Error:\n${result.stderr}\n\n`
        }

        if (result.compile_output) {
          errorMessage += `Compilation Error:\n${result.compile_output}\n\n`
        }

        if (result.status && result.status.description) {
          errorMessage += `Status: ${result.status.description}\n\n`
        }

        if (result.message) {
          errorMessage += `Message: ${result.message}\n\n`
        }

        if (!errorMessage) {
          errorMessage = "An error occurred during execution."
        }

        setOutput(errorMessage)
      }
    } catch (error) {
      console.error("Error running code:", error)
      setExecutionStatus("error")
      setOutput(`Failed to execute code: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsRunning(false)
    }
  }

  const { markProblemSolved, markProblemAttempted } = useProgress()

  const handleSubmitCode = async () => {
    if (!editorRef.current) return

    // Don't submit if only placeholder is present
    if (!editorHasFocus && code === getPlaceholderComment()) {
      setExecutionStatus("error")
      setOutput("Please write your code first before submitting.")
      return
    }

    setIsSubmitting(true)
    setSubmissionStatus("submitting")
    setSubmissionResult(null)
    setShowSubmissionDetails(false)

    try {
      const currentQuestion = questions[currentQuestionIndex]
      const sourceCode = editorRef.current.getValue()

      // Mark the problem as attempted
      markProblemAttempted(currentQuestion.id)

      // Prepare test cases with hidden inputs and outputs
      const testCases = [
        {
          input: String(currentQuestion.sample_input),
          expected_output: String(currentQuestion.sample_output),
        },
        ...currentQuestion.hidden_inputs.map((input, index) => ({
          input: String(input),
          expected_output: String(currentQuestion.hidden_outputs[index]),
        })),
      ]

      // Call our API route with multiple test cases
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language_id: selectedLanguage.id,
          source_code: sourceCode,
          multiple_test_cases: testCases,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error: ${response.status} ${errorText}`)
      }

      const result = (await response.json()) as SubmissionResult
      setSubmissionResult(result)

      // Set submission status based on results
      if (result.summary.passed === result.summary.total) {
        setSubmissionStatus("success")
        // Mark the problem as solved
        markProblemSolved(currentQuestion.id)
      } else if (result.summary.passed > 0) {
        setSubmissionStatus("partial")
      } else {
        setSubmissionStatus("failed")
      }

      // Show the first failed test case in the output
      const failedTestCase = result.results.find((r) => !r.passed)
      if (failedTestCase) {
        setExecutionStatus("error")
        setOutput(
          `Test Case Failed:\n\nInput:\n${failedTestCase.input}\n\nExpected Output:\n${
            failedTestCase.expected_output
          }\n\nYour Output:\n${failedTestCase.stdout || ""}`,
        )
      } else {
        setExecutionStatus("success")
        setOutput("All test cases passed successfully!")
      }
    } catch (error) {
      console.error("Error submitting code:", error)
      setSubmissionStatus("failed")
      setOutput(
        "An error occurred while trying to submit your code: " +
          (error instanceof Error ? error.message : String(error)),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleSubmissionDetails = () => {
    setShowSubmissionDetails(!showSubmissionDetails)
  }

  const toggleCustomInput = () => {
    setUseCustomInput(!useCustomInput)
    setShowCustomInput(!useCustomInput)
  }

  const resetCustomInput = () => {
    setCustomInput("")
  }

  const currentQuestion = questions[currentQuestionIndex]

  // Calculate responsive heights based on window dimensions
  const headerHeight = 56 // 14 * 4 = 56px
  const footerHeight = 64 // 16 * 4 = 64px
  const mainHeight = windowHeight - headerHeight - footerHeight - 20 // 20px buffer

  // Adjust layout based on screen size
  let leftPanelWidth = "45%"
  let rightPanelWidth = "55%"

  if (isMobile) {
    leftPanelWidth = "100%"
    rightPanelWidth = "100%"
  } else if (isTablet) {
    leftPanelWidth = "40%"
    rightPanelWidth = "60%"
  }

  // Calculate component heights
  const challengeHeight = isMobile ? Math.min(400, mainHeight * 0.4) : Math.floor(mainHeight / 2)
  const assistanceHeight = isMobile ? Math.min(400, mainHeight * 0.4) : mainHeight - challengeHeight
  const editorHeight = showCustomInput ? Math.floor(mainHeight * 0.5) : Math.floor(mainHeight * 0.7)
  const customInputHeight = Math.floor(mainHeight * 0.2)
  const outputHeight = showCustomInput ? mainHeight - editorHeight - customInputHeight : mainHeight - editorHeight

  // Set placeholder comment when component mounts
  useEffect(() => {
    if (!editorHasFocus) {
      setCode(getPlaceholderComment())
    }
  }, [selectedLanguage])

  return (
    <AuthLayout>
      <div className="flex flex-col h-[calc(100vh-8.5rem)] bg-background">
        {/* DSA Tutor Specific Header */}
        <div className="border-b bg-background z-10 h-14">
          <div className="flex h-full items-center px-4">
            {/* Problem Header with Language Selection */}
            <ProblemHeader
              questions={questions}
              currentQuestionIndex={currentQuestionIndex}
              setCurrentQuestionIndex={setCurrentQuestionIndex}
              currentQuestion={currentQuestion}
              isMobile={isMobile}
              selectedLanguage={selectedLanguage}
              handleLanguageChange={handleLanguageChange}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden dsa-layout">
          {questions.length > 0 && currentQuestion ? (
            <>
              {/* Left Panel - Split into Challenge and Code Assistance */}
              <div className="w-[45%] border-r flex flex-col dsa-left-panel">
                {/* Challenge Description - Top Half */}
                <ChallengeDescription
                  currentQuestion={currentQuestion}
                  currentQuestionIndex={currentQuestionIndex}
                  challengeHeight={challengeHeight}
                />

                {/* Code Assistance - Bottom Half */}
                <CodeAssistance
                  assistanceHeight={assistanceHeight}
                  problemAssistance={problemAssistance}
                  fetchProblemAssistance={fetchProblemAssistance}
                  refreshExplanation={refreshExplanation}
                  currentQuestionIndex={currentQuestionIndex}
                  selectedLanguage={selectedLanguage}
                  setCode={setCode}
                  code={code} // Pass the current code
                  executionStatus={executionStatus} // Pass the execution status
                />
              </div>

              {/* Right Panel - Code Editor and Output */}
              <div className="flex-1 flex flex-col dsa-right-panel">
                <div className="border-b px-4 py-2 flex items-center justify-between h-10">
                  <div className="flex items-center gap-2">
                    <CodeActions
                      selectedLanguage={selectedLanguage}
                      handleLanguageChange={handleLanguageChange}
                      handleRunCode={handleRunCode}
                      isRunning={isRunning}
                      handleSubmitCode={handleSubmitCode}
                      isSubmitting={isSubmitting}
                      isMobile={isMobile}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center space-x-2">
                      <Switch id="custom-input" checked={useCustomInput} onCheckedChange={toggleCustomInput} />
                      <Label htmlFor="custom-input">Custom Input</Label>
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  {/* Code Editor */}
                  <CodeEditorSection
                    editorHeight={editorHeight}
                    customInputHeight={customInputHeight}
                    showCustomInput={showCustomInput}
                    selectedLanguage={selectedLanguage}
                    code={code}
                    editorHasFocus={editorHasFocus}
                    setEditorHasFocus={setEditorHasFocus}
                    setCode={setCode}
                    editorRef={editorRef}
                    customInput={customInput}
                    setCustomInput={setCustomInput}
                    resetCustomInput={resetCustomInput}
                  />

                  {/* Output Panel */}
                  <OutputSection
                    outputHeight={outputHeight}
                    submissionStatus={submissionStatus}
                    executionStatus={executionStatus}
                    output={output}
                    submissionResult={submissionResult}
                    showSubmissionDetails={showSubmissionDetails}
                    toggleSubmissionDetails={toggleSubmissionDetails}
                    executionResult={executionResult}
                    useCustomInput={useCustomInput}
                    customInput={customInput}
                    currentQuestion={currentQuestion}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center w-full">
              <Card className="w-[400px]">
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-2">Loading Questions</h3>
                  <p className="text-muted-foreground mb-4">Please wait while we load the DSA problems...</p>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[300px]" />
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AuthLayout>
  )
}
