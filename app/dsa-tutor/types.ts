export interface Question {
  id: number
  title: string
  difficulty: string
  question: string
  input_format: string
  output_format: string
  constraints: string
  sample_input: string
  sample_output: string
  hint: string
  hidden_inputs: string[]
  hidden_outputs: string[]
}

export interface Language {
  id: number
  name: string
  label: string
  value: string
  defaultCode: string
}

export interface ExecutionResult {
  stdout: string | null
  stderr: string | null
  compile_output: string | null
  message: string | null
  status: {
    id: number
    description: string
  } | null
  time: string | null
  memory: number | null
}

// Update the ProblemAssistance interface if needed
export interface ProblemAssistance {
  explaining: string // Problem Explanation section
  solution: string // Key DSA Topic and Explanation section
  stepByStep: string // This will be empty with the new format, but kept for backward compatibility
  isLoading?: boolean
  error?: string
  fromCache?: boolean
  streamingText?: string
}