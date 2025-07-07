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


export interface Question {
  id: number
  title: string
  difficulty: string
  description: string // ✅ This maps to your question text (from Supabase)
  input_format: string
  output_format: string
  constraints: string
  hint: string
  tags: string[] | null
  test_cases: {
    sample_input: string
    sample_output: string
    hidden_inputs: string[]
    hidden_outputs: string[]
  }
}


 

export interface ExecutionResult {
  stdout: string | null
  stderr: string | null
  compile_output: string | null
  message: string | null
  time: string
  memory: string
  status: {
    id: number
    description: string
  }
}


export interface Language {
  id: number
  name: string
  label: string
  value: string
  defaultCode: string
}

 