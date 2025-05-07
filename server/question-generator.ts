import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the server directory
dotenv.config({ path: path.join(__dirname, '.env') });

// Get the API key from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-1.5-flash-002";

// Default questions for fallback scenarios
function createDefaultQuestions(topic: string, role: string, numQuestions: number = 3) {
  const defaultQuestions = [
    {
      question: `Tell me about your experience with ${topic}.`,
      purpose: "To understand the candidate's background and experience with the topic.",
      follow_ups: ["Can you describe a specific challenge you faced?", "What skills did you develop?"]
    },
    {
      question: `What do you consider the most important aspect of ${topic} for a ${role}?`,
      purpose: "To assess the candidate's knowledge and priorities.",
      follow_ups: ["Why do you think that's important?", "How have you applied this in your work?"]
    },
    {
      question: `How do you stay updated with the latest developments in ${topic}?`,
      purpose: "To evaluate the candidate's commitment to continuous learning.",
      follow_ups: ["What resources do you use?", "What recent development interested you most?"]
    },
    {
      question: `Describe a situation where you had to solve a complex problem related to ${topic}.`,
      purpose: "To understand problem-solving skills and application of knowledge.",
      follow_ups: ["What approach did you take?", "What was the outcome?"]
    },
    {
      question: `Where do you see the future of ${topic} heading in the next few years?`,
      purpose: "To assess forward-thinking and awareness of industry trends.",
      follow_ups: ["How are you preparing for these changes?", "What opportunities do you see?"]
    }
  ];
  
  // Return the requested number of questions, cycling through if we need more
  let result = [];
  for (let i = 0; i < numQuestions; i++) {
    result.push(defaultQuestions[i % defaultQuestions.length]);
  }
  return result;
}

// Helper to safely generate content with error handling
async function generateSafely(generationFn: Function) {
  try {
    return await generationFn();
  } catch (error) {
    console.error("Error during generation:", error);
    return null;
  }
}

/**
 * Generates a set of interview questions based on topic, role, and mode
 * @param topic The topic of the interview
 * @param role The role being interviewed for
 * @param mode The interview mode (technical, behavioral, etc.)
 * @param numQuestions Number of questions to generate (default: 3)
 * @returns An object containing opening questions
 */
export async function generateInterviewQuestions(topic: string, role: string, mode: string, numQuestions: number = 3) {
  console.log(`Using model: ${MODEL_NAME} with v1 API`);
  console.log(`Using API key: ${GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 10) + '...' : 'none'}`);
  console.log(`Generating ${numQuestions} questions for topic: ${topic}, role: ${role}, mode: ${mode}`);
  
  // Validate numQuestions
  if (!numQuestions || isNaN(numQuestions) || numQuestions < 1 || numQuestions > 10) {
    console.warn(`Invalid numQuestions: ${numQuestions}, using default of 3`);
    numQuestions = 3;
  }

  try {
    // Check if API key is available
    if (!GEMINI_API_KEY) {
      console.warn("No Gemini API key found. Using default questions.");
      const fallbackQuestions = createDefaultQuestions(topic, role, numQuestions);
      return {
        interview_questions: {
          opening_questions: fallbackQuestions
        }
      };
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const generationConfig = {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    };

    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
      }
    ];

    // Create a structured prompt that ensures EXACTLY numQuestions questions
    const prompt = `Generate EXACTLY ${numQuestions} interview questions for a ${role} about ${topic}. 
This is a ${mode} style interview.

Your response MUST include EXACTLY ${numQuestions} questions.

Format your response as valid JSON with this exact structure:
{
  "interview_questions": {
    "opening_questions": [
      {
        "question": "The full text of the question",
        "purpose": "Brief explanation of what this question aims to assess",
        "follow_ups": ["Follow-up question 1", "Follow-up question 2"]
      },
      ... EXACTLY ${numQuestions - 1} MORE QUESTIONS ...
    ]
  }
}

Ensure questions are:
- Open-ended (not yes/no)
- Relevant to the ${topic} topic 
- Appropriate for the ${role} role
- Challenging but fair
- EXACTLY ${numQuestions} questions total

DO NOT include any explanations or text outside of the JSON structure.`;

    console.log("Sending question generation request to Gemini");
    
    // Use generateSafely to handle potential errors
    const result = await generateSafely(() => model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
      safetySettings
    }));

    if (!result || !result.response) {
      console.warn("Invalid response from Gemini API. Using default questions.");
      return {
        interview_questions: {
          opening_questions: createDefaultQuestions(topic, role, numQuestions)
        }
      };
    }

    const responseText = result.response.text();
    console.log("Raw Gemini response:", responseText);
    
    try {
      // Look for and extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseText;
      
      const parsedResponse = JSON.parse(jsonString);
      
      // Validate the response structure
      if (!parsedResponse.interview_questions || 
          !Array.isArray(parsedResponse.interview_questions.opening_questions) ||
          parsedResponse.interview_questions.opening_questions.length === 0) {
        console.warn("Invalid question format from Gemini API. Using default questions.");
        return {
          interview_questions: {
            opening_questions: createDefaultQuestions(topic, role, numQuestions)
          }
        };
      }
      
      // Check if we got the right number of questions
      const generatedQuestions = parsedResponse.interview_questions.opening_questions;
      
      // Create a new array with the exact number of questions needed
      let finalQuestions = [];
      
      if (generatedQuestions.length >= numQuestions) {
        // If we have enough questions, just take what we need
        finalQuestions = generatedQuestions.slice(0, numQuestions);
      } else {
        // If we don't have enough, use what we have and add defaults
        finalQuestions = [
          ...generatedQuestions,
          ...createDefaultQuestions(topic, role, numQuestions - generatedQuestions.length)
        ];
      }
      
      // Ensure each question has the required fields
      finalQuestions = finalQuestions.map((q: { question?: string; purpose?: string; follow_ups?: string[] }) => ({
        question: q.question || `Tell me about your experience with ${topic}.`,
        purpose: q.purpose || "To understand the candidate's knowledge and experience.",
        follow_ups: Array.isArray(q.follow_ups) ? q.follow_ups : 
          ["Can you elaborate on that?", "What specific skills did you use?"]
      }));
      
      console.log(`Successfully prepared ${finalQuestions.length} questions for ${topic}`);
      
      return {
        interview_questions: {
          opening_questions: finalQuestions
        }
      };
      
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      return {
        interview_questions: {
          opening_questions: createDefaultQuestions(topic, role, numQuestions)
        }
      };
    }
  } catch (error) {
    console.error("Error generating interview questions:", error);
    return {
      interview_questions: {
        opening_questions: createDefaultQuestions(topic, role, numQuestions)
      }
    };
  }
} 