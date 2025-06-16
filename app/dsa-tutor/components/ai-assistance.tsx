"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FileCode, Code, Bug, RefreshCw, Copy, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AIAssistanceTabProps {
  currentQuestionIndex: number
  selectedLanguage: any
  setCode: (code: string) => void
  code?: string // Optional for backward compatibility
  executionStatus?: "idle" | "running" | "success" | "error" // Optional
}

export function AIAssistanceTab({
  currentQuestionIndex,
  selectedLanguage,
  setCode,
  code = "", // Default to empty string
  executionStatus = "idle", // Default to idle
}: AIAssistanceTabProps) {
  const [responseContent, setResponseContent] = useState("")
  const [streamingContent, setStreamingContent] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [activeButton, setActiveButton] = useState<"generation" | "explanation" | "bugfix" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)
  const [serverStatus, setServerStatus] = useState<"unknown" | "online" | "offline">("unknown")
  const [explanationServerStatus, setExplanationServerStatus] = useState<"unknown" | "online" | "offline">("unknown")
  const [correctionServerStatus, setCorrectionServerStatus] = useState<"unknown" | "online" | "offline">("unknown")

  // Cleanup function for EventSource
  useEffect(() => {
    const eventSource: EventSource | null = null

    // Return cleanup function
    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [])

  // Check server status on component mount
  useEffect(() => {
    checkServerStatus()
    checkExplanationServerStatus()
    checkCorrectionServerStatus()
  }, [])

  // Function to check if the code generation server is running
  const checkServerStatus = async () => {
    try {
      const response = await fetch("http://localhost:3004/health", {
        method: "GET",
        headers: { Accept: "application/json" },
        // Add a timeout to the fetch request
        signal: AbortSignal.timeout(3000),
      })

      if (response.ok) {
        setServerStatus("online")
        console.log("Code generation server is online")
      } else {
        setServerStatus("offline")
        console.error("Code generation server returned an error")
      }
    } catch (err) {
      setServerStatus("offline")
      console.error("Failed to connect to code generation server:", err)
    }
  }

  // Function to check if the explanation server is running
  const checkExplanationServerStatus = async () => {
    try {
      const response = await fetch("http://localhost:3006/health", {
        method: "GET",
        headers: { Accept: "application/json" },
        // Add a timeout to the fetch request
        signal: AbortSignal.timeout(3000),
      })

      if (response.ok) {
        setExplanationServerStatus("online")
        console.log("Code explanation server is online")
      } else {
        setExplanationServerStatus("offline")
        console.error("Code explanation server returned an error")
      }
    } catch (err) {
      setExplanationServerStatus("offline")
      console.error("Failed to connect to code explanation server:", err)
    }
  }

  // Function to check if the correction server is running
  const checkCorrectionServerStatus = async () => {
    try {
      const response = await fetch("http://localhost:3007/health", {
        method: "GET",
        headers: { Accept: "application/json" },
        // Add a timeout to the fetch request
        signal: AbortSignal.timeout(3000),
      })

      if (response.ok) {
        setCorrectionServerStatus("online")
        console.log("Code correction server is online")
      } else {
        setCorrectionServerStatus("offline")
        console.error("Code correction server returned an error")
      }
    } catch (err) {
      setCorrectionServerStatus("offline")
      console.error("Failed to connect to code correction server:", err)
    }
  }

  // Function to handle code generation
  const handleCodeGeneration = async () => {
    // If server is offline, try to check status first
    if (serverStatus === "offline") {
      await checkServerStatus()

      // If still offline, show error
      if (serverStatus === "offline") {
        setError("Code generation server is offline. Please start the server and try again.")
        return
      }
    }

    setIsLoading(true)
    setActiveButton("generation")
    setError(null)
    setStreamingContent("")
    setResponseContent("")
    setFromCache(false)

    try {
      // Create the URL for the SSE endpoint
      console.log("Selected language object:", selectedLanguage)
      const url = `http://localhost:3004/generate-stream?index=${currentQuestionIndex}&language=${selectedLanguage.name}`
      console.log(`Requesting code generation from: ${url}`)

      // Create an EventSource for SSE
      const eventSource = new EventSource(url)

      // Add a timeout to handle connection issues
      const connectionTimeout = setTimeout(() => {
        if (eventSource.readyState !== EventSource.OPEN) {
          console.error("Connection timeout - could not connect to code generation server")
          setError(
            "Connection timeout - could not connect to code generation server. Please check if the server is running.",
          )
          setIsLoading(false)
          eventSource.close()
        }
      }, 5000) // 5 second timeout

      let accumulatedCode = ""

      // Handle metadata event
      eventSource.addEventListener("metadata", (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log("Received metadata:", data)

          // Update fromCache status
          setFromCache(data.fromCache || false)
        } catch (error) {
          console.error("Error parsing metadata:", error)
        }
      })

      // Handle data chunks
      eventSource.addEventListener("data", (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.code) {
            // Accumulate the code
            accumulatedCode += data.code

            // Update the streaming content in the UI
            setStreamingContent(accumulatedCode)
          }
        } catch (error) {
          console.error("Error parsing data chunk:", error)
        }
      })

      // Handle completion
      eventSource.addEventListener("complete", (event) => {
        try {
          console.log("Stream complete")
          clearTimeout(connectionTimeout) // Clear the timeout

          // Update the final state
          setResponseContent(accumulatedCode)
          setStreamingContent("")
          setIsLoading(false)

          // Close the event source
          eventSource.close()
        } catch (error) {
          console.error("Error handling completion:", error)
        }
      })

      // Handle errors
      eventSource.addEventListener("error", (event) => {
        // Create a more descriptive error message
        let errorMessage = "Error connecting to code generation server. "

        if (event.target && (event.target as EventSource).readyState === EventSource.CLOSED) {
          errorMessage += "Connection was closed. "
        } else if (event.target && (event.target as EventSource).readyState === EventSource.CONNECTING) {
          errorMessage += "Attempting to reconnect. "
        }

        errorMessage += "Please check if the server is running and try again."

        console.error("SSE Error:", errorMessage)
        clearTimeout(connectionTimeout) // Clear the timeout

        setError(errorMessage)
        setIsLoading(false)
        setStreamingContent("")
        setServerStatus("offline")

        // Close the event source
        eventSource.close()
      })
    } catch (err) {
      console.error("Error setting up SSE:", err)
      setError(err instanceof Error ? err.message : "Error setting up streaming connection")
      setIsLoading(false)
      setStreamingContent("")
      setServerStatus("offline")
    }
  }

  // Function to handle code explanation
  const handleCodeExplanation = async () => {
    // Check if code has been executed successfully
    if (executionStatus !== "success") {
      setError("Please complete and run your code successfully before requesting an explanation.")
      return
    }

    // If code is empty or just placeholder, show error
    if (!code || code.trim() === "" || code.includes("Write your function here")) {
      setError("No code to explain. Please write or generate some code first.")
      return
    }

    // If server is offline, try to check status first
    if (explanationServerStatus === "offline") {
      await checkExplanationServerStatus()

      // If still offline, show error
      if (explanationServerStatus === "offline") {
        setError("Code explanation server is offline. Please start the server and try again.")
        return
      }
    }

    setIsLoading(true)
    setActiveButton("explanation")
    setError(null)
    setStreamingContent("")
    setResponseContent("")
    setFromCache(false)

    try {
      // Create the URL for the explanation endpoint
      const url = `http://localhost:3006/explain-stream`
      console.log(`Requesting code explanation from: ${url}`)

      // Make a POST request to the explanation server
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code,
          language: selectedLanguage.name,
        }),
      })

      if (!response.body) {
        throw new Error("Response body is null")
      }

      // Get a reader from the response body
      const reader = response.body.getReader()
      let accumulatedExplanation = ""
      const decoder = new TextDecoder()
      let buffer = ""

      // Process the stream
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // Decode the chunk and add it to the buffer
        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE events in the buffer
        const events = buffer.split("\n\n")
        buffer = events.pop() || "" // Keep the last incomplete event in the buffer

        for (const event of events) {
          const lines = event.split("\n")
          const eventType = lines[0].startsWith("event: ") ? lines[0].slice(7) : ""
          const data = lines[1]?.startsWith("data: ") ? lines[1].slice(6) : ""

          if (eventType && data) {
            try {
              const parsedData = JSON.parse(data)

              if (eventType === "metadata") {
                setFromCache(parsedData.fromCache || false)
              } else if (eventType === "data" && parsedData.explanation) {
                accumulatedExplanation += parsedData.explanation
                setStreamingContent(accumulatedExplanation)
              } else if (eventType === "complete") {
                // Finalize the response
                setResponseContent(accumulatedExplanation)
                setStreamingContent("")
                setIsLoading(false)
              } else if (eventType === "error") {
                throw new Error(parsedData.error || "Unknown error")
              }
            } catch (error) {
              console.error("Error parsing SSE data:", error)
            }
          }
        }
      }
    } catch (err) {
      console.error("Error explaining code:", err)
      setError(err instanceof Error ? err.message : "Failed to explain code")
      setResponseContent("")
      setIsLoading(false)
      setStreamingContent("")
      setExplanationServerStatus("offline")
    }
  }

  // Function to handle bug fixing
  const handleBugFixing = async () => {
    // If code is empty or just placeholder, show error
    if (!code || code.trim() === "" || code.includes("Write your function here")) {
      setError("No code to fix. Please write or generate some code first.")
      return
    }

    // If server is offline, try to check status first
    if (correctionServerStatus === "offline") {
      await checkCorrectionServerStatus()

      // If still offline, show error
      if (correctionServerStatus === "offline") {
        setError("Code correction server is offline. Please start the server and try again.")
        return
      }
    }

    setIsLoading(true)
    setActiveButton("bugfix")
    setError(null)
    setStreamingContent("")
    setResponseContent("")
    setFromCache(false)

    try {
      // Create the URL for the correction endpoint
      const url = `http://localhost:3007/correct-stream`
      console.log(`Requesting code correction from: ${url}`)

      // Make a POST request to the correction server
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code,
          language: selectedLanguage.name,
          index: currentQuestionIndex,
        }),
      })

      if (!response.body) {
        throw new Error("Response body is null")
      }

      // Get a reader from the response body
      const reader = response.body.getReader()
      let accumulatedCorrection = ""
      const decoder = new TextDecoder()
      let buffer = ""

      // Process the stream
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // Decode the chunk and add it to the buffer
        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE events in the buffer
        const events = buffer.split("\n\n")
        buffer = events.pop() || "" // Keep the last incomplete event in the buffer

        for (const event of events) {
          const lines = event.split("\n")
          const eventType = lines[0].startsWith("event: ") ? lines[0].slice(7) : ""
          const data = lines[1]?.startsWith("data: ") ? lines[1].slice(6) : ""

          if (eventType && data) {
            try {
              const parsedData = JSON.parse(data)

              if (eventType === "metadata") {
                setFromCache(parsedData.fromCache || false)
              } else if (eventType === "data" && parsedData.correction) {
                accumulatedCorrection += parsedData.correction
                setStreamingContent(accumulatedCorrection)
              } else if (eventType === "complete") {
                // Finalize the response
                setResponseContent(accumulatedCorrection)
                setStreamingContent("")
                setIsLoading(false)
              } else if (eventType === "error") {
                throw new Error(parsedData.error || "Unknown error")
              }
            } catch (error) {
              console.error("Error parsing SSE data:", error)
            }
          }
        }
      }
    } catch (err) {
      console.error("Error fixing code:", err)
      setError(err instanceof Error ? err.message : "Failed to fix code")
      setResponseContent("")
      setIsLoading(false)
      setStreamingContent("")
      setCorrectionServerStatus("offline")
    }
  }

  // Function to apply generated code to the code playground
  const applyToCodePlayground = () => {
    if (responseContent || streamingContent) {
      if (activeButton === "generation" || activeButton === "bugfix") {
        setCode(responseContent || streamingContent)
      }
    }
  }

  // Function to test the SSE connection
  const handleTestConnection = async () => {
    setIsLoading(true)
    setActiveButton("test")
    setError(null)
    setStreamingContent("")
    setResponseContent("")
    setFromCache(false)

    try {
      // Test all servers
      const codeGenResponse = await fetch("http://localhost:3004/health", {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(3000),
      })

      const explanationResponse = await fetch("http://localhost:3006/health", {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(3000),
      })

      const correctionResponse = await fetch("http://localhost:3007/health", {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(3000),
      })

      if (codeGenResponse.ok) {
        setServerStatus("online")
      } else {
        setServerStatus("offline")
      }

      if (explanationResponse.ok) {
        setExplanationServerStatus("online")
      } else {
        setExplanationServerStatus("offline")
      }

      if (correctionResponse.ok) {
        setCorrectionServerStatus("online")
      } else {
        setCorrectionServerStatus("offline")
      }

      // Set response based on server status
      const onlineServers = [
        serverStatus === "online" ? "Code Generation" : null,
        explanationServerStatus === "online" ? "Code Explanation" : null,
        correctionServerStatus === "online" ? "Bug Fixing" : null,
      ].filter(Boolean)

      if (onlineServers.length === 3) {
        setResponseContent("All servers are online! You can use all AI assistance features.")
      } else if (onlineServers.length > 0) {
        setResponseContent(
          `The following servers are online: ${onlineServers.join(", ")}. Other features may not be available.`,
        )
      } else {
        setError("All servers are offline. Please start the servers and try again.")
      }
    } catch (err) {
      console.error("Error testing connection:", err)
      setError("Could not connect to the servers. Please make sure they are running.")
    } finally {
      setIsLoading(false)
    }
  }

  // Determine if any server is offline
  const anyServerOffline =
    serverStatus === "offline" || explanationServerStatus === "offline" || correctionServerStatus === "offline"

  return (
    <div className="flex flex-col h-full">
      {anyServerOffline && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertDescription>
            {[
              serverStatus === "offline" ? "Code generation" : null,
              explanationServerStatus === "offline" ? "Code explanation" : null,
              correctionServerStatus === "offline" ? "Bug fixing" : null,
            ]
              .filter(Boolean)
              .join(", ")}{" "}
            server
            {anyServerOffline &&
            [serverStatus, explanationServerStatus, correctionServerStatus].filter((status) => status === "offline")
              .length > 1
              ? "s are"
              : " is"}{" "}
            offline. Please start the server
            {anyServerOffline &&
            [serverStatus, explanationServerStatus, correctionServerStatus].filter((status) => status === "offline")
              .length > 1
              ? "s"
              : ""}{" "}
            and try again.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Button
          variant={activeButton === "generation" ? "default" : "outline"}
          className="flex items-center justify-center"
          onClick={handleCodeGeneration}
          disabled={isLoading}
        >
          <FileCode className="h-4 w-4 mr-2" />
          Code Generation
        </Button>

        <Button
          variant={activeButton === "explanation" ? "default" : "outline"}
          className="flex items-center justify-center"
          onClick={handleCodeExplanation}
          disabled={isLoading}
        >
          <Code className="h-4 w-4 mr-2" />
          Code Explanation
        </Button>

        <Button
          variant={activeButton === "bugfix" ? "default" : "outline"}
          className="flex items-center justify-center"
          onClick={handleBugFixing}
          disabled={isLoading}
        >
          <Bug className="h-4 w-4 mr-2" />
          Bug Fixing
        </Button>
      </div>

      {anyServerOffline && (
        <Button variant="outline" size="sm" className="mb-4 w-full" onClick={handleTestConnection} disabled={isLoading}>
          Test Server Connection
        </Button>
      )}

      <div className="flex-1 bg-muted/30 rounded-md p-4 overflow-auto relative">
        {isLoading ? (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">
                {activeButton === "generation"
                  ? "Generating code..."
                  : activeButton === "explanation"
                    ? "Explaining code..."
                    : activeButton === "bugfix"
                      ? "Fixing code..."
                      : "Processing..."}
              </span>
            </div>

            {streamingContent && (
              <div className="flex-1 overflow-auto">
                <pre className="whitespace-pre-wrap font-mono text-sm p-4 bg-muted rounded-md">{streamingContent}</pre>
              </div>
            )}
          </div>
        ) : error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : responseContent ? (
          <div className="flex flex-col h-full">
            {fromCache && <p className="text-xs text-muted-foreground italic mb-2">Using cached response</p>}
            <div className="flex-1 overflow-auto">
              <pre className="whitespace-pre-wrap font-mono text-sm p-4 bg-muted rounded-md">{responseContent}</pre>
            </div>

            {(activeButton === "generation" || activeButton === "bugfix") && (
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={applyToCodePlayground} className="flex items-center gap-1">
                  <Copy className="h-3 w-3" />
                  Apply to Code Playground
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground text-center h-full flex items-center justify-center">
            {activeButton
              ? "No content to display. Try again or select a different option."
              : "Select an option above to get AI assistance"}
          </div>
        )}
      </div>
    </div>
  )
}
