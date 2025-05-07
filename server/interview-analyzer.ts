import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from 'dotenv';

// Load environment variables
config();

// Initialize Google Generative AI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || 'dummy-key');

// Configure the model
const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash-002',
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 2048
  }
});

/**
 * Safely parses JSON, attempting to fix common JSON formatting issues from AI responses
 */
function safeJsonParse(jsonString: string) {
  try {
    // Try to parse normally first
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error parsing JSON response:", error);
    console.log("Original JSON string:", jsonString);
    
    // Clean up the response to fix common issues
    let cleanedJson = jsonString
      // Remove markdown formatting
      .replace(/```json\s*/g, '')
      .replace(/```\s*$/g, '')
      // Remove line breaks in the middle of strings that might break JSON
      .replace(/(".*?)[\n\r]+(.*?")/g, '$1 $2')
      // Add missing quotes to property names
      .replace(/(\s*)(\w+)(\s*):(\s*)/g, '$1"$2"$3:$4')
      .trim();
    
    try {
      // Try to parse the cleaned JSON
      return JSON.parse(cleanedJson);
    } catch (cleanError) {
      console.error("Error parsing cleaned JSON:", cleanError);
      
      // Try to fix common structural issues
      
      // Fix unclosed arrays in areas_for_improvement
      if (cleanedJson.includes('"areas_for_improvement"')) {
        const areasMatch = cleanedJson.match(/"areas_for_improvement"\s*:\s*\[(.*?)(?:\]\s*,|\]\s*})/s);
        if (areasMatch) {
          const areasContent = areasMatch[1];
          
          // Check if it's missing a closing bracket
          if ((areasContent.match(/"/g) || []).length % 2 !== 0 || 
              !areasContent.endsWith('"') && !areasContent.endsWith('"]')) {
            // Fix the unclosed array
            cleanedJson = cleanedJson.replace(
              /"areas_for_improvement"\s*:\s*\[(.*?)(?=\s*,\s*"|}\s*$)/s,
              (match, p1) => {
                // Make sure the array items are properly formatted
                const fixedItems = p1
                  .split(/",\s*"/)
                  .map((item: string) => item.trim().replace(/^"?/, '"').replace(/"?$/, '"'))
                  .join('", "');
                
                return `"areas_for_improvement": [${fixedItems}]`;
              }
            );
          }
        }
      }
      
      try {
        // Try to parse with the structural fixes
        return JSON.parse(cleanedJson);
      } catch (fixError) {
        console.error("Still couldn't parse JSON after fixes:", fixError);
        console.log("Attempted fixed JSON:", cleanedJson);
        
        // Return a fallback object as last resort
        return {
          overall_assessment: {
            summary: "Unable to generate detailed analysis due to technical issues. Please try again.",
            strengths: [],
            areas_for_improvement: ["Technical error occurred during analysis"]
          },
          recommendations: {
            key_action_items: ["Try again with more detailed answers"],
            preparation_tips: ["Ensure responses are clear and comprehensive"]
          },
          technical_evaluation: {
            knowledge_depth: 0.5,
            communication_clarity: 0.5,
            problem_solving: 0.5
          }
        };
      }
    }
  }
}

export async function analyzeInterviewAnswers(answers: Array<{ question: any; transcription: string }>, topic: string, interviewee: string, mode: string) {
  try {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your-api-key' || GEMINI_API_KEY.includes('your-')) {
      throw new Error('Invalid or missing Gemini API key');
    }

    // Check for non-substantive answers
    const hasNonSubstantiveAnswers = answers.some(a => 
      !a.transcription || 
      a.transcription === 'Recording...' || 
      a.transcription.length < 10
    );

    if (hasNonSubstantiveAnswers) {
      console.warn('[analyze-interview] Non-substantive answers detected');
      return {
        overall_assessment: {
          score: 0,
          summary: "Unable to provide analysis due to insufficient or missing answers. Please ensure all questions have complete responses.",
          strengths: [],
          areas_for_improvement: ["Provide complete answers for all questions"]
        },
        question_analysis: answers.map(a => ({
          question: a.question,
          answer_quality: 0,
          feedback: "No substantive answer provided",
          improvement_suggestions: ["Provide a complete and detailed response"]
        })),
        recommendations: {
          key_action_items: ["Complete all answers before requesting analysis"],
          preparation_tips: ["Prepare thorough responses for each question"],
          resources: []
        }
      };
    }

    const prompt = `As an expert interviewer and ${topic} professional, analyze these interview responses in detail:

Topic: ${topic}
Role: ${interviewee}
Interview Type: ${mode}

Questions and Answers:
${answers.map((a, i) => `
Q${i + 1}: ${a.question}
A${i + 1}: ${a.transcription}
`).join('\n')}

Analyze each answer thoroughly and provide a detailed evaluation in this JSON format:
{
  "overall_assessment": {
    "score": number between 1-10,
    "summary": "comprehensive evaluation of overall performance",
    "strengths": ["detailed list of specific strengths demonstrated"],
    "areas_for_improvement": ["specific areas needing improvement with clear examples"]
  },
  "question_analysis": [
    {
      "question": "exact question text",
      "answer_quality": number between 1-10,
      "feedback": "detailed analysis of the answer's effectiveness",
      "improvement_suggestions": ["specific, actionable suggestions for improvement"]
    }
  ],
  "technical_evaluation": {
    "knowledge_depth": number between 0-1,
    "communication_clarity": number between 0-1,
    "problem_solving": number between 0-1
  },
  "recommendations": {
    "key_action_items": ["specific, actionable steps for improvement"],
    "preparation_tips": ["detailed preparation strategies"],
    "resources": ["specific resources, books, courses, or materials to study"]
  }
}

Ensure each section provides specific, actionable feedback based on the actual content of the answers.
Focus on both technical accuracy and communication effectiveness.
IMPORTANT: Return ONLY the JSON object, no additional text.`;

    console.log('Analyzing interview responses with detailed prompt...');
    const result = await model.generateContent([prompt]);
    const response = await result.response;
    let analysisText = response.text().trim();
    
    // Clean up the response
    analysisText = analysisText.replace(/^```json\s*/, '');
    analysisText = analysisText.replace(/```\s*$/, '');
    
    const analysis = safeJsonParse(analysisText);

    // Validate the analysis structure
    if (!analysis.overall_assessment || !analysis.question_analysis || !analysis.recommendations) {
      console.error('Invalid analysis structure:', analysis);
      throw new Error('Generated analysis is missing required sections');
    }

    // Ensure question_analysis matches the number of answers
    if (analysis.question_analysis.length !== answers.length) {
      console.error('Question analysis count mismatch:', {
        expected: answers.length,
        received: analysis.question_analysis.length
      });
      throw new Error('Generated analysis does not match number of questions');
    }

    return analysis;
  } catch (error) {
    console.error('Error in analyzeInterviewAnswers:', error);
    throw error;
  }
}

export async function analyzeInterviewerSkills(questions: string[], topic: string, role: string, mode: string) {
  try {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your-api-key' || GEMINI_API_KEY.includes('your-')) {
      throw new Error('Invalid or missing Gemini API key');
    }

    const prompt = `As an expert in interviewing techniques, analyze the following questions asked by an interviewer:

Topic: ${topic}
Target Role: ${role}
Interview Type: ${mode}

Questions Asked:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Please analyze the interviewer's questioning skills and provide feedback in the following JSON format:
{
  "overall_assessment": {
    "score": "number between 1-10",
    "summary": "overall assessment of questioning skills",
    "strengths": ["list of strengths in questioning technique"],
    "areas_for_improvement": ["list of areas to improve"]
  },
  "question_analysis": [
    {
      "question": "the question",
      "effectiveness": "score between 1-10",
      "feedback": "specific feedback on this question",
      "improvement_suggestions": ["how to make this question more effective"]
    }
  ],
  "recommendations": {
    "questioning_techniques": ["recommended techniques to improve"],
    "structure_improvements": ["how to better structure the interview"],
    "additional_questions": ["suggested questions that could have been asked"]
  }
}

IMPORTANT: Return ONLY the JSON object, no additional text.`;

    console.log('Analyzing interviewer skills...');
    const result = await model.generateContent([prompt]);
    const response = await result.response;
    let analysisText = response.text().trim();
    
    // Clean up the response
    analysisText = analysisText.replace(/^```json\s*/, '');
    analysisText = analysisText.replace(/```\s*$/, '');
    
    return safeJsonParse(analysisText);
  } catch (error) {
    console.error('Error in analyzeInterviewerSkills:', error);
    throw error;
  }
} 