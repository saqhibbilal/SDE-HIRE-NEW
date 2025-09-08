import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const resumeAnalysis = body.resumeAnalysis || {};
    
    if (!resumeAnalysis || Object.keys(resumeAnalysis).length === 0) {
      return NextResponse.json({ error: 'Resume analysis data is required' }, { status: 400 });
    }

    console.log('🔍 Starting HR questions generation...');
    
    // Generate HR-specific questions based on resume analysis
    const questions = await generateHRQuestionsFromResume(resumeAnalysis);
    
    console.log(`✅ Generated ${questions.length} AI HR questions`);
    
    return NextResponse.json(questions);
    
  } catch (error) {
    console.error('Error generating HR questions:', error);
    // Fallback to default HR questions if generation fails
    const defaultQuestions = generateFallbackHRQuestions();
    return NextResponse.json(defaultQuestions);
  }
}

async function generateHRQuestionsFromResume(resumeAnalysis) {
  try {
    const mistralApiKey = process.env.MISTRAL_API_KEY;
    const mistralUrl = 'https://api.mistral.ai/v1/chat/completions';
    
    if (!mistralApiKey) {
      console.error('Mistral API key not found');
      throw new Error('Mistral API key not configured');
    }
    
    // Add randomness to prompt to avoid same questions
    const randomSeed = Math.floor(Math.random() * 1000);
    const currentTime = new Date().toISOString();
    
    const prompt = `You are a senior HR interviewer with expertise in creating professional, industry-standard HR interview questions. Based on the comprehensive resume analysis below, generate 4 HIGH-QUALITY HR questions that match professional interview standards.

COMPREHENSIVE RESUME ANALYSIS:
${JSON.stringify(resumeAnalysis, null, 2)}

QUESTION FOCUS AREAS (based on analysis):
- Leadership Questions: ${resumeAnalysis.recommendedQuestionFocus?.leadership_questions ? 'Include' : 'Skip'}
- Behavioral Questions: ${resumeAnalysis.recommendedQuestionFocus?.behavioral_questions ? 'Include' : 'Skip'}
- Situational Questions: ${resumeAnalysis.recommendedQuestionFocus?.situational_questions ? 'Include' : 'Skip'}
- Teamwork Questions: ${resumeAnalysis.recommendedQuestionFocus?.teamwork_questions ? 'Include' : 'Skip'}
- Communication Questions: ${resumeAnalysis.recommendedQuestionFocus?.communication_questions ? 'Include' : 'Skip'}
- Problem Solving Questions: ${resumeAnalysis.recommendedQuestionFocus?.problem_solving_questions ? 'Include' : 'Skip'}
- Results Questions: ${resumeAnalysis.recommendedQuestionFocus?.results_questions ? 'Include' : 'Skip'}
- Culture Fit Questions: ${resumeAnalysis.recommendedQuestionFocus?.culture_fit_questions ? 'Include' : 'Skip'}
- Career Goals Questions: ${resumeAnalysis.recommendedQuestionFocus?.career_goals_questions ? 'Include' : 'Skip'}

CANDIDATE PROFILE:
- Experience Level: ${resumeAnalysis.experienceLevel || 'mid-level'}
- Primary Strengths: ${resumeAnalysis.hrProfile?.primaryStrengths?.join(', ') || 'Technical Skills'}
- Industry Experience: ${resumeAnalysis.industryExperience?.join(', ') || 'General'}
- Leadership Experience: ${resumeAnalysis.hrProfile?.hasLeadershipExperience ? 'Yes' : 'No'}
- Communication Skills: ${resumeAnalysis.hrProfile?.hasStrongCommunication ? 'Strong' : 'Standard'}

GENERATE QUESTIONS FOLLOWING THESE PROFESSIONAL STANDARDS:

QUESTION QUALITY REQUIREMENTS:
- Questions must be specific, practical, and test real-world soft skills
- Focus on behavioral and situational scenarios relevant to the candidate's background
- Include questions that test leadership, communication, teamwork, and problem-solving
- Questions should be suitable for a ${resumeAnalysis.experienceLevel || 'mid-level'} professional role
- Mix of behavioral, situational, and culture-fit questions

QUESTION DISTRIBUTION (4 questions total):
- 2 Behavioral questions (past experiences)
- 1 Situational question (hypothetical scenarios)
- 1 Career Goals/Culture Fit question

EXAMPLES OF PROFESSIONAL HR QUESTION QUALITY:

Behavioral Example:
"Tell me about a time when you had to work with a difficult team member. How did you handle the situation and what was the outcome?"

Situational Example:
"If you were given a project with an unrealistic deadline, how would you approach it and communicate with stakeholders?"

Leadership Example:
"Describe a situation where you had to lead a team through a major change or challenge. What was your approach and what did you learn?"

Teamwork Example:
"Tell me about a time when you had to collaborate with people from different departments or backgrounds. How did you ensure effective communication?"

Career Goals Example:
"Where do you see yourself in 3-5 years, and how does this role align with your career objectives?"

TECHNICAL FOCUS AREAS (based on resume):
- Leadership and management experience
- Communication and presentation skills
- Team collaboration and cross-functional work
- Problem-solving and decision-making
- Project management and delivery
- Client/stakeholder management
- Innovation and creativity
- Results and impact measurement

SESSION UNIQUENESS: ${randomSeed}-${currentTime}

FORMAT REQUIREMENTS - Return valid JSON array:
[
  {
    "id": 2001,
    "question_type": "behavioral",
    "question_text": "Professional HR question text here related to candidate's background",
    "difficulty_level": "medium",
    "topic": "Leadership/Teamwork/Communication/etc",
    "focus_area": "Specific focus area based on resume analysis"
  },
  {
    "id": 2002,
    "question_type": "situational",
    "question_text": "Professional situational question testing soft skills",
    "difficulty_level": "medium",
    "topic": "Problem Solving/Decision Making",
    "focus_area": "Specific focus area based on resume analysis"
  }
]

CRITICAL: Questions must be professional-grade, relevant to the candidate's background, and test real-world soft skills they would encounter in their role. Focus on behavioral scenarios and situational challenges.`;

    const response = await fetch(mistralUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mistralApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          {
            role: 'system',
            content: 'You are a senior HR interviewer and question designer with 15+ years of experience. You create professional-grade HR interview questions that match industry standards. CRITICAL: You must respond with ONLY a valid JSON array, no markdown formatting, no code blocks, no additional text or explanations. Start your response directly with [ and end with ]. Do not use ```json``` or any other formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.9, // Increased for more variation
        max_tokens: 2000, // Sufficient for 8 questions
        top_p: 0.95,
        random_seed: randomSeed // Add randomness
      })
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const result = await response.json();
    const questionsText = result.choices[0]?.message?.content;
    
    console.log('AI Response:', questionsText);
    
    // Clean the response to extract JSON
    const cleanedJson = extractJsonFromResponse(questionsText);
    console.log('Cleaned JSON:', cleanedJson);
    
    // Parse the JSON response
    const questions = JSON.parse(cleanedJson);
    
    console.log('Parsed questions:', questions.length);
    
    // Validate and return questions
    if (Array.isArray(questions) && questions.length > 0) {
      // Validate each question has required fields
      const validatedQuestions = questions.filter(q => 
        q.id && 
        q.question_type && 
        q.question_text && 
        q.difficulty_level && 
        q.topic
      );
      
      if (validatedQuestions.length > 0) {
        console.log(`Successfully generated ${validatedQuestions.length} valid HR questions`);
        return validatedQuestions;
      } else {
        throw new Error('No valid questions found in AI response');
      }
    } else {
      throw new Error('AI did not return a valid questions array');
    }
    
  } catch (error) {
    console.error('Error generating HR questions with AI:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // If it's a JSON parsing error, log the raw response for debugging
    if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
      console.error('Raw AI response that failed to parse:', error.responseText || 'No response text available');
    }
    
    // Fallback to default questions if AI fails
    console.log('Falling back to default HR questions due to AI error');
    return generateFallbackHRQuestions();
  }
}

function generateFallbackHRQuestions() {
  console.log('🔄 Generating fallback HR questions...');
  
  const fallbackQuestions = [
    {
      id: 2001,
      question_type: "behavioral",
      question_text: "Tell me about a time when you had to work with a difficult team member. How did you handle the situation and what was the outcome?",
      difficulty_level: "medium",
      topic: "Teamwork",
      focus_area: "Conflict Resolution"
    },
    {
      id: 2002,
      question_type: "situational",
      question_text: "If you were given a project with an unrealistic deadline, how would you approach it and communicate with stakeholders?",
      difficulty_level: "medium",
      topic: "Project Management",
      focus_area: "Communication"
    },
    {
      id: 2003,
      question_type: "behavioral",
      question_text: "Describe a situation where you had to learn a new technology or skill quickly. How did you approach it and what was the result?",
      difficulty_level: "medium",
      topic: "Adaptability",
      focus_area: "Learning"
    },
    {
      id: 2004,
      question_type: "behavioral",
      question_text: "Tell me about a time when you had to present a complex technical concept to a non-technical audience. How did you ensure they understood?",
      difficulty_level: "medium",
      topic: "Communication",
      focus_area: "Presentation Skills"
    },
    {
      id: 2005,
      question_type: "situational",
      question_text: "How would you handle a situation where your team disagrees with your technical decision?",
      difficulty_level: "medium",
      topic: "Leadership",
      focus_area: "Decision Making"
    },
    {
      id: 2006,
      question_type: "behavioral",
      question_text: "Describe a project where you had to collaborate with people from different departments. What challenges did you face and how did you overcome them?",
      difficulty_level: "medium",
      topic: "Collaboration",
      focus_area: "Cross-functional Work"
    },
    {
      id: 2007,
      question_type: "behavioral",
      question_text: "Tell me about a time when you received constructive feedback. How did you respond and what did you learn from it?",
      difficulty_level: "medium",
      topic: "Growth Mindset",
      focus_area: "Feedback"
    },
    {
      id: 2008,
      question_type: "situational",
      question_text: "What are your long-term career goals and how does this role align with your professional development plans?",
      difficulty_level: "medium",
      topic: "Career Goals",
      focus_area: "Professional Development"
    }
  ];
  
  console.log(`✅ Generated ${fallbackQuestions.length} fallback HR questions`);
  return fallbackQuestions;
}

function extractJsonFromResponse(responseText) {
  if (!responseText) {
    throw new Error('Empty response from AI');
  }
  
  // Try to extract JSON from the response
  let cleanedText = responseText.trim();
  
  // Remove markdown code blocks if present
  cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
  
  // Find the first [ and last ] to extract JSON array
  const startIndex = cleanedText.indexOf('[');
  const endIndex = cleanedText.lastIndexOf(']');
  
  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
    throw new Error('No valid JSON array found in response');
  }
  
  const jsonText = cleanedText.substring(startIndex, endIndex + 1);
  
  // Basic validation that it looks like JSON
  if (!jsonText.includes('"question_text"') || !jsonText.includes('"id"')) {
    throw new Error('Response does not contain expected question structure');
  }
  
  return jsonText;
}
