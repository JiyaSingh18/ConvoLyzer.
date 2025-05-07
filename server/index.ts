import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { EventEmitter } from 'events';
import axios from 'axios';
import FormData from 'form-data';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { Readable } from 'stream';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GoogleAuth } from 'google-auth-library';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { OpenAI } from 'openai';
import { generateInterviewQuestions } from './question-generator';
import { analyzeInterviewAnswers, analyzeInterviewerSkills } from './interview-analyzer';

// Type definitions
interface Recommendation {
  detail: string;
  suggestion: string;
}

interface AnalysisRecommendations {
  notable_strengths?: Recommendation[];
  areas_for_improvement?: Recommendation[];
}

interface Analysis {
  recommendations?: AnalysisRecommendations;
  content_analysis?: {
    question_quality?: {
      score: number;
    };
  };
}

// Load environment variables
config();

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Initialize Express app and middleware
const app = express();
const upload = multer({ dest: 'uploads/' });
const analysisProgress = new EventEmitter();

// Configure CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'api-key', 'X-Request-Source'],
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Serve static files from the dist directory after building
app.use(express.static(path.join(process.cwd(), 'dist')));

// Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// Validate Gemini API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn('Warning: Missing Gemini API key. Some features may not work.');
}

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || 'dummy-key');

// Configure the model
const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash-002',
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 2048
  }
});

const execAsync = promisify(exec);

async function convertAudioToWav(inputBuffer: Buffer, mimeType: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!inputBuffer || !(inputBuffer instanceof Buffer)) {
      reject(new Error('Invalid input: buffer is required'));
      return;
    }

    if (!mimeType || typeof mimeType !== 'string') {
      reject(new Error('Invalid input: mimeType is required'));
      return;
    }

    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    const inputPath = path.join(tempDir, `input-${timestamp}.${mimeType.split('/')[1] || 'webm'}`);
    const outputPath = path.join(tempDir, `output-${timestamp}.wav`);

    console.log('Converting audio with parameters:', {
      inputBufferSize: inputBuffer.length,
      mimeType,
      inputPath,
      outputPath
    });

    try {
      // Write input buffer to temporary file
    fs.writeFileSync(inputPath, inputBuffer);
      console.log('Input file written successfully');

      // Create FFmpeg command
      const command = ffmpeg(inputPath)
      .toFormat('wav')
        .audioFrequency(16000)
        .audioChannels(1)
        .audioBitrate('16k');

      // Add error handlers
      command.on('start', (commandLine) => {
        console.log('FFmpeg conversion started with command:', commandLine);
      });

      command.on('progress', (progress) => {
        console.log('FFmpeg progress:', progress);
      });

      command.on('error', (err) => {
        console.error('FFmpeg error:', err);
        // Cleanup input file
        try {
        fs.unlinkSync(inputPath);
        } catch (cleanupErr) {
          console.warn('Failed to cleanup input file:', cleanupErr);
        }
        // Cleanup output file if it exists
        if (fs.existsSync(outputPath)) {
          try {
          fs.unlinkSync(outputPath);
          } catch (cleanupErr) {
            console.warn('Failed to cleanup output file:', cleanupErr);
          }
        }
        reject(new Error(`Error converting audio: ${err.message}`));
      });

      command.on('end', () => {
        console.log('FFmpeg conversion completed');
        // Verify output file exists and has content
        if (!fs.existsSync(outputPath)) {
          reject(new Error('FFmpeg conversion failed: output file not created'));
          return;
        }

        const outputStats = fs.statSync(outputPath);
        if (outputStats.size === 0) {
          reject(new Error('FFmpeg conversion failed: output file is empty'));
          return;
        }

        // Cleanup input file
        try {
        fs.unlinkSync(inputPath);
        } catch (err) {
          console.warn('Failed to cleanup input file:', err);
        }

        resolve(outputPath);
      });

      // Start the conversion
      command.save(outputPath);
    } catch (error) {
      console.error('Error during audio conversion setup:', error);
      // Cleanup any files that might have been created
      try {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch (cleanupErr: unknown) {
        console.warn('Failed to cleanup files after error:', cleanupErr);
      }
      reject(new Error(`Failed to setup audio conversion: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}

async function transcribeWithWhisper(audioPath: string): Promise<{ text: string; words: any[] }> {
  return new Promise((resolve, reject) => {
    // Check if Python environment exists
    const pythonPath = path.join(process.cwd(), 'whisper-env', 'Scripts', 'python.exe');
    if (!fs.existsSync(pythonPath)) {
      console.error('Python environment not found at:', pythonPath);
      reject(new Error('Whisper environment not properly configured. Please check installation.'));
      return;
    }

    // Verify audio file exists
    if (!fs.existsSync(audioPath)) {
      console.error('Audio file not found at:', audioPath);
      reject(new Error('Audio file not found'));
      return;
    }

    console.log('Starting Whisper transcription with:', {
      pythonPath,
      audioPath,
      fileSize: fs.statSync(audioPath).size
    });

    const whisperProcess = spawn(pythonPath, [
      '-c',
      `
import sys
import whisper
import json

try:
    print("Loading Whisper model...")
    model = whisper.load_model("base")
    print("Model loaded successfully")
    
    print("Starting transcription...")
    result = model.transcribe("${audioPath}")
    print("Transcription completed")
    
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
      `
    ]);

    let outputData = '';
    let errorData = '';

    whisperProcess.stdout.on('data', (data) => {
      const message = data.toString();
      console.log('Whisper output:', message);
      outputData += message;
    });

    whisperProcess.stderr.on('data', (data) => {
      const message = data.toString();
      console.error('Whisper error:', message);
      errorData += message;
    });

    whisperProcess.on('close', (code) => {
      console.log('Whisper process exited with code:', code);
      
      if (code !== 0) {
        console.error('Whisper process failed:', errorData);
        reject(new Error(`Whisper process failed: ${errorData}`));
        return;
      }

      try {
        // Try to parse the output as JSON
        const result = JSON.parse(outputData);
        
        // Check if there's an error in the result
        if (result.error) {
          reject(new Error(`Whisper error: ${result.error}`));
          return;
        }

        // Clean up temporary files
        try {
          fs.unlinkSync(audioPath);
        } catch (err) {
          console.warn('Failed to cleanup audio file:', err);
        }

        resolve({
      text: result.text,
          words: result.segments.map((segment: any) => ({
            word: segment.text,
            start: segment.start,
            end: segment.end
          }))
        });
      } catch (error) {
        console.error('Failed to parse Whisper output:', error);
        console.error('Raw output:', outputData);
        reject(new Error(`Failed to parse Whisper output: ${error}`));
      }
    });

    // Handle process errors
    whisperProcess.on('error', (error) => {
      console.error('Failed to start Whisper process:', error);
      reject(new Error(`Failed to start Whisper process: ${error.message}`));
    });
  });
}

async function analyzeWithGemini(text: string) {
  try {
    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('No valid text provided for analysis');
    }

    // Enhanced prompt for comprehensive interview/podcast analysis
    const prompt = `You are an expert conversation and interview analyst. Analyze the provided transcription in detail and return a comprehensive JSON object.
IMPORTANT: Return ONLY the JSON object itself, with NO markdown formatting, no \`\`\`json tags, or any other text.

Text to analyze:
${text.trim()}

Required structure (replace with your detailed analysis):
{
  "speakers": [
    {
      "id": "Speaker A",
      "characteristics": {
        "gender": "likely male/female/unknown",
        "speaking_style": "formal/casual/professional",
        "role": "interviewer/interviewee/host/guest"
      },
      "metrics": {
        "speaking_time_percentage": 0.6,
        "interruptions_made": 2,
        "questions_asked": 5,
        "filler_words_frequency": 0.03
      },
      "language": {
        "vocabulary_level": "advanced/intermediate/basic",
        "technical_terms_used": ["term1", "term2"],
        "communication_clarity": 0.8
      }
    }
  ],
  "conversation_dynamics": {
    "turn_taking": {
      "balanced": true,
      "dominant_speaker": "Speaker A",
      "interruption_patterns": "minimal/moderate/frequent"
    },
    "engagement_level": {
      "score": 0.8,
      "indicators": ["active listening", "follow-up questions"]
    }
  },
  "content_analysis": {
    "main_topics": [
      {
        "topic": "AI Technology",
        "time_spent": "30%",
        "depth": "technical/intermediate/surface"
      }
    ],
    "key_insights": [
      {
        "insight": "Description of key point made",
        "speaker": "Speaker A",
        "impact": "high/medium/low"
      }
    ],
    "question_quality": {
      "score": 0.9,
      "types": {
        "open_ended": 5,
        "follow_up": 3,
        "clarifying": 2
      }
    }
  },
  "sentiment": {
    "overall": {
      "score": 0.5,
      "magnitude": 0.8
    },
    "by_speaker": {
      "Speaker A": {
        "score": 0.6,
        "magnitude": 0.7,
        "emotions": {
          "joy": 0.4,
          "interest": 0.6,
          "skepticism": 0.2,
          "agreement": 0.7
        }
      }
    }
  },
  "expertise_indicators": {
    "domain_knowledge": {
      "score": 0.8,
      "areas": ["technology", "business"],
      "evidence": ["technical terms used", "industry references"]
    },
    "credibility_markers": ["references research", "provides examples", "admits uncertainty when appropriate"]
  },
  "recommendations": {
    "areas_for_improvement": [
      {
        "aspect": "turn-taking balance",
        "suggestion": "Allow more time for speaker B to respond"
      }
    ],
    "notable_strengths": [
      {
        "aspect": "technical knowledge",
        "detail": "Demonstrated deep understanding of AI concepts"
      }
    ]
  },
  "summary": {
    "brief": "One-line summary",
    "detailed": "Detailed multi-line summary",
    "key_takeaways": [
      "Main point 1",
      "Main point 2"
    ]
  }
}

IMPORTANT: Do not include any markdown formatting or code block tags. Return only the JSON object.`;

    console.log('Sending prompt to Gemini:', prompt);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysisText = response.text();
    
    console.log('Raw Gemini response:', analysisText.substring(0, 500) + '...');
    
    try {
      const parsedResult = JSON.parse(analysisText);
      console.log('Successfully parsed JSON. Validating structure...');
      
      // Validate the essential fields
      const requiredFields = ['speakers', 'conversation_dynamics', 'content_analysis', 'sentiment', 'summary'];
      const missingFields = requiredFields.filter(field => !parsedResult[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
      
      console.log('Validation successful. Returning analysis result.');
      return parsedResult;
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      console.error('Raw response type:', typeof analysisText);
      console.error('Raw response length:', analysisText.length);
      console.error('First 500 characters of raw response:', analysisText.substring(0, 500));
      throw new Error(`Failed to parse analysis results: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error in Gemini analysis:', error);
    throw error;
  }
}

app.get('/api/analysis-status', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendUpdate = (status: string) => {
    res.write(`data: ${JSON.stringify({ status })}\n\n`);
  };

  // Listen for progress updates
  analysisProgress.on('update', sendUpdate);

  // Remove listener when client disconnects
  req.on('close', () => {
    analysisProgress.removeListener('update', sendUpdate);
  });
});

app.post('/api/analyze-text', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ message: 'No valid text provided for analysis' });
    }

    console.log('Analyzing conversation transcript of length:', text.length);
    
    // For very long transcripts, log just the beginning to avoid console overflow
    console.log('First 100 characters of text:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
    
    analysisProgress.emit('update', 'Analyzing text with Gemini...');
    
    // Make sure we pass the complete text to the analyzer
    const fullText = text.trim();
    const analysis = await analyzeWithGemini(fullText);
    
    analysisProgress.emit('update', 'Analysis completed');

    // Return the complete analysis with the full transcript
    const response = {
      ...analysis,
      full_transcript: fullText // Include the full transcript in the response
    };
    
    res.json(response);
  } catch (error: any) {
    console.error('Text analysis error:', error);
    res.status(500).json({ 
      message: `Error analyzing text: ${error.message}`,
      details: error.stack
    });
  }
});

// Question generation endpoint
app.post('/api/generate-questions', async (req, res) => {
  try {
    const { topic, interviewee: role, mode, context } = req.body;
    let numQuestions = parseInt(req.body.numQuestions || '3', 10);
    
    // Log the request
    console.log('Question generation request:', {
      topic,
      interviewee: role,
      mode,
      numQuestions,
      contextLength: context?.length
    });

    if (!topic || !role || !mode) {
      return res.status(400).json({ error: 'Missing required parameters: topic, interviewee, mode' });
    }

    // Validate numQuestions
    if (isNaN(numQuestions) || numQuestions < 1) {
      console.warn(`Invalid numQuestions value: ${numQuestions}, using default of 3`);
      numQuestions = 3;
    } else if (numQuestions > 10) {
      console.warn(`numQuestions too high: ${numQuestions}, capping at 10`);
      numQuestions = 10;
    }

    // Check if it's a request from the question generator page which needs a different format
    const isExpandedFormat = req.headers['x-request-source'] === 'question-generator' || req.originalUrl.includes('generate-questions');
    
    if (isExpandedFormat) {
      // Generate expanded question set for the question generator page
      try {
        const expandedPrompt = `Generate an interview question set about ${topic} for a ${role}. This is a ${mode} interview. Include detailed questions and strategy.

        Format your response as valid JSON with this structure:
        {
          "interview_questions": {
            "opening_questions": [
              {
                "question": "Full text of the question",
                "purpose": "What this question aims to assess",
                "follow_ups": ["Follow-up 1", "Follow-up 2"]
              },
              // 2-3 more opening questions
            ],
            "core_questions": [
              // 3-5 core technical/main questions
            ],
            "closing_questions": [
              // 1-2 closing questions
            ]
          },
          "interview_strategy": {
            "recommended_duration": "Suggested time (e.g., 45-60 minutes)",
            "key_areas_to_probe": ["Area 1", "Area 2", "Area 3"],
            "potential_challenges": ["Challenge 1", "Challenge 2"],
            "success_indicators": ["Indicator 1", "Indicator 2"]
          }
        }`;
        
        console.log('Generating expanded question format');
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-002" });
        const result = await model.generateContent(expandedPrompt);
        const responseText = result.response.text();
        
        try {
          // Try to parse the response as JSON
          const jsonResponse = JSON.parse(responseText);
          
          // Basic validation of the response
          if (!jsonResponse.interview_questions) {
            throw new Error('Invalid response format: missing interview_questions');
          }
          
          // Ensure all sections exist even if empty
          const formattedResponse = {
            interview_questions: {
              opening_questions: jsonResponse.interview_questions.opening_questions || [],
              core_questions: jsonResponse.interview_questions.core_questions || [],
              closing_questions: jsonResponse.interview_questions.closing_questions || []
            },
            interview_strategy: jsonResponse.interview_strategy || {
              recommended_duration: "45-60 minutes",
              key_areas_to_probe: [`Experience with ${topic}`, "Problem-solving approach", "Technical depth"],
              potential_challenges: ["Assessing depth of knowledge", "Evaluating practical experience", "Time management"],
              success_indicators: ["Clear communication", "Structured thinking", "Relevant examples"]
            }
          };
          
          console.log(`Successfully generated expanded question set with ${
            (formattedResponse.interview_questions.opening_questions.length || 0) +
            (formattedResponse.interview_questions.core_questions.length || 0) +
            (formattedResponse.interview_questions.closing_questions.length || 0)
          } total questions`);
          
          return res.json(formattedResponse);
        } catch (parseError) {
          console.error('Error parsing expanded question response:', parseError);
          throw new Error('Failed to parse the generated questions');
        }
      } catch (expandedError) {
        console.error('Error generating expanded questions:', expandedError);
        // Fall back to standard question generation
      }
    }

    // Standard question generation for interview practice
    const questions = await generateInterviewQuestions(topic, role, mode, numQuestions);
    
    // Validate that we received the correct number of questions
    if (!questions?.interview_questions?.opening_questions || 
        !Array.isArray(questions.interview_questions.opening_questions)) {
      return res.status(500).json({ error: 'Failed to generate valid questions' });
    }

    const generatedCount = questions.interview_questions.opening_questions.length;
    if (generatedCount !== numQuestions) {
      console.warn(`Generated ${generatedCount} questions but expected ${numQuestions}`);
    }
    
    console.log(`Successfully generated ${generatedCount} questions for ${topic}`);
    return res.json(questions);
  } catch (error: any) {
    console.error('Error generating questions:', error);
    res.status(500).json({ 
      error: `Error generating questions: ${error.message}`,
      details: error.stack
    });
  }
});

// Add analyze-response endpoint FIRST
app.post('/api/analyze-response', async (req, res) => {
  try {
    console.log('Analyzing response:', req.body);
    const { question, answer, topic, mode } = req.body;
    
    if (!answer || !topic || !mode) {
      return res.status(400).json({ 
        message: 'Please provide answer, topic, and mode' 
      });
    }

    const prompt = `As an expert ${topic} interviewer, analyze this interview response:

Question: ${question?.question || 'Introduction'}
Answer: ${answer}
Topic: ${topic}
Mode: ${mode}

Provide a detailed analysis in the following JSON format (ensure the response is valid JSON):
{
  "strengths": ["list specific strong points in the answer"],
  "areas_for_improvement": ["list specific areas that could be improved"],
  "score": 0.0 to 1.0,
  "feedback": "detailed constructive feedback focusing on the ${topic} domain"
}`;

    console.log('Sending prompt to Gemini:', prompt);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysisText = response.text().trim();
    
    console.log('Raw Gemini response:', analysisText);
    
    try {
      // Clean up the response text to ensure valid JSON
      const cleanText = analysisText
        .replace(/```json\s*/, '')
        .replace(/```\s*$/, '')
        .trim();
      
      const analysis = JSON.parse(cleanText);
      
      // Validate the analysis structure
      if (!analysis.strengths || !analysis.areas_for_improvement || !analysis.feedback) {
        throw new Error('Invalid analysis structure');
      }
      
      // Ensure score is a number between 0 and 1
      analysis.score = Math.max(0, Math.min(1, Number(analysis.score) || 0));
      
      console.log('Sending analysis response:', analysis);
      res.json(analysis);
    } catch (parseError: unknown) {
      console.error('Error parsing response analysis:', parseError);
      console.error('Raw response:', analysisText);
      throw new Error('Failed to parse response analysis');
    }
  } catch (error: any) {
    console.error('Error analyzing response:', error);
    res.status(500).json({ 
      message: `Error analyzing response: ${error.message}`,
      details: error.stack
    });
  }
});

// Update the analyze-interview endpoint to use the correct InterviewAnalyzer functions
app.post('/api/analyze-interview', async (req, res) => {
  try {
    console.log('[analyze-interview] Received interview analysis request:', {
      mode: req.body.mode,
      topic: req.body.topic,
      answersCount: req.body.answers?.length
    });
    
    // Validate request
    if (!req.body.answers || !Array.isArray(req.body.answers) || req.body.answers.length === 0) {
      return res.status(400).json({ message: 'No answers provided for analysis' });
    }
    
    // Check for minimal or non-substantive answers
    const minimalResponseThreshold = 15; // characters
    const hasSubstantiveAnswers = req.body.answers.some((a: { answer: string; question: string }) => 
      (a.answer && a.answer.trim().length > minimalResponseThreshold && 
       !a.answer.toLowerCase().includes('my name is'))
    );
    
    if (!hasSubstantiveAnswers) {
      console.log('[analyze-interview] Non-substantive answers detected, providing guidance');
      return res.json({
        overall_assessment: {
          summary: "Your responses were too brief or didn't address the questions substantively. In an interview, providing detailed examples and specific information is crucial.",
          strengths: ["You participated in the interview process"],
          areas_for_improvement: [
            "Provide specific examples when answering questions",
            "Elaborate on your experiences and skills",
            "Structure your answers using the STAR method (Situation, Task, Action, Result)",
            "Ensure your responses directly address the questions asked"
          ]
        },
        technical_evaluation: {
          knowledge_depth: 0.1,
          communication_clarity: 0.2,
          problem_solving: 0.1
        },
        question_by_question_feedback: req.body.answers.map((a: { question: string; answer: string }, i: number) => ({
          question: a.question,
          feedback: "No detailed feedback available for this question.",
          strengths: [],
          areas_for_improvement: []
        })),
        recommendations: {
          key_action_items: [
            "Practice giving longer, more detailed responses",
            "Use the STAR method to structure your answers",
            "Prepare specific examples for common interview questions in advance",
            "Record yourself answering practice questions and review for completeness"
          ],
          preparation_tips: [
            "Research common interview questions for your field",
            "Prepare 5-7 strong examples from your experience that can be adapted to different questions",
            "Practice with a friend who can give you feedback on the completeness of your answers",
            "Consider each question carefully before responding to ensure you're addressing what was asked"
          ]
        }
      });
    }
    
    // Generate proper context for the analysis request
    const isIntervieweeMode = req.body.mode === 'give';
    const context = isIntervieweeMode
      ? `You are an expert interview coach analyzing an interview where the user was the interviewee answering questions about ${req.body.topic}. Analyze their responses for a ${req.body.interviewee} role. Provide extremely detailed and actionable feedback.`
      : `You are an expert interview coach analyzing questions asked by the user who was the interviewer for a ${req.body.interviewee} role, interviewing about ${req.body.topic}. Focus on how effective their questions were and provide extremely detailed and actionable feedback.`;
    
    // Log request for debugging
    console.log('[analyze-interview] Interview analysis context:', context);
    console.log('[analyze-interview] Answers/questions to analyze:', req.body.answers);
    
    // Convert the answers to a format that can be used in the completion
    const answersText = req.body.answers.map((a: { question: string; answer: string }, i: number) => (
      `${isIntervieweeMode ? 'Question' : 'Interviewer Question'} ${i + 1}: ${a.question}\n${isIntervieweeMode ? 'Answer' : 'Context/Purpose'}: ${a.answer}`
    )).join('\n\n');
    
    console.log('[analyze-interview] Generated analysis input:', answersText);
    console.log('[analyze-interview] Using', isIntervieweeMode ? 'interviewee' : 'interviewer', 'analysis mode');
    
    // Analyze the interview with Gemini
    console.log('[analyze-interview] Analyzing interview responses...');
    
    const analysisPrompt = `
      ${context}
      
      ${answersText}
      
      Provide an extremely thorough and detailed analysis in the following JSON format:
      {
        "overall_assessment": {
          "summary": "Comprehensive analysis summary with specific observations about strengths and weaknesses",
          "strengths": [
            "Detailed strength 1 with specific examples from the answers",
            "Detailed strength 2 with specific examples from the answers",
            "Detailed strength 3 with specific examples from the answers"
          ],
          "areas_for_improvement": [
            "Detailed area for improvement 1 with specific examples and detailed suggestions",
            "Detailed area for improvement 2 with specific examples and detailed suggestions",
            "Detailed area for improvement 3 with specific examples and detailed suggestions"
          ],
          "impact_assessment": "Detailed assessment of how the interview responses would impact hiring decisions"
        },
        "technical_evaluation": {
          ${isIntervieweeMode 
            ? `"knowledge_depth": 0.85, // numeric score between 0 and 1
              "communication_clarity": 0.75, // numeric score between 0 and 1
              "problem_solving": 0.8, // numeric score between 0 and 1
              "evidence_provided": "Detailed assessment of the specific evidence the candidate provided to support their claims",
              "technical_accuracy": "Detailed assessment of the technical accuracy of the responses",
              "relevance_of_examples": "Assessment of how relevant the provided examples were to the questions"`
            : `"questioning_technique": 0.85, // numeric score between 0 and 1
              "listening_skills": 0.75, // numeric score between 0 and 1
              "adaptability": 0.8, // numeric score between 0 and 1
              "question_structure": "Detailed assessment of how well-structured the questions were",
              "question_progression": "Analysis of how questions built upon each other",
              "question_relevance": "Assessment of how relevant the questions were to the role"`
          }
        },
        "question_by_question_feedback": [
          {
            "question": "Question text here",
            "feedback": "Extremely detailed feedback for this specific question/answer with concrete examples from the answer",
            "strengths": [
              "Detailed strength 1 specific to this question/answer with examples",
              "Detailed strength 2 specific to this question/answer with examples"
            ],
            "areas_for_improvement": [
              "Detailed area for improvement 1 specific to this question/answer with concrete suggestions",
              "Detailed area for improvement 2 specific to this question/answer with concrete suggestions"
            ],
            "ideal_response_structure": "Detailed description of what an ideal response to this question would include",
            "suggested_talking_points": [
              "Specific talking point 1 that would strengthen the answer",
              "Specific talking point 2 that would strengthen the answer"
            ]
          }
          // Include one object for each question
        ],
        "recommendations": {
          "key_action_items": [
            "Highly specific action item 1 with implementation steps",
            "Highly specific action item 2 with implementation steps",
            "Highly specific action item 3 with implementation steps"
          ],
          "preparation_tips": [
            "Detailed preparation tip 1 with examples",
            "Detailed preparation tip 2 with examples",
            "Detailed preparation tip 3 with examples"
          ],
          "follow_up_practice": [
            "Specific practice exercise 1 to improve identified weaknesses",
            "Specific practice exercise 2 to improve identified weaknesses"
          ],
          "resources": [
            "Specific recommended resource 1 (book, course, website) to improve skills",
            "Specific recommended resource 2 (book, course, website) to improve skills"
          ]
        }
      }
      
      Ensure your response is valid JSON with no trailing commas and no explanation or additional text.
      If the answers are very brief or only contain introductions without substantive content, include specific guidance on how to provide more complete and effective responses.
      Make your analysis extremely detailed, insightful, and actionable, focusing on concrete examples from the responses.
    `;
    
    // Call Gemini for analysis
    const result = await model.generateContent(analysisPrompt);
    const analysisText = result.response.text();
    
    // Try to parse the result
    try {
      // Clean up the response to make it valid JSON
      let cleanedText = analysisText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      // Remove any leading/trailing non-JSON content
      cleanedText = cleanedText.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      
      // Remove any JS-style comments
      cleanedText = cleanedText.replace(/\/\/.*$/gm, '');
      
      console.log('[analyze-interview] Cleaning and parsing JSON response');
      
      // Parse the cleaned JSON
      const analysis = JSON.parse(cleanedText);
      
      // Ensure the expected structure exists
      if (!analysis.overall_assessment || !analysis.recommendations) {
        console.warn('[analyze-interview] Analysis is missing required fields, using fallback');
        
        // Return a structured fallback with the original analysis
        return res.json({
          overall_assessment: analysis.overall_assessment || {
            summary: "The analysis couldn't be fully structured, but we've provided the available information.",
            strengths: [],
            areas_for_improvement: []
          },
          technical_evaluation: analysis.technical_evaluation || {
            knowledge_depth: 0.7,
            communication_clarity: 0.7,
            problem_solving: 0.7
          },
          question_by_question_feedback: analysis.question_by_question_feedback || 
            req.body.answers.map((a: { question: string; answer: string }, i: number) => ({
              question: a.question,
              feedback: "No detailed feedback available for this question.",
              strengths: [],
              areas_for_improvement: []
            })),
          recommendations: analysis.recommendations || {
            key_action_items: [],
            preparation_tips: []
          },
          fallback: true,
          error: "The analysis response was incomplete or malformed."
        });
      }
      
      console.log('[analyze-interview] Analysis completed successfully');
      
      // Return the valid, parsed analysis
      return res.json(analysis);
      
    } catch (parseError) {
      console.error('[analyze-interview] Failed to parse interview analysis:', parseError);
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error';
      
      // Return a basic fallback analysis
      return res.json({
        overall_assessment: {
          summary: "We couldn't generate a structured analysis for your interview. This may be due to processing limitations or unusual response formats.",
          strengths: ["N/A - See summary"],
          areas_for_improvement: ["N/A - See summary"]
        },
        technical_evaluation: {
          knowledge_depth: 0.5,
          communication_clarity: 0.5,
          problem_solving: 0.5
        },
        question_by_question_feedback: req.body.answers.map((a: { question: string; answer: string }, i: number) => ({
          question: a.question,
          feedback: "No detailed feedback available for this question.",
          strengths: [],
          areas_for_improvement: []
        })),
        recommendations: {
          key_action_items: ["Try again with different questions or responses"],
          preparation_tips: ["Review the full recording of your interview for personal insights"]
        },
        fallback: true,
        error: "Failed to parse the analysis JSON: " + errorMessage,
        raw_text: analysisText
      });
    }
  } catch (error: unknown) {
    console.error('[analyze-interview] Error in interview analysis:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      message: 'Failed to analyze interview', 
      error: errorMessage
    });
  }
});

// Analyze interviewer skills
app.post('/api/analyze-interviewer', async (req, res) => {
  try {
    const { questions, topic, role, mode } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Please provide interview questions' });
    }

    if (!topic || !role || !mode) {
      return res.status(400).json({ 
        message: 'Please provide topic, role information, and interview mode' 
      });
    }

    console.log('Analyzing interviewer skills for:', { topic, role, mode });
    const analysis = await analyzeInterviewerSkills(questions, topic, role, mode);
    res.json(analysis);
  } catch (error: any) {
    console.error('Error analyzing interviewer skills:', error);
    res.status(500).json({ 
      message: `Error analyzing interviewer skills: ${error.message}`,
      details: error.stack
    });
  }
});

// Add transcribe endpoint
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file provided' });
    }

    // Get the uploaded file path
    const audioPath = req.file.path;
    
    // Send progress update
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked'
    });
    
    try {
      // Transcribe the audio
      const result = await transcribeWithWhisper(audioPath);
      
      // Format the result
      const chunks = result.words.map((word: { text: string; start: number; end: number }) => ({
        text: word.text,
        start: word.start,
        end: word.end
      }));
      
      // Send the result
      res.write(JSON.stringify({
        text: result.text,
        chunks: chunks
      }));
      res.end();
      
      // Clean up the file
      fs.unlinkSync(audioPath);
    } catch (error) {
      console.error('Error transcribing audio:', error);
      res.write(JSON.stringify({ 
        message: 'Failed to transcribe audio. Please try again.' 
      }));
      res.end();
      
      // Clean up the file
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
    }
  } catch (error) {
    console.error('Error handling transcribe request:', error);
    res.status(500).json({ 
      message: 'Server error processing audio. Please try again.' 
    });
  }
});

// Add the catch-all route at the end
app.get('*', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start the server
const port = 4000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Available endpoints:');
  console.log('- POST /api/analyze-text');
  console.log('- POST /api/analyze-interview');
  console.log('- POST /api/generate-questions');
}).on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
