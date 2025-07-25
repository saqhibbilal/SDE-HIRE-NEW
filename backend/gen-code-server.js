// gen-code-server.js
const express = require("express")
const fs = require("fs")
const path = require("path")
const axios = require("axios")
const cors = require("cors")
const app = express()

// Middleware
app.use(express.json())
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
)

const PORT = 3004
const OLLAMA_API = process.env.OLLAMA_API_URL || "http://127.0.0.1:11434/api/generate"
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "codestral:latest"
const QUESTIONS_PATH = path.join(__dirname, "..", "app", "dsa-tutor", "questions.json")
const PA_RESPONSE_PATH = path.join(__dirname, "app", "storage", "PAResponse.json")
const CODE_RESPONSE_PATH = path.join(__dirname, "app", "storage", "CodeResponse.json")

// Supported languages
const SUPPORTED_LANGUAGES = ["python", "javascript", "java", "cpp", "c"]
const DEFAULT_LANGUAGE = "python"

// Ensure storage directory exists
function ensureStorageDirectoryExists() {
  const storageDir = path.join(__dirname, "app", "storage")
  if (!fs.existsSync(storageDir)) {
    console.log(`Creating storage directory: ${storageDir}`)
    fs.mkdirSync(storageDir, { recursive: true })
  }
}

// Add a health check endpoint
app.get("/health", (req, res) => {
  res.status(200).send({
    status: "ok",
    timestamp: new Date().toISOString(),
  })
})

// Load questions helper function with error handling
function loadQuestions() {
  try {
    // Try multiple paths to find the questions.json file
    const possiblePaths = [
      path.join(__dirname, "..", "app", "dsa-tutor", "questions.json"),
      path.join(__dirname, "app", "dsa-tutor", "questions.json"),
      path.join(__dirname, "questions.json"),
    ]

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        console.log(`Found questions.json at: ${filePath}`)
        const data = fs.readFileSync(filePath, "utf8")
        return JSON.parse(data)
      }
    }

    console.error("Could not find questions.json in any of the expected locations")
    return []
  } catch (error) {
    console.error("Error loading questions:", error.message)
    return []
  }
}

// Load stored PA response from JSON file
function loadPAResponse() {
  try {
    ensureStorageDirectoryExists()
    if (fs.existsSync(PA_RESPONSE_PATH)) {
      const data = fs.readFileSync(PA_RESPONSE_PATH, "utf8")
      return JSON.parse(data)
    }
    return null
  } catch (error) {
    console.error("Error loading PA response:", error.message)
    return null
  }
}

// Load stored code response from JSON file
function loadCodeResponse() {
  try {
    ensureStorageDirectoryExists()
    if (fs.existsSync(CODE_RESPONSE_PATH)) {
      const data = fs.readFileSync(CODE_RESPONSE_PATH, "utf8")
      return JSON.parse(data)
    }
    return null
  } catch (error) {
    console.error("Error loading code response:", error.message)
    return null
  }
}

// Save code response to JSON file
function saveCodeResponse(questionIndex, title, language, code) {
  try {
    ensureStorageDirectoryExists()
    const responseData = {
      questionIndex,
      title,
      language,
      code,
      timestamp: new Date().toISOString(),
    }

    fs.writeFileSync(CODE_RESPONSE_PATH, JSON.stringify(responseData, null, 2), "utf8")
    console.log(`Code response for question ${questionIndex} saved to storage`)
    return true
  } catch (error) {
    console.error("Error saving code response:", error.message)
    return false
  }
}

// Validate and normalize language
function validateLanguage(language) {
  // Default to Python if no language is provided
  if (!language) return DEFAULT_LANGUAGE

  // Normalize language to lowercase
  const normalizedLang = language.toLowerCase()

  // Check if the language is supported
  if (SUPPORTED_LANGUAGES.includes(normalizedLang)) {
    return normalizedLang
  }

  // Default to Python if language is not supported
  console.warn(`Unsupported language: ${language}. Defaulting to ${DEFAULT_LANGUAGE}`)
  return DEFAULT_LANGUAGE
}

// Update the cleanCodeResponse function to ensure it preserves the complete solution
function cleanCodeResponse(code) {
  // Remove any markdown code block markers with language tags
  code = code
    .replace(/```(?:python|javascript|java|cpp|c|js|jsx|ts|tsx|json|html|css|bash|shell)?\n/gi, "")
    .replace(/```$/gm, "")

  // Don't strip out explanatory text or input/output handling code
  // Just return the complete code as is after removing markdown markers
  return code.trim()
}

// Get language-specific hints for error-free code
function getLanguageSpecificHints(language) {
  switch (language) {
    case "python":
      return `
- Use proper indentation (spaces, not tabs)
- Include all necessary imports at the top
- Handle input parsing carefully, especially for multiple lines
- Use try/except blocks for robust error handling
- Test your solution with the sample input before finalizing
- IMPORTANT: Use print() to output ONLY the exact expected value without any additional text
- For example, use print(5) instead of print("Result:", 5) or print(f"The answer is {5}")
      `.trim()

    case "javascript":
      return `
- Include all necessary imports at the top
- Use proper error handling with try/catch
- Handle asynchronous operations correctly if needed
- Parse input strings to appropriate types (Number, etc.)
- Test your solution with the sample input before finalizing
- IMPORTANT: Use console.log() to output ONLY the exact expected value without any additional text
- For example, use console.log(5) instead of console.log("Result:", 5) or console.log(\`The answer is \${5}\`)
      `.trim()

    case "java":
      return `
- Include a public class named Main with a public static void main method
- Handle input parsing with Scanner or BufferedReader
- Include all necessary imports (java.util.*, etc.)
- Use proper exception handling with try/catch
- Ensure all methods and class definitions are properly closed with curly braces {}
- Double-check that all opening braces have matching closing braces
- Test your solution with the sample input before finalizing
- IMPORTANT: Use System.out.println() to output ONLY the exact expected value without any additional text
- For example, use System.out.println(5) instead of System.out.println("Result: " + 5) or System.out.println("The answer is " + 5)
      `.trim()

    case "cpp":
      return `
- Include all necessary headers (#include <iostream>, etc.)
- Use proper namespace (using namespace std; or std::)
- Handle input/output with cin/cout
- Manage memory properly if using dynamic allocation
- Test your solution with the sample input before finalizing
- IMPORTANT: Use cout to output ONLY the exact expected value without any additional text
- For example, use cout << 5 << endl; instead of cout << "Result: " << 5 << endl; or cout << "The answer is " << 5 << endl;
      `.trim()

    case "c":
      return `
- Include all necessary headers (#include <stdio.h>, etc.)
- Use proper memory management (malloc/free if needed)
- Handle input/output with scanf/printf
- Check return values of functions for error handling
- Test your solution with the sample input before finalizing
- IMPORTANT: Use printf to output ONLY the exact expected value without any additional text
- For example, use printf("%d\\n", 5); instead of printf("Result: %d\\n", 5); or printf("The answer is %d\\n", 5);
      `.trim()

    default:
      return ""
  }
}

// Add the getIOExamples function to provide language-specific I/O examples
function getIOExamples(language, question) {
  const sampleInput = question.sample_input
  const sampleOutput = question.sample_output

  // Determine if this is a factorial problem (for specific examples)
  const isFactorialProblem = question.title.toLowerCase().includes("factorial")

  switch (language) {
    case "python":
      // Always return the specific template format for Python
      return `
# Example of a complete Python solution for this problem:

def solution(n):
    # Implementation goes here
    # Replace this with your actual solution
    return n  # Replace with actual return value

# Read input
n = int(input().strip())

# Call solution function
result = solution(n)

# Print output - ONLY the exact result value, no additional text
print(result)  # This will print only the result, e.g., "5" not "Result: 5"

# Sample Input:
# ${sampleInput}
#
# Expected Output:
# ${sampleOutput}
      `.trim()

    case "javascript":
      if (isFactorialProblem) {
        return `
// Example of a complete JavaScript solution for this problem:

function factorial(n) {
    // Implementation of factorial function
    let result = 1;
    for (let i = 1; i <= n; i++) {
        result *= i;
    }
    return result;
}

// Set up input handling
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on('line', (line) => {
    // Parse input
    const n = parseInt(line.trim());
    
    // Calculate result
    const result = factorial(n);
    
    // Print output
    console.log(result);
    
    rl.close();
});

// Sample Input:
// ${sampleInput}
//
// Expected Output:
// ${sampleOutput}
        `.trim()
      }

      return `
// Example of a complete JavaScript solution structure:

// Define your solution function
function solution(inputData) {
    // Process the input and compute the result
    // ...
    return result;
}

// Set up input handling
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on('line', (line) => {
    // Parse input based on the problem requirements
    let inputData = line.trim();
    // For example, if input is a number:
    // inputData = parseInt(inputData);
    // Or if input is a list of numbers:
    // inputData = inputData.split(' ').map(Number);
    
    // Call solution function
    const result = solution(inputData);
    
    // Print output
    console.log(result);
    
    rl.close();
});

// Sample Input:
// ${sampleInput}
//
// Expected Output:
// ${sampleOutput}
      `.trim()

    case "java":
      if (isFactorialProblem) {
        return `
/* Example of a complete Java solution for this problem:

import java.util.Scanner;

public class Main {
    // Factorial function implementation
    public static long factorial(int n) {
        long result = 1;
        for (int i = 1; i <= n; i++) {
            result *= i;
        }
        return result;
    }
    
    public static void main(String[] args) {
        // Set up input handling
        Scanner scanner = new Scanner(System.in);
        
        // Read and parse input
        int n = scanner.nextInt();
        
        // Calculate result
        long result = factorial(n);
        
        // Print output
        System.out.println(result);
        
        scanner.close();
    }
}

Sample Input:
${sampleInput}

Expected Output:
${sampleOutput}
*/
        `.trim()
      }

      return `
/* Example of a complete Java solution structure:

import java.util.Scanner;

public class Main {
    // Define your solution method
    public static <returnType> solution(<parameterType> inputData) {
        // Process the input and compute the result
        // ...
        return result;
    }
    
    public static void main(String[] args) {
        // Set up input handling
        Scanner scanner = new Scanner(System.in);
        
        // Read and parse input based on the problem requirements
        // For example, if input is a number:
        // int inputData = scanner.nextInt();
        // Or if input is a list of numbers:
        // int[] inputData = new int[n];
        // for (int i = 0; i < n; i++) {
        //     inputData[i] = scanner.nextInt();
        // }
        
        // Call solution method
        <returnType> result = solution(inputData);
        
        // Print output
        System.out.println(result);
        
        scanner.close();
    }
}

Sample Input:
${sampleInput}

Expected Output:
${sampleOutput}
*/
      `.trim()

    case "cpp":
      if (isFactorialProblem) {
        return `
/* Example of a complete C++ solution for this problem:

#include <iostream>
using namespace std;

// Factorial function implementation
long long factorial(int n) {
    long long result = 1;
    for (int i = 1; i <= n; i++) {
        result *= i;
    }
    return result;
}

int main() {
    // Read input
    int n;
    cin >> n;
    
    // Calculate result
    long long result = factorial(n);
    
    // Print output
    cout << result << endl;
    
    return 0;
}

Sample Input:
${sampleInput}

Expected Output:
${sampleOutput}
*/
        `.trim()
      }

      return `
/* Example of a complete C++ solution structure:

#include <iostream>
#include <vector>
#include <string>
using namespace std;

// Define your solution function
<returnType> solution(<parameterType> inputData) {
    // Process the input and compute the result
    // ...
    return result;
}

int main() {
    // Read and parse input based on the problem requirements
    // For example, if input is a number:
    // int inputData;
    // cin >> inputData;
    // Or if input is a list of numbers:
    // vector<int> inputData(n);
    // for (int i = 0; i < n; i++) {
    //     cin >> inputData[i];
    // }
    
    // Call solution function
    <returnType> result = solution(inputData);
    
    // Print output
    cout << result << endl;
    
    return 0;
}

Sample Input:
${sampleInput}

Expected Output:
${sampleOutput}
*/
      `.trim()

    case "c":
      if (isFactorialProblem) {
        return `
/* Example of a complete C solution for this problem:

#include <stdio.h>

// Factorial function implementation
long long factorial(int n) {
    long long result = 1;
    for (int i = 1; i <= n; i++) {
        result *= i;
    }
    return result;
}

int main() {
    // Read input
    int n;
    scanf("%d", &n);
    
    // Calculate result
    long long result = factorial(n);
    
    // Print output
    printf("%lld\\n", result);
    
    return 0;
}

Sample Input:
${sampleInput}

Expected Output:
${sampleOutput}
*/
        `.trim()
      }

      return `
/* Example of a complete C solution structure:

#include <stdio.h>
#include <stdlib.h>

// Define your solution function
<returnType> solution(<parameterType> inputData) {
    // Process the input and compute the result
    // ...
    return result;
}

int main() {
    // Read and parse input based on the problem requirements
    // For example, if input is a number:
    // int inputData;
    // scanf("%d", &inputData);
    // Or if input is a list of numbers:
    // int* inputData = (int*)malloc(n * sizeof(int));
    // for (int i = 0; i < n; i++) {
    //     scanf("%d", &inputData[i]);
    // }
    
    // Call solution function
    <returnType> result = solution(inputData);
    
    // Print output
    // printf("<format>\\n", result);
    
    // Free memory if needed
    // free(inputData);
    
    return 0;
}

Sample Input:
${sampleInput}

Expected Output:
${sampleOutput}
*/
      `.trim()

    default:
      return ""
  }
}

// Build prompt with PA explanation
function buildPromptWithExplanation(question, paResponse, language) {
  let langName = ""

  switch (language) {
    case "python":
      langName = "Python"
      break
    case "javascript":
      langName = "JavaScript"
      break
    case "java":
      langName = "Java"
      break
    case "cpp":
      langName = "C++"
      break
    case "c":
      langName = "C"
      break
    default:
      langName = "Python"
  }

  // Get I/O examples for the specific language
  const ioExamples = getIOExamples(language, question)

  return `
You are an expert ${langName} developer tasked with solving a coding problem.

PROBLEM TITLE:
${question.title}

PROBLEM STATEMENT:
${question.question}

INPUT FORMAT:
${question.input_format}

OUTPUT FORMAT:
${question.output_format}

CONSTRAINTS:
${question.constraints}

HINT:
${question.hint}

SAMPLE INPUT:
${question.sample_input}

SAMPLE OUTPUT:
${question.sample_output}

PROBLEM ASSISTANCE:
${paResponse.response}

INPUT/OUTPUT HANDLING EXAMPLES:
${ioExamples}

CRITICAL REQUIREMENTS:
1. Write a COMPLETE, RUNNABLE solution in ${langName} that correctly solves the problem.
2. Your solution MUST read input from standard input (stdin) and write output to standard output (stdout).
3. Your solution MUST handle the exact input format specified and produce the exact output format required.
4. Your solution MUST pass all test cases, including the sample input/output.
5. Include ALL necessary code to read input, process it, and output the result.
6. DO NOT include explanations, comments, or markdown formatting in your response.
7. DO NOT use placeholders or pseudo-code.
8. Your code MUST be immediately executable and pass all test cases.
9. DO NOT include any example templates or boilerplate code - generate a complete solution based on the problem requirements.
10. Your code MUST compile and run without any errors in ${langName}.
11. Ensure proper error handling for edge cases.
12. Verify your solution works with the sample input before submitting.
13. Double-check syntax to avoid compilation errors.
14. Ensure all necessary imports or libraries are included.
15. Follow standard ${langName} coding conventions and best practices.
16. IMPORTANT: Your solution MUST include code to read input and print output. Just defining a function is not enough.
17. IMPORTANT: Make sure your solution handles the exact data types expected. If the output should be a number, return a number, not a string.
18. IMPORTANT: Your solution MUST be a complete program that can be executed directly, not just a function definition.
19. IMPORTANT: For this specific problem, make sure your solution correctly handles all cases, including edge cases like 0.
20. CRITICAL: Your code MUST output ONLY the exact expected output value with no additional text, labels, or formatting. For example, if the expected output is "5", your code should print only "5" and not "Result: 5" or "The answer is 5".
21. ${language === "python" ? "PYTHON SPECIFIC: Your solution MUST follow this exact structure:\n```python\ndef solution(param):\n    # Your implementation\n    return result\n\n# Read input\nparam = input_parsing_code\n\n# Call solution\nresult = solution(param)\n\n# Print output\nprint(result)\n```" : ""}

LANGUAGE-SPECIFIC GUIDELINES FOR ${langName}:
${getLanguageSpecificHints(language)}

Generate ONLY the complete solution code now:
`.trim()
}

// Build fallback prompt without PA explanation
function buildFallbackPrompt(question, language) {
  let langName = ""

  switch (language) {
    case "python":
      langName = "Python"
      break
    case "javascript":
      langName = "JavaScript"
      break
    case "java":
      langName = "Java"
      break
    case "cpp":
      langName = "C++"
      break
    case "c":
      langName = "C"
      break
    default:
      langName = "Python"
  }

  // Get I/O examples for the specific language
  const ioExamples = getIOExamples(language, question)

  return `
You are an expert ${langName} developer tasked with solving a coding problem.

PROBLEM TITLE:
${question.title}

PROBLEM STATEMENT:
${question.question}

INPUT FORMAT:
${question.input_format}

OUTPUT FORMAT:
${question.output_format}

CONSTRAINTS:
${question.constraints}

HINT:
${question.hint}

SAMPLE INPUT:
${question.sample_input}

SAMPLE OUTPUT:
${question.sample_output}

INPUT/OUTPUT HANDLING EXAMPLES:
${ioExamples}

CRITICAL REQUIREMENTS:
1. Write a COMPLETE, RUNNABLE solution in ${langName} that correctly solves the problem.
2. Your solution MUST read input from standard input (stdin) and write output to standard output (stdout).
3. Your solution MUST handle the exact input format specified and produce the exact output format required.
4. Your solution MUST pass all test cases, including the sample input/output.
5. Include ALL necessary code to read input, process it, and output the result.
6. DO NOT include explanations, comments, or markdown formatting in your response.
7. DO NOT use placeholders or pseudo-code.
8. Your code MUST be immediately executable and pass all test cases.
9. DO NOT include any example templates or boilerplate code - generate a complete solution based on the problem requirements.
10. Your code MUST compile and run without any errors in ${langName}.
11. Ensure proper error handling for edge cases.
12. Verify your solution works with the sample input before submitting.
13. Double-check syntax to avoid compilation errors.
14. Ensure all necessary imports or libraries are included.
15. Follow standard ${langName} coding conventions and best practices.
16. IMPORTANT: Your solution MUST include code to read input and print output. Just defining a function is not enough.
17. IMPORTANT: Make sure your solution handles the exact data types expected. If the output should be a number, return a number, not a string.
18. IMPORTANT: Your solution MUST be a complete program that can be executed directly, not just a function definition.
19. IMPORTANT: For this specific problem, make sure your solution correctly handles all cases, including edge cases like 0.
20. CRITICAL: Your code MUST output ONLY the exact expected output value with no additional text, labels, or formatting. For example, if the expected output is "5", your code should print only "5" and not "Result: 5" or "The answer is 5".
21. ${language === "python" ? "PYTHON SPECIFIC: Your solution MUST follow this exact structure:\n```python\ndef solution(param):\n    # Your implementation\n    return result\n\n# Read input\nparam = input_parsing_code\n\n# Call solution\nresult = solution(param)\n\n# Print output\nprint(result)\n```" : ""}

LANGUAGE-SPECIFIC GUIDELINES FOR ${langName}:
${getLanguageSpecificHints(language)}

Generate ONLY the complete solution code now:
`.trim()
}

// Server-Sent Events endpoint for streaming code generation
app.get("/generate-stream", async (req, res) => {
  try {
    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")

    // Load the latest questions data on each request
    const questions = loadQuestions()

    if (questions.length === 0) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: "Failed to load questions data" })}\n\n`)
      return res.end()
    }

    // Get question index from query parameter or default to 0
    const index = req.query.index ? Number.parseInt(req.query.index) : 0

    // Get language from query parameter and validate it
    const requestedLanguage = req.query.language || DEFAULT_LANGUAGE
    console.log(`Raw language parameter received: "${requestedLanguage}"`)
    const language = validateLanguage(requestedLanguage)

    // Check if refresh is requested
    const forceRefresh = req.query.refresh === "true"

    console.log(
      `Requested streaming code generation for question index: ${index}, language: ${language}, Force refresh: ${forceRefresh}`,
    )

    const question = questions[index]

    if (!question) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: `Question not found at index ${index}` })}\n\n`)
      return res.end()
    }

    // Check if we have a stored code response for this question and language
    const storedCodeResponse = loadCodeResponse()

    // If we have a stored response for this exact question index and language and no refresh is requested, return it
    if (
      !forceRefresh &&
      storedCodeResponse &&
      storedCodeResponse.questionIndex === index &&
      storedCodeResponse.language === language
    ) {
      console.log(`Using stored code response for question index ${index} and language ${language}`)

      // Send initial metadata
      res.write(
        `event: metadata\ndata: ${JSON.stringify({
          title: question.title,
          language: language,
          fromCache: true,
        })}\n\n`,
      )

      // Send the full cached code
      res.write(`event: data\ndata: ${JSON.stringify({ code: storedCodeResponse.code })}\n\n`)

      // Send completion event
      res.write(`event: complete\ndata: ${JSON.stringify({ complete: true })}\n\n`)

      return res.end()
    }

    // Check if we have a PA response for context
    const paResponse = loadPAResponse()
    let hasPAExplanation = false

    if (paResponse && paResponse.questionIndex === index && paResponse.response) {
      hasPAExplanation = true
      console.log("Using PA explanation for context")
    } else {
      console.log("No PA explanation found, using fallback prompt")
    }

    // Build the appropriate prompt
    let prompt = ""
    if (hasPAExplanation) {
      prompt = buildPromptWithExplanation(question, paResponse, language)
    } else {
      prompt = buildFallbackPrompt(question, language)
    }

    try {
      // Send initial metadata
      res.write(
        `event: metadata\ndata: ${JSON.stringify({
          title: question.title,
          language: language,
          fromCache: false,
        })}\n\n`,
      )

      // Make the request with responseType: 'stream'
      const response = await axios.post(
        OLLAMA_API,
        {
          model: OLLAMA_MODEL,
          prompt: prompt,
          stream: true,
        },
        {
          headers: { "Content-Type": "application/json" },
          responseType: "stream",
          timeout: 150000, // 2.5 minute timeout
        },
      )

      let fullResponse = ""
      let jsonBuffer = ""

      // Handle the streaming response
      response.data.on("data", (chunk) => {
        const chunkStr = chunk.toString()
        jsonBuffer += chunkStr

        // Process complete JSON objects
        try {
          // Split by newlines to handle multiple JSON objects in the buffer
          const lines = jsonBuffer.split("\n")

          // Process all complete lines except possibly the last one
          for (let i = 0; i < lines.length - 1; i++) {
            if (lines[i].trim()) {
              const parsedChunk = JSON.parse(lines[i])
              if (parsedChunk.response) {
                fullResponse += parsedChunk.response

                // Send the chunk to the client
                res.write(`event: data\ndata: ${JSON.stringify({ code: parsedChunk.response })}\n\n`)

                // Optionally log progress
                process.stdout.write(parsedChunk.response)
              }
            }
          }

          // Keep the last line in the buffer if it's incomplete
          jsonBuffer = lines[lines.length - 1]
        } catch (e) {
          // If we can't parse, just keep accumulating data
          console.log("Error parsing chunk, continuing to accumulate data")
        }
      })

      response.data.on("end", () => {
        // Process any remaining data in the buffer
        try {
          if (jsonBuffer.trim()) {
            const parsedChunk = JSON.parse(jsonBuffer)
            if (parsedChunk.response) {
              fullResponse += parsedChunk.response

              // Send the final chunk
              res.write(`event: data\ndata: ${JSON.stringify({ code: parsedChunk.response })}\n\n`)
            }
          }
        } catch (e) {
          console.log("Error parsing final chunk")
        }

        console.log("\nStream ended, total response length:", fullResponse.length)

        // Clean the code response to ensure it's only code
        const cleanedCode = cleanCodeResponse(fullResponse)

        // Save the cleaned code response to storage
        saveCodeResponse(index, question.title, language, cleanedCode)

        // Send completion event
        res.write(`event: complete\ndata: ${JSON.stringify({ complete: true })}\n\n`)

        res.end()
      })

      response.data.on("error", (err) => {
        console.error("Stream error:", err)
        res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`)
        res.end()
      })
    } catch (apiError) {
      console.error("Ollama API error:", apiError.message)

      // Send error message to client
      res.write(
        `event: error\ndata: ${JSON.stringify({
          error: "Failed to generate code with Ollama. Please try again later.",
          details: apiError.message,
        })}\n\n`,
      )

      // Send completion event
      res.write(`event: complete\ndata: ${JSON.stringify({ complete: true, error: true })}\n\n`)

      res.end()
    }
  } catch (err) {
    console.error("Server error:", err.message)
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
})

// Keep the original endpoint for backward compatibility
app.get("/generate", async (req, res) => {
  try {
    // Load the latest questions data on each request
    const questions = loadQuestions()

    if (questions.length === 0) {
      return res.status(500).send("Failed to load questions data")
    }

    // Get question index from query parameter or default to 0
    const index = req.query.index ? Number.parseInt(req.query.index) : 0

    // Get language from query parameter and validate it
    const requestedLanguage = req.query.language || DEFAULT_LANGUAGE
    const language = validateLanguage(requestedLanguage)

    // Check if refresh is requested
    const forceRefresh = req.query.refresh === "true"

    console.log(
      `Requested code generation for question index: ${index}, language: ${language}, Force refresh: ${forceRefresh}`,
    )

    const question = questions[index]

    if (!question) {
      return res.status(404).send(`Question not found at index ${index}. Total questions: ${questions.length}`)
    }

    // Check if we have a stored code response for this question and language
    const storedCodeResponse = loadCodeResponse()

    // If we have a stored response for this exact question index and language and no refresh is requested, return it
    if (
      !forceRefresh &&
      storedCodeResponse &&
      storedCodeResponse.questionIndex === index &&
      storedCodeResponse.language === language
    ) {
      console.log(`Using stored code response for question index ${index} and language ${language}`)
      return res.send({
        title: question.title,
        language: language,
        code: storedCodeResponse.code,
        fromCache: true, // Flag to indicate this is a cached response
      })
    }

    // Check if we have a PA response for context
    const paResponse = loadPAResponse()
    let hasPAExplanation = false

    if (paResponse && paResponse.questionIndex === index && paResponse.response) {
      hasPAExplanation = true
      console.log("Using PA explanation for context")
    } else {
      console.log("No PA explanation found, using fallback prompt")
    }

    // Build the appropriate prompt
    let prompt = ""
    if (hasPAExplanation) {
      prompt = buildPromptWithExplanation(question, paResponse, language)
    } else {
      prompt = buildFallbackPrompt(question, language)
    }

    try {
      // Get streaming response from Ollama
      console.log("Requesting streaming code generation from Ollama...")

      // Make the request with responseType: 'stream'
      const response = await axios.post(
        OLLAMA_API,
        {
          model: OLLAMA_MODEL,
          prompt: prompt,
          stream: true,
        },
        {
          headers: { "Content-Type": "application/json" },
          responseType: "stream",
          timeout: 150000, // 2.5 minute timeout
        },
      )

      let fullResponse = ""
      let jsonBuffer = ""

      // Handle the streaming response
      response.data.on("data", (chunk) => {
        const chunkStr = chunk.toString()
        jsonBuffer += chunkStr

        // Process complete JSON objects
        try {
          // Split by newlines to handle multiple JSON objects in the buffer
          const lines = jsonBuffer.split("\n")

          // Process all complete lines except possibly the last one
          for (let i = 0; i < lines.length - 1; i++) {
            if (lines[i].trim()) {
              const parsedChunk = JSON.parse(lines[i])
              if (parsedChunk.response) {
                fullResponse += parsedChunk.response
                // Optionally log progress
                process.stdout.write(parsedChunk.response)
              }
            }
          }

          // Keep the last line in the buffer if it's incomplete
          jsonBuffer = lines[lines.length - 1]
        } catch (e) {
          // If we can't parse, just keep accumulating data
          console.log("Error parsing chunk, continuing to accumulate data")
        }
      })

      return new Promise((resolve, reject) => {
        response.data.on("end", () => {
          // Process any remaining data in the buffer
          try {
            if (jsonBuffer.trim()) {
              const parsedChunk = JSON.parse(jsonBuffer)
              if (parsedChunk.response) {
                fullResponse += parsedChunk.response
              }
            }
          } catch (e) {
            console.log("Error parsing final chunk")
          }

          console.log("\nStream ended, total response length:", fullResponse.length)
          console.log("Received complete code from Ollama")

          // Clean the code response to ensure it's only code
          const cleanedCode = cleanCodeResponse(fullResponse)

          // Save the cleaned code response to storage
          saveCodeResponse(index, question.title, language, cleanedCode)

          res.send({
            title: question.title,
            language: language,
            code: cleanedCode,
          })
          resolve()
        })

        response.data.on("error", (err) => {
          console.error("Stream error:", err)
          reject(err)
        })
      })
    } catch (apiError) {
      console.error("Ollama API error:", apiError.message)

      // Return error message to client
      return res.status(500).send({
        error: "Failed to generate code with Ollama. Please try again later.",
        details: apiError.message,
      })
    }
  } catch (err) {
    console.error("Server error:", err.message)
    res.status(500).send(`Server error: ${err.message}`)
  }
})

// Add an endpoint to clear the cached code response
app.delete("/clear-cache", (req, res) => {
  try {
    if (fs.existsSync(CODE_RESPONSE_PATH)) {
      // Reset the response file to empty state
      const emptyResponse = {
        questionIndex: -1,
        title: "",
        language: "",
        code: "",
        timestamp: new Date().toISOString(),
      }

      fs.writeFileSync(CODE_RESPONSE_PATH, JSON.stringify(emptyResponse, null, 2), "utf8")
      res.status(200).send({ message: "Code response cache cleared successfully" })
    } else {
      res.status(404).send({ message: "No cache file found" })
    }
  } catch (error) {
    console.error("Error clearing cache:", error.message)
    res.status(500).send({ error: `Failed to clear cache: ${error.message}` })
  }
})

// Start the server
app.listen(PORT, () => {
  console.log(`Code Generation Server running at http://localhost:${PORT}`)
  console.log(`Health check available at http://localhost:${PORT}/health`)
  console.log(`Questions data path: ${QUESTIONS_PATH}`)
  console.log(`Code response storage path: ${CODE_RESPONSE_PATH}`)
  console.log(`Supported languages: ${SUPPORTED_LANGUAGES.join(", ")}`)
  console.log(`Default language: ${DEFAULT_LANGUAGE}`)
  console.log(`Using Ollama API at: ${OLLAMA_API}`)
  console.log(`Using Ollama model: ${OLLAMA_MODEL}`)

  // Ensure storage directory exists on startup
  ensureStorageDirectoryExists()
})
 