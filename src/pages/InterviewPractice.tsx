import React, { useState, useRef } from 'react';
import axios from 'axios';
import { User, Brain, AlertTriangle, Mic, StopCircle, Send, Loader, Loader2, Sparkles, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Add TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface Question {
  question: string;
  purpose: string;
  follow_ups: string[];
}

interface InterviewSession {
  currentQuestion: Question | null;
  remainingQuestions: Question[];
  answers: Array<{ 
    question: Question; 
    answer: string;
    analysis?: {
      strengths: string[];
      areas_for_improvement: string[];
      score: number;
      feedback: string;
    }
  }>;
  analysis: any | null;
  totalQuestions: number;
  recordedQuestions: string[];
  referenceQuestions?: Question[];
}

// Add these interview guidelines at the top of the file after the imports
const INTERVIEW_GUIDELINES = {
  technical: {
    guidelines: [
      {
        purpose: "Assess technical knowledge and problem-solving abilities. Focus on their understanding of core concepts and practical experience.",
        follow_ups: [
          "Can you explain how you've implemented this in a real project?",
          "What challenges did you face and how did you overcome them?",
          "Can you think of alternative approaches?"
        ]
      },
      {
        purpose: "Evaluate system design and architecture skills. Look for scalability, reliability, and maintainability considerations.",
        follow_ups: [
          "How would this solution scale with increased load?",
          "What are the potential bottlenecks?",
          "How would you handle failure scenarios?"
        ]
      },
      {
        purpose: "Explore coding best practices and quality standards. Focus on code organization, testing, and documentation.",
        follow_ups: [
          "How would you test this solution?",
          "What documentation would you provide?",
          "How would you ensure code maintainability?"
        ]
      }
    ]
  },
  behavioral: {
    guidelines: [
      {
        purpose: "Assess teamwork and collaboration abilities. Look for examples of effective communication and conflict resolution.",
        follow_ups: [
          "How did you handle disagreements within the team?",
          "What was your role in the project?",
          "What would you do differently next time?"
        ]
      },
      {
        purpose: "Evaluate leadership and initiative. Focus on project ownership and decision-making abilities.",
        follow_ups: [
          "How did you influence the team's decision?",
          "What was the impact of your initiative?",
          "How did you measure success?"
        ]
      },
      {
        purpose: "Explore problem-solving approach in challenging situations. Look for analytical thinking and resilience.",
        follow_ups: [
          "What alternatives did you consider?",
          "How did you handle setbacks?",
          "What did you learn from this experience?"
        ]
      }
    ]
  },
  system_design: {
    guidelines: [
      {
        purpose: "Assess system architecture knowledge. Focus on component design and integration strategies.",
        follow_ups: [
          "How would you handle data consistency?",
          "What caching strategies would you implement?",
          "How would you monitor system health?"
        ]
      },
      {
        purpose: "Evaluate scalability considerations. Look for understanding of distributed systems concepts.",
        follow_ups: [
          "How would you handle increased traffic?",
          "What's your approach to data partitioning?",
          "How would you ensure high availability?"
        ]
      },
      {
        purpose: "Explore security and performance optimization. Focus on best practices and trade-offs.",
        follow_ups: [
          "What security measures would you implement?",
          "How would you optimize performance?",
          "What monitoring metrics would you track?"
        ]
      }
    ]
  },
  leadership: {
    guidelines: [
      {
        purpose: "Assess team management and mentorship abilities. Look for examples of team growth and development.",
        follow_ups: [
          "How do you handle underperforming team members?",
          "How do you foster team growth?",
          "What's your approach to giving feedback?"
        ]
      },
      {
        purpose: "Evaluate strategic thinking and vision. Focus on long-term planning and execution.",
        follow_ups: [
          "How do you align team goals with company objectives?",
          "How do you handle competing priorities?",
          "How do you measure team success?"
        ]
      },
      {
        purpose: "Explore stakeholder management. Look for communication and negotiation skills.",
        follow_ups: [
          "How do you handle difficult stakeholders?",
          "How do you manage expectations?",
          "How do you build trust with stakeholders?"
        ]
      }
    ]
  }
};

const InterviewPractice: React.FC = () => {
  // Form states
  const [topic, setTopic] = useState('');
  const [interviewee, setInterviewee] = useState('');
  const [mode, setMode] = useState('technical');
  const [numQuestions, setNumQuestions] = useState(3);
  const [interviewMode, setInterviewMode] = useState<'give' | 'take'>('give');
  const [showSettings, setShowSettings] = useState(true);

  // Session states
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [showInterview, setShowInterview] = useState(false);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const handleTranscriptionError = (error: any) => {
    console.error('Transcription error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    const errorMessage = error.response?.data?.message || error.message;
    setError(`Transcription failed: ${errorMessage}`);
    
    // If it's a configuration error, stop recording
    if (error.response?.status === 500 && error.response?.data?.message?.includes('not properly configured')) {
      mediaRecorderRef.current?.stop();
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Initialize Web Speech API
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      let finalTranscript = '';
      
      recognition.onresult = (event) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update the current answer with both final and interim transcripts
        setCurrentAnswer(finalTranscript + interimTranscript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
      };

      recognition.onend = () => {
        if (isRecording) {
          recognition.start();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      
      // Keep MediaRecorder for audio backup
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        console.log('Recording stopped, audio saved');
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(`Failed to start recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const stopRecording = async () => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
      
      // Don't reset the current answer when stopping recording
      // This ensures we keep the transcribed text
    } catch (err) {
      console.error('Error stopping recording:', err);
      setError(`Failed to stop recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const startInterview = async () => {
    try {
      setError('');
      setIsLoading(true);
      setShowAnalysis(false);
      setCurrentAnswer('');

      console.log('Starting interview with settings:', {
        topic,
        interviewee,
        mode: interviewMode,
        numQuestions
      });

      // Generate questions
      const response = await axios.post('/api/generate-questions', {
        topic,
        interviewee,
        mode: interviewMode,
        numQuestions: parseInt(numQuestions, 10) || 3,
        context: `This is a ${interviewMode} interview. Generate ${numQuestions} questions appropriate for this format.`
      });

      console.log('Generated questions:', response.data);
      
      // Validate response
      if (!response.data?.interview_questions?.opening_questions || 
          !Array.isArray(response.data.interview_questions.opening_questions) ||
          response.data.interview_questions.opening_questions.length === 0) {
        throw new Error('Invalid response format from question generator');
      }

      const questions = response.data.interview_questions.opening_questions;
      
      // Log if we received fewer questions than requested
      const requestedQuestions = parseInt(numQuestions, 10) || 3;
      if (questions.length < requestedQuestions) {
        console.warn(`Requested ${requestedQuestions} questions but only received ${questions.length}`);
      }

      // Create the initial session object based on interview mode
      if (interviewMode === 'give') {
        // Interviewee mode - user answers questions
        setSession({
          currentQuestion: questions[0] || null,
          remainingQuestions: questions.slice(1),
          answers: [],
          analysis: null,
          totalQuestions: questions.length,
          recordedQuestions: [] // Not used in interviewee mode
        });
        
        console.log('Initialized interviewee session with first question:', questions[0]?.question);
      } else {
        // Interviewer mode - user asks questions
        // We'll use the generated questions as reference/examples
        setSession({
          currentQuestion: questions[0], // Show first question as reference
          remainingQuestions: questions.slice(1), // Keep remaining questions as reference
          answers: [], // Not used in interviewer mode
          analysis: null,
          totalQuestions: requestedQuestions,
          recordedQuestions: [] // Will store user's questions
        });
        
        console.log('Initialized interviewer session with reference questions:', questions);
      }

      // Start interview and hide settings
      setShowSettings(false);
      setShowInterview(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error starting interview:', error);
      if (axios.isAxiosError(error) && error.response) {
        // Display the specific error message from the server if available
        setError(`Failed to generate interview questions: ${error.response.data?.message || error.message}`);
      } else {
        setError(`Failed to generate interview questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      setIsLoading(false);
    }
  };

  const handleNextQuestion = async () => {
    if (!session) {
      console.error('No active session');
      return;
    }

    if (!currentAnswer || currentAnswer.trim().length < 10) {
      setError('Please provide a more detailed answer before continuing.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Stop any ongoing recording
      if (isRecording) {
        await stopRecording();
      }

      // Save current answer/question based on mode
      if (interviewMode === 'give') {
        // In interviewee mode, save the answer to the current question
        if (session.currentQuestion) {
          const updatedAnswers = [
            ...session.answers, 
            { 
              question: session.currentQuestion, 
              answer: currentAnswer.trim()
            }
          ];
          
          // Check if there are more questions
          if (session.remainingQuestions.length > 0) {
            // Still have questions, move to the next one
            setSession({
              ...session,
              currentQuestion: session.remainingQuestions[0],
              remainingQuestions: session.remainingQuestions.slice(1),
              answers: updatedAnswers
            });
            setCurrentAnswer('');
          } else {
            // No more questions, complete the interview
            setSession({
              ...session,
              currentQuestion: null,
              answers: updatedAnswers,
            });
            setIsComplete(true);
            setShowAnalysis(true);
          }
        }
      } else {
        // In interviewer mode, save the recorded question
        const updatedQuestions = [...session.recordedQuestions, currentAnswer.trim()];
        const nextQuestionNumber = updatedQuestions.length;
        
        console.log('Interviewer mode progress:', {
          nextQuestionNumber,
          totalQuestions: session.totalQuestions,
          updatedQuestions
        });
        
        // Check if we've asked all questions
        if (nextQuestionNumber >= session.totalQuestions) {
          console.log('All questions completed, moving to analysis');
          // All questions asked, complete the interview but preserve reference questions
          const allExampleQuestions = [session.currentQuestion, ...session.remainingQuestions].filter(q => q !== null);
          setSession({
            ...session,
            recordedQuestions: updatedQuestions,
            // Store reference questions in a new field
            referenceQuestions: allExampleQuestions
          });
          setCurrentAnswer('');
          setIsComplete(true);
          setShowAnalysis(true);
          return; // Exit early to prevent further processing
        }
        
        // Still have questions to ask, show next example
        const nextExample = session.remainingQuestions[nextQuestionNumber - 1] || null;
        console.log('Moving to next example:', nextExample);
        
          setSession({
            ...session,
          currentQuestion: nextExample,
            recordedQuestions: updatedQuestions,
          });
          setCurrentAnswer('');
      }
    } catch (error) {
      console.error('Error during question transition:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderNextButton = () => {
    if (!currentAnswer || isRecording) return null;

    const isLastQuestion = interviewMode === 'give' 
      ? session?.answers.length + 1 === session?.totalQuestions
      : session?.recordedQuestions.length + 1 === session?.totalQuestions;

    return (
      <div className="text-center">
        <button
          onClick={handleNextQuestion}
          className="retro-button px-12 py-3 text-lg hover:scale-105 transition-transform"
        >
          <Send className="inline mr-2" />
          {isLastQuestion ? 'Finish & Analyze' : 'Next Question'}
        </button>
      </div>
    );
  };

  const handleAnalyzeInterview = async () => {
    if (!session) {
      setError('No active session to analyze');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let dataToAnalyze;
      
      if (interviewMode === 'give') {
        // Filter out any "Recording..." answers and ensure we have valid answers
        const validAnswers = session.answers.filter(answer => 
          answer.answer && answer.answer.trim() !== 'Recording...'
        );

        if (validAnswers.length === 0) {
          throw new Error('No valid answers to analyze');
        }

        // Prepare detailed data for analysis
        dataToAnalyze = {
          answers: validAnswers.map(answer => ({
            question: answer.question.question,
            answer: answer.answer.trim(),
            purpose: answer.question.purpose || '',
            follow_ups: answer.question.follow_ups || []
          })),
          topic,
          interviewee,
          mode: interviewMode,
          interview_type: mode,
          total_questions: session.totalQuestions,
          analysis_type: 'detailed'
        };
      } else {
        // Filter out any "Recording..." questions
        const validQuestions = session.recordedQuestions.filter(q => 
          q && q.trim() !== 'Recording...'
        );

        if (validQuestions.length === 0) {
          throw new Error('No valid questions to analyze');
        }

        // Use the preserved reference questions
        const referenceQuestions = session.referenceQuestions || [];

        // Map recorded questions to their corresponding reference questions
        const questions = validQuestions.map((askedQuestion, index) => {
          const referenceQuestion = referenceQuestions[index] || null;
          return {
            asked_question: askedQuestion.trim(),
            reference_question: referenceQuestion?.question || '',
            reference_purpose: referenceQuestion?.purpose || '',
            follow_ups: referenceQuestion?.follow_ups || []
          };
        });

        dataToAnalyze = {
          questions,
          topic,
          interviewee,
          mode: interviewMode,
          interview_type: mode,
          total_questions: session.totalQuestions,
          analysis_type: 'detailed'
        };
      }

      console.log('Sending for analysis:', dataToAnalyze);

      try {
        // First attempt with detailed analysis
        const response = await axios.post('/api/analyze-interview', dataToAnalyze, {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.data && response.data.overall_assessment) {
          setSession({
            ...session,
            analysis: response.data
          });
          return;
        }
      } catch (error) {
        console.error('Error during server analysis:', error);
        
        // Generate analysis based on actual answers
        const analysis = {
          overall_assessment: {
            summary: generateOverallSummary(dataToAnalyze),
            strengths: generateStrengths(dataToAnalyze),
            areas_for_improvement: generateAreasForImprovement(dataToAnalyze),
            score: calculateOverallScore(dataToAnalyze)
          },
          technical_evaluation: {
            knowledge_depth: calculateKnowledgeScore(dataToAnalyze),
            communication_clarity: calculateCommunicationScore(dataToAnalyze),
            problem_solving: calculateProblemSolvingScore(dataToAnalyze)
          },
          recommendations: {
            key_action_items: generateActionItems(dataToAnalyze),
            preparation_tips: generatePreparationTips(dataToAnalyze)
          },
          question_analysis: generateQuestionAnalysis(dataToAnalyze)
        };

        setSession({
          ...session,
          analysis: analysis
        });
      }

    } catch (error) {
      console.error('Error during analysis:', error);
      setError(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions for analysis generation
  const generateOverallSummary = (data: any) => {
    const answers = data.answers || [];
    
    // Analyze answer relevance and quality
    const relevantResponses = answers.filter(a => 
      a.answer.toLowerCase().includes(a.question.toLowerCase().split(' ')[0]) ||
      a.answer.toLowerCase().includes(a.question.toLowerCase().split(' ')[1])
    ).length;
    
    const relevanceRatio = relevantResponses / answers.length;
    
    let summary = `Based on your responses to ${answers.length} questions, `;
    
    if (relevanceRatio > 0.7) {
      summary += "your answers demonstrate good understanding of the topics discussed. ";
    } else {
      summary += "some of your responses could be more focused on the questions asked. ";
    }
    
    // Check for specific marketing concepts
    const usesMarketingConcepts = answers.some(a => 
      a.answer.toLowerCase().includes('roi') ||
      a.answer.toLowerCase().includes('target audience') ||
      a.answer.toLowerCase().includes('campaign') ||
      a.answer.toLowerCase().includes('strategy') ||
      a.answer.toLowerCase().includes('metrics')
    );
    
    if (usesMarketingConcepts) {
      summary += "You show familiarity with key marketing concepts. ";
    } else {
      summary += "Consider incorporating more marketing-specific terminology and concepts. ";
    }
    
    return summary;
  };

  const generateStrengths = (data: any) => {
    const strengths = new Set<string>();
    const answers = data.answers || [];
    
    answers.forEach(answer => {
      // Check for marketing terminology
      if (answer.answer.toLowerCase().includes('roi') ||
          answer.answer.toLowerCase().includes('campaign') ||
          answer.answer.toLowerCase().includes('metrics')) {
        strengths.add("Demonstrates knowledge of marketing terminology");
      }
      
      // Check for strategic thinking
      if (answer.answer.toLowerCase().includes('strategy') ||
          answer.answer.toLowerCase().includes('plan') ||
          answer.answer.toLowerCase().includes('approach')) {
        strengths.add("Shows strategic thinking abilities");
      }
      
      // Check for results focus
      if (answer.answer.toLowerCase().includes('result') ||
          answer.answer.toLowerCase().includes('impact') ||
          answer.answer.toLowerCase().includes('outcome')) {
        strengths.add("Focuses on measurable outcomes");
      }
      
      // Check for specific examples
      if (answer.answer.toLowerCase().includes('example') ||
          answer.answer.toLowerCase().includes('instance') ||
          answer.answer.toLowerCase().includes('specifically')) {
        strengths.add("Provides concrete examples");
      }
    });
    
    return Array.from(strengths);
  };

  const generateAreasForImprovement = (data: any) => {
    const improvements = new Set<string>();
    const answers = data.answers || [];
    
    answers.forEach(answer => {
      // Check for marketing terminology
      if (!answer.answer.toLowerCase().includes('roi') &&
          !answer.answer.toLowerCase().includes('campaign') &&
          !answer.answer.toLowerCase().includes('metrics')) {
        improvements.add("Incorporate more marketing-specific terminology");
      }
      
      // Check for strategic thinking
      if (!answer.answer.toLowerCase().includes('strategy') &&
          !answer.answer.toLowerCase().includes('plan') &&
          !answer.answer.toLowerCase().includes('approach')) {
        improvements.add("Demonstrate more strategic thinking in responses");
      }
      
      // Check for results focus
      if (!answer.answer.toLowerCase().includes('result') &&
          !answer.answer.toLowerCase().includes('impact') &&
          !answer.answer.toLowerCase().includes('outcome')) {
        improvements.add("Focus more on measurable outcomes and results");
      }
      
      // Check for specific examples
      if (!answer.answer.toLowerCase().includes('example') &&
          !answer.answer.toLowerCase().includes('instance') &&
          !answer.answer.toLowerCase().includes('specifically')) {
        improvements.add("Include more specific examples to support your points");
      }
    });
    
    return Array.from(improvements);
  };

  const calculateOverallScore = (data: any) => {
    const answers = data.answers || [];
    let score = 0.5; // Base score
    
    answers.forEach(answer => {
      // Add points for using marketing terminology
      if (answer.answer.toLowerCase().includes('roi') ||
          answer.answer.toLowerCase().includes('campaign') ||
          answer.answer.toLowerCase().includes('metrics')) {
        score += 0.1;
      }
      
      // Add points for strategic thinking
      if (answer.answer.toLowerCase().includes('strategy') ||
          answer.answer.toLowerCase().includes('plan')) {
        score += 0.1;
      }
      
      // Add points for results focus
      if (answer.answer.toLowerCase().includes('result') ||
          answer.answer.toLowerCase().includes('impact')) {
        score += 0.1;
      }
      
      // Add points for specific examples
      if (answer.answer.toLowerCase().includes('example') ||
          answer.answer.toLowerCase().includes('specifically')) {
        score += 0.1;
      }
    });
    
    return Math.min(score, 1.0); // Cap at 1.0
  };

  const commonWords = [
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her',
    'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there',
    'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get',
    'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no',
    'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your',
    'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then',
    'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
    'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first',
    'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these',
    'give', 'day', 'most', 'us'
  ];

  const generateQuestionAnalysis = (data: any) => {
    return (data.answers || []).map((answer: any) => {
      const wordCount = answer.answer.split(' ').length;
      const hasExample = answer.answer.toLowerCase().includes('example');
      const hasOutcome = answer.answer.toLowerCase().includes('result') || answer.answer.toLowerCase().includes('outcome');
      
      return {
        question: answer.question,
        answer: answer.answer,
        feedback: generateAnswerFeedback(answer.answer),
        strengths: generateAnswerStrengths(answer.answer),
        areas_for_improvement: generateAnswerImprovements(answer.answer),
        score: calculateAnswerScore(answer.answer),
        suggested_improvements: generateSuggestedImprovements(answer.answer)
      };
    });
  };

  const generateAnswerFeedback = (answer: string) => {
    const wordCount = answer.split(' ').length;
    const hasStructure = answer.split('.').length > 2;
    
    if (wordCount < 50) {
      return "Your response could benefit from more detail and specific examples.";
    } else if (wordCount > 300) {
      return "Your response is comprehensive but could be more concise while maintaining key details.";
    } else if (hasStructure) {
      return "Your response is well-structured and provides good detail.";
    } else {
      return "Your response addresses the question but could be better structured.";
    }
  };

  const generateAnswerStrengths = (answer: string) => {
    const strengths = [];
    
    if (answer.length > 150) strengths.push("Provided detailed response");
    if (answer.toLowerCase().includes('example')) strengths.push("Used specific examples");
    if (answer.toLowerCase().includes('result') || answer.toLowerCase().includes('impact')) strengths.push("Focused on outcomes");
    if (answer.split('.').length > 3) strengths.push("Well-structured response");
    
    return strengths.length > 0 ? strengths : ["Addressed the question"];
  };

  const generateAnswerImprovements = (answer: string) => {
    const improvements = [];
    
    if (answer.length < 100) improvements.push("Add more detail to your response");
    if (!answer.toLowerCase().includes('example')) improvements.push("Include specific examples");
    if (!answer.toLowerCase().includes('result')) improvements.push("Highlight outcomes and results");
    if (answer.split('.').length < 3) improvements.push("Structure response more clearly");
    
    return improvements.length > 0 ? improvements : ["Continue developing response depth"];
  };

  const calculateAnswerScore = (answer: string) => {
    let score = 0.7;
    
    if (answer.length > 150) score += 0.05;
    if (answer.toLowerCase().includes('example')) score += 0.05;
    if (answer.toLowerCase().includes('result')) score += 0.05;
    if (answer.split('.').length > 3) score += 0.05;
    
    return Math.min(score, 1.0);
  };

  const generateSuggestedImprovements = (answer: string) => {
    const suggestions = [];
    
    if (!answer.toLowerCase().includes('example')) {
      suggestions.push("Add a specific example from your experience");
    }
    
    if (!answer.toLowerCase().includes('result') && !answer.toLowerCase().includes('impact')) {
      suggestions.push("Include the outcomes or results of your actions");
    }
    
    if (answer.split('.').length < 3) {
      suggestions.push("Structure your response using the STAR method");
    }
    
    if (answer.length < 100) {
      suggestions.push("Expand your answer with more relevant details");
    }
    
    return suggestions.length > 0 ? suggestions : ["Continue refining your response with more specific details"];
  };

  // Helper function to generate suggested rephrasing
  const generateSuggestedRephrasing = (question: string, mode: string): string => {
    const words = question.split(' ');
    if (mode === 'technical') {
      return `Could you explain how you would implement ${words.slice(1).join(' ')}? Walk me through your approach and any considerations.`;
    } else if (mode === 'behavioral') {
      return `Can you tell me about a specific situation where you ${words.slice(1).join(' ')}? What was your role and what was the outcome?`;
    } else if (mode === 'system_design') {
      return `How would you design a system that ${words.slice(1).join(' ')}? Consider scalability, reliability, and performance requirements.`;
    } else {
      return `Could you describe a time when you had to ${words.slice(1).join(' ')}? What was your approach and what were the results?`;
    }
  };

  const calculateKnowledgeScore = (data: any) => {
    const answers = data.answers || [];
    let score = 0.5; // Base score
    
    answers.forEach(answer => {
      // Check for domain-specific terminology
      if (answer.answer.toLowerCase().includes('roi') ||
          answer.answer.toLowerCase().includes('campaign') ||
          answer.answer.toLowerCase().includes('analytics') ||
          answer.answer.toLowerCase().includes('metrics')) {
        score += 0.1;
      }
      
      // Check for understanding of concepts
      if (answer.answer.toLowerCase().includes('strategy') ||
          answer.answer.toLowerCase().includes('target audience') ||
          answer.answer.toLowerCase().includes('market')) {
        score += 0.1;
      }
      
      // Check for depth of explanation
      if (answer.answer.split(' ').length > 50) {
        score += 0.1;
      }
    });
    
    return Math.min(score, 1.0);
  };

  const calculateCommunicationScore = (data: any) => {
    const answers = data.answers || [];
    let score = 0.5; // Base score
    
    answers.forEach(answer => {
      // Check for clear structure
      if (answer.answer.split('.').length > 2) {
        score += 0.1;
      }
      
      // Check for specific examples
      if (answer.answer.toLowerCase().includes('example') ||
          answer.answer.toLowerCase().includes('instance') ||
          answer.answer.toLowerCase().includes('such as')) {
        score += 0.1;
      }
      
      // Check for clarity of explanation
      if (answer.answer.toLowerCase().includes('because') ||
          answer.answer.toLowerCase().includes('therefore') ||
          answer.answer.toLowerCase().includes('this means')) {
        score += 0.1;
      }
    });
    
    return Math.min(score, 1.0);
  };

  const calculateProblemSolvingScore = (data: any) => {
    const answers = data.answers || [];
    let score = 0.5; // Base score
    
    answers.forEach(answer => {
      // Check for solution-oriented thinking
      if (answer.answer.toLowerCase().includes('solve') ||
          answer.answer.toLowerCase().includes('solution') ||
          answer.answer.toLowerCase().includes('approach')) {
        score += 0.1;
      }
      
      // Check for consideration of alternatives
      if (answer.answer.toLowerCase().includes('alternative') ||
          answer.answer.toLowerCase().includes('another way') ||
          answer.answer.toLowerCase().includes('could also')) {
        score += 0.1;
      }
      
      // Check for results/outcomes focus
      if (answer.answer.toLowerCase().includes('result') ||
          answer.answer.toLowerCase().includes('outcome') ||
          answer.answer.toLowerCase().includes('impact')) {
        score += 0.1;
      }
    });
    
    return Math.min(score, 1.0);
  };

  const generateActionItems = (data: any) => {
    const actionItems = new Set<string>();
    const answers = data.answers || [];
    
    // Analyze answers for areas needing improvement
    answers.forEach(answer => {
      // Check for lack of specific examples
      if (!answer.answer.toLowerCase().includes('example') &&
          !answer.answer.toLowerCase().includes('instance')) {
        actionItems.add("Practice incorporating specific examples in your responses");
      }
      
      // Check for lack of metrics/results
      if (!answer.answer.toLowerCase().includes('result') &&
          !answer.answer.toLowerCase().includes('metric') &&
          !answer.answer.toLowerCase().includes('roi')) {
        actionItems.add("Focus on quantifiable results and metrics in your answers");
      }
      
      // Check for lack of strategic thinking
      if (!answer.answer.toLowerCase().includes('strategy') &&
          !answer.answer.toLowerCase().includes('plan') &&
          !answer.answer.toLowerCase().includes('approach')) {
        actionItems.add("Demonstrate more strategic thinking in your responses");
      }
      
      // Check for brevity
      if (answer.answer.split(' ').length < 50) {
        actionItems.add("Provide more detailed and comprehensive responses");
      }
    });
    
    return Array.from(actionItems);
  };

  const generatePreparationTips = (data: any): string[] => {
    const tips = new Set<string>();
    const answers = data.answers || [];
    const mode = data.interview_type || 'technical';

    // Add general tips based on mode
    if (mode === 'technical') {
      tips.add("Research common technical challenges in the role");
      tips.add("Practice explaining complex concepts clearly and concisely");
      tips.add("Prepare examples of relevant projects or experiences");
    } else if (mode === 'behavioral') {
      tips.add("Structure responses using the STAR method (Situation, Task, Action, Result)");
      tips.add("Prepare specific examples of past experiences");
      tips.add("Focus on quantifiable results and outcomes");
    } else if (mode === 'system_design') {
      tips.add("Practice breaking down complex systems into components");
      tips.add("Review scalability and performance considerations");
      tips.add("Prepare to discuss trade-offs in system design decisions");
    } else if (mode === 'leadership') {
      tips.add("Prepare examples of team management and conflict resolution");
      tips.add("Focus on metrics and impact in leadership roles");
      tips.add("Review strategies for stakeholder management");
    }

    // Add specific tips based on answer analysis
    answers.forEach(answer => {
      if (!answer.answer.toLowerCase().includes('example')) {
        tips.add("Include more specific examples in your responses");
      }
      if (!answer.answer.toLowerCase().includes('result') && !answer.answer.toLowerCase().includes('outcome')) {
        tips.add("Focus more on concrete results and outcomes");
      }
      if (answer.answer.split(' ').length < 50) {
        tips.add("Provide more detailed responses with supporting context");
      }
      if (!answer.answer.toLowerCase().includes('challenge') && !answer.answer.toLowerCase().includes('problem')) {
        tips.add("Discuss challenges faced and how you overcame them");
      }
    });

    return Array.from(tips);
  };

  // Update the analysis results rendering to include per-question analysis
  const renderAnalysisResults = () => {
    if (!session?.analysis) {
      return <div className="text-center py-8">No analysis available.</div>;
    }

    const analysis = session.analysis;
    console.log('Rendering analysis:', analysis);

    // Check if we have the expected fields
    if (!analysis.overall_assessment) {
      console.error('Missing required analysis fields:', analysis);
      return (
        <div className="text-center py-8">
          Analysis data is incomplete or in an unexpected format.
          <pre className="mt-4 text-left text-xs bg-gray-800 p-4 rounded overflow-auto max-h-60">
            {JSON.stringify(analysis, null, 2)}
          </pre>
        </div>
      );
    }

    // Extract data for display
    const {
      overall_assessment,
      recommendations,
      technical_evaluation = {
        knowledge_depth: 0,
        communication_clarity: 0,
        problem_solving: 0
      }
    } = analysis;

    // For interviewee mode, map answers to questions for analysis
    const questionAnalysis = interviewMode === 'give' ? 
      session.answers.map((answer, index) => ({
        question: answer.question.question,
        answer: answer.answer,
        feedback: analysis.question_analysis?.[index]?.feedback || analysis.question_by_question_analysis?.[index]?.feedback || 'No specific feedback available.',
        strengths: analysis.question_analysis?.[index]?.strengths || analysis.question_by_question_analysis?.[index]?.strengths || [],
        areas_for_improvement: analysis.question_analysis?.[index]?.areas_for_improvement || analysis.question_by_question_analysis?.[index]?.areas_for_improvement || [],
        score: analysis.question_analysis?.[index]?.score || analysis.question_by_question_analysis?.[index]?.score || 0,
        suggested_improvements: analysis.question_analysis?.[index]?.suggested_improvements || analysis.question_by_question_analysis?.[index]?.suggested_improvements || []
      })) :
      (analysis.question_analysis || analysis.question_by_question_analysis || []).map(item => ({
        question: item.asked_question || item.question,
        reference_question: item.reference_question,
        feedback: item.feedback || 'No specific feedback available.',
        strengths: item.strengths || [],
        areas_for_improvement: item.areas_for_improvement || [],
        score: item.score || 0,
        suggested_improvements: item.suggested_improvements || []
      }));

    return (
      <div className="space-y-8">
        <div className="retro-card p-8 bg-white dark:bg-gray-800 hover:scale-[1.02] transition-all">
          <h3 className="text-xl font-bold mb-6 hover:scale-105 transition-transform cursor-default">Overall Assessment</h3>
          <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300 hover:scale-[1.01] transition-transform cursor-default">
            {overall_assessment.summary}
          </p>
          
          {overall_assessment.score && (
            <div className="mt-4 text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {Math.round(overall_assessment.score * 10)}/10
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Overall Score</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="retro-card p-8 bg-white dark:bg-gray-800 hover:scale-[1.02] transition-all">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100 hover:scale-105 transition-transform cursor-default">Strengths</h3>
            <ul className="list-disc pl-5 space-y-3">
              {overall_assessment.strengths && overall_assessment.strengths.length > 0 ? (
                overall_assessment.strengths.map((strength, i) => (
                  <li key={i} className="text-lg leading-relaxed text-gray-700 dark:text-gray-300 hover:scale-[1.01] transition-transform cursor-default">{strength}</li>
                ))
              ) : (
                <li className="text-lg leading-relaxed text-gray-700 dark:text-gray-300 hover:scale-[1.01] transition-transform cursor-default">No specific strengths identified</li>
              )}
            </ul>
          </div>
          
          <div className="retro-card p-8 bg-white dark:bg-gray-800 hover:scale-[1.02] transition-all">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100 hover:scale-105 transition-transform cursor-default">Areas for Improvement</h3>
            <ul className="list-disc pl-5 space-y-3">
              {overall_assessment.areas_for_improvement && overall_assessment.areas_for_improvement.length > 0 ? (
                overall_assessment.areas_for_improvement.map((area, i) => (
                  <li key={i} className="text-lg leading-relaxed text-gray-700 dark:text-gray-300 hover:scale-[1.01] transition-transform cursor-default">{area}</li>
                ))
              ) : (
                <li className="text-lg leading-relaxed text-gray-700 dark:text-gray-300 hover:scale-[1.01] transition-transform cursor-default">No specific areas for improvement identified</li>
              )}
            </ul>
          </div>
        </div>
        
        <div>
          <h3 className="text-xl font-bold mb-6 hover:scale-105 transition-transform cursor-default">Technical Evaluation</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="retro-card p-8 text-center hover:scale-[1.02] transition-all">
                  <div className="text-3xl font-bold text-blue-500 mb-2 hover:scale-105 transition-transform cursor-default">
                {Math.round((technical_evaluation.knowledge_depth || 0) * 10)}/10
                  </div>
                  <div className="text-sm font-bold hover:scale-105 transition-transform cursor-default">Knowledge</div>
                </div>
                <div className="retro-card p-8 text-center hover:scale-[1.02] transition-all">
                  <div className="text-3xl font-bold text-purple-500 mb-2 hover:scale-105 transition-transform cursor-default">
                {Math.round((technical_evaluation.communication_clarity || 0) * 10)}/10
                  </div>
                  <div className="text-sm font-bold hover:scale-105 transition-transform cursor-default">Communication</div>
                </div>
                <div className="retro-card p-8 text-center hover:scale-[1.02] transition-all">
                  <div className="text-3xl font-bold text-green-500 mb-2 hover:scale-105 transition-transform cursor-default">
                {Math.round((technical_evaluation.problem_solving || 0) * 10)}/10
                  </div>
                  <div className="text-sm font-bold hover:scale-105 transition-transform cursor-default">Problem Solving</div>
                </div>
                  </div>
          </div>

        {questionAnalysis.length > 0 && (
          <div className="mt-8">
            <h3 className="text-2xl font-bold mb-6 hover:scale-105 transition-transform cursor-default">
              Question-by-Question Analysis
            </h3>
            <div className="space-y-8">
              {questionAnalysis.map((item, index) => (
                <div key={index} className="retro-card p-8 hover:scale-[1.02] transition-all">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex-grow">
                      <h4 className="text-xl font-bold mb-2 hover:scale-105 transition-transform cursor-default">
                        Question {index + 1}
                      </h4>
                      <p className="text-lg text-blue-600 mb-4">{item.question}</p>
                      
                      {interviewMode === 'take' && item.reference_question && (
                        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                          <h5 className="font-bold text-blue-800 mb-2">Reference Question:</h5>
                          <p className="text-blue-700 italic">{item.reference_question}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-6 text-center">
                      <div className="text-3xl font-bold text-blue-500 mb-1">
                        {Math.round(item.score * 10)}/10
                      </div>
                      <div className="text-sm text-gray-500">Score</div>
                    </div>
                  </div>

                  <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h5 className="font-bold text-slate-900 dark:text-slate-100 mb-2">
                      Your {interviewMode === 'give' ? 'Answer' : 'Question'}:
                    </h5>
                    <p className="text-slate-800 dark:text-slate-200">{item.answer}</p>
                  </div>

                  <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    <h5 className="font-bold text-indigo-900 dark:text-indigo-100 mb-2">Feedback:</h5>
                    <p className="text-indigo-800 dark:text-indigo-200 leading-relaxed">{item.feedback}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {item.strengths.length > 0 && (
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <h5 className="font-bold text-emerald-900 dark:text-emerald-100 mb-3">Strengths:</h5>
                        <ul className="list-disc list-inside space-y-2">
                          {item.strengths.map((strength, idx) => (
                            <li key={idx} className="text-emerald-800 dark:text-emerald-200">{strength}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.areas_for_improvement.length > 0 && (
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <h5 className="font-bold text-amber-900 dark:text-amber-100 mb-3">Areas for Improvement:</h5>
                        <ul className="list-disc list-inside space-y-2">
                          {item.areas_for_improvement.map((area, idx) => (
                            <li key={idx} className="text-amber-800 dark:text-amber-200">{area}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {item.suggested_improvements.length > 0 && (
                    <div className="mt-6 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
                      <h5 className="font-bold text-violet-900 dark:text-violet-100 mb-3">Suggested Improvements:</h5>
                      <ul className="list-disc list-inside space-y-2">
                        {item.suggested_improvements.map((suggestion, idx) => (
                          <li key={idx} className="text-violet-800 dark:text-violet-200">{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {recommendations && (
        <div>
          <h3 className="text-xl font-bold mb-6 hover:scale-105 transition-transform cursor-default">Recommendations</h3>
          <div className="space-y-8">
              {recommendations.key_action_items && recommendations.key_action_items.length > 0 && (
            <div className="retro-card p-8 hover:scale-[1.02] transition-all">
              <h4 className="text-lg font-bold mb-4 hover:scale-105 transition-transform cursor-default">Key Action Items</h4>
              <ul className="list-disc pl-5 space-y-3">
                    {recommendations.key_action_items.map((item, i) => (
                    <li key={i} className="text-lg leading-relaxed hover:scale-[1.01] transition-transform cursor-default">{item}</li>
                    ))}
              </ul>
            </div>
              )}

              {recommendations.preparation_tips && recommendations.preparation_tips.length > 0 && (
              <div className="retro-card p-8 hover:scale-[1.02] transition-all">
                  <h4 className="text-lg font-bold mb-4 hover:scale-105 transition-transform cursor-default">Preparation Tips</h4>
                <ul className="list-disc pl-5 space-y-3">
                    {recommendations.preparation_tips.map((tip, i) => (
                      <li key={i} className="text-lg leading-relaxed hover:scale-[1.01] transition-transform cursor-default">{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {recommendations.resources && recommendations.resources.length > 0 && (
              <div className="retro-card p-8 hover:scale-[1.02] transition-all">
                <h4 className="text-lg font-bold mb-4 hover:scale-105 transition-transform cursor-default">Recommended Resources</h4>
                <ul className="list-disc pl-5 space-y-3">
                  {recommendations.resources.map((resource, i) => (
                    <li key={i} className="text-lg leading-relaxed hover:scale-[1.01] transition-transform cursor-default">{resource}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-gray-900 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent mb-12 text-center hover:scale-105 transition-transform cursor-default">
          Interview Practice
        </h1>

        {error && (
          <div className="retro-card mb-8 p-6 bg-red-50 dark:bg-red-900/20 hover:scale-[1.02] transition-all">
            <div className="flex items-center text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5 mr-2" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {showSettings ? (
          <div className="retro-card mb-8 p-8 bg-white dark:bg-gray-800 hover:scale-[1.01] transition-all">
            <form onSubmit={(e) => { e.preventDefault(); startInterview(); }}>
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-6 flex items-center text-gray-800 dark:text-gray-100 hover:scale-105 transition-transform cursor-default">
                  <Sparkles className="mr-2" />
                  Choose Your Role
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <button
                    type="button"
                    onClick={() => setInterviewMode('give')}
                    className={`retro-card p-10 text-center transition-all hover:scale-105 ${
                      interviewMode === 'give' 
                        ? 'border-blue-500 bg-gradient-to-b from-blue-500/20 to-blue-500/5 shadow-lg shadow-blue-500/30 scale-105 ring-2 ring-blue-500' 
                        : 'border-gray-200 hover:border-blue-500/50 hover:shadow-xl hover:bg-blue-500/5'
                    }`}
                  >
                    <User className={`w-16 h-16 mb-4 mx-auto transition-colors ${
                      interviewMode === 'give' ? 'text-blue-300' : 'text-blue-500'
                    }`} />
                    <h3 className={`text-xl font-bold mb-3 transition-colors ${
                      interviewMode === 'give' ? 'text-blue-300' : ''
                    }`}>Practice as Interviewee</h3>
                    <p className={`text-sm transition-colors ${
                      interviewMode === 'give' ? 'text-blue-300/80' : 'text-gray-600'
                    }`}>
                      Answer questions and get feedback on your interview performance
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInterviewMode('take')}
                    className={`retro-card p-10 text-center transition-all hover:scale-105 ${
                      interviewMode === 'take' 
                        ? 'border-purple-500 bg-gradient-to-b from-purple-500/20 to-purple-500/5 shadow-lg shadow-purple-500/30 scale-105 ring-2 ring-purple-500' 
                        : 'border-gray-200 hover:border-purple-500/50 hover:shadow-xl hover:bg-purple-500/5'
                    }`}
                  >
                    <Brain className={`w-16 h-16 mb-4 mx-auto transition-colors ${
                      interviewMode === 'take' ? 'text-purple-300' : 'text-purple-500'
                    }`} />
                    <h3 className={`text-xl font-bold mb-3 transition-colors ${
                      interviewMode === 'take' ? 'text-purple-300' : ''
                    }`}>Practice as Interviewer</h3>
                    <p className={`text-sm transition-colors ${
                      interviewMode === 'take' ? 'text-purple-300/80' : 'text-gray-600'
                    }`}>
                      Ask questions and get feedback on your interviewing technique
                    </p>
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="hover:scale-[1.02] transition-all">
                    <label className="block text-sm font-bold mb-2">Topic</label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="retro-input w-full hover:border-blue-500/50 focus:border-blue-500 transition-colors"
                      placeholder={interviewMode === 'give' ? "e.g., React Development" : "e.g., Frontend Development"}
                    />
                  </div>

                  <div className="hover:scale-[1.02] transition-all">
                    <label className="block text-sm font-bold mb-2">
                      {interviewMode === 'give' ? 'Your Role' : 'Interviewing For'}
                    </label>
                    <input
                      type="text"
                      value={interviewee}
                      onChange={(e) => setInterviewee(e.target.value)}
                      className="retro-input w-full hover:border-blue-500/50 focus:border-blue-500 transition-colors"
                      placeholder="e.g., Senior Software Engineer"
                    />
                  </div>
                </div>

                <div className="mt-8 hover:scale-[1.02] transition-all">
                  <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-200">Interview Type</label>
                  <select 
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="retro-input w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:border-blue-500/50 focus:border-blue-500 transition-colors"
                  >
                    <option value="technical">Technical</option>
                    <option value="behavioral">Behavioral</option>
                    <option value="system_design">System Design</option>
                    <option value="leadership">Leadership</option>
                  </select>
                </div>

                <div className="mt-8 hover:scale-[1.02] transition-all">
                  <label className="block text-sm font-bold mb-2 text-gray-700">Number of Questions</label>
                  <select 
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                    className="retro-input w-full bg-white hover:border-blue-500/50 focus:border-blue-500 transition-colors"
                  >
                    <option value={3}>3 Questions</option>
                    <option value={5}>5 Questions</option>
                    <option value={7}>7 Questions</option>
                    <option value={10}>10 Questions</option>
                  </select>
                </div>

                <div className="text-center mt-10">
                  <button 
                    type="submit"
                    disabled={isLoading || !topic || !interviewee}
                    className="retro-button px-12 py-3 text-lg hover:scale-105 transition-transform disabled:hover:scale-100"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Generating Questions...
                      </div>
                    ) : (
                      <>
                        <Sparkles className="inline mr-2" />
                        Start Interview
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-8">
            {showInterview && !showAnalysis && (
              <div className="space-y-8">
                <div className="retro-card p-8 hover:scale-[1.02] transition-all">
                  <h2 className="text-2xl font-bold mb-6 flex items-center hover:scale-105 transition-transform cursor-default">
                    <Sparkles className="mr-2" />
                    {interviewMode === 'give' 
                      ? `Question ${session?.answers.length + 1 || 1} of ${session?.totalQuestions || 0}`
                      : `Ask Question ${session?.recordedQuestions.length + 1 || 1} of ${session?.totalQuestions || 0}`
                    }
                  </h2>
                  
                  {/* Display current question or interviewer guidance */}
                  {interviewMode === 'give' ? (
                    <p className="text-lg leading-relaxed hover:scale-[1.01] transition-transform cursor-default">
                      {session?.currentQuestion?.question || "No question available"}
                    </p>
                  ) : (
                    <div className="space-y-6">
                      <div className="retro-card p-6 bg-gradient-to-b from-purple-500/10 to-purple-500/5">
                        <h4 className="text-lg font-bold mb-4 hover:scale-105 transition-transform cursor-default">
                          <Sparkles className="inline mr-2" />
                          Interviewer Guidance
                        </h4>
                        <p className="text-lg leading-relaxed mb-4 hover:scale-[1.01] transition-transform cursor-default">
                          Ask a question that will help evaluate the candidate for the {topic} position. Consider their experience level and the role requirements.
                        </p>
                      </div>

                      {session?.currentQuestion && (
                        <div className="retro-card p-6 bg-gradient-to-b from-blue-500/10 to-blue-500/5">
                          <h4 className="text-lg font-bold mb-4 hover:scale-105 transition-transform cursor-default">
                            <Brain className="inline mr-2" />
                            Example Question & Guidelines
                          </h4>
                          <div className="space-y-4">
                            <div>
                              <h5 className="font-semibold mb-2">Sample Question:</h5>
                              <p className="text-lg italic text-blue-600">{session.currentQuestion.question}</p>
                            </div>

                            {session.currentQuestion.purpose && (
                              <div>
                                <h5 className="font-semibold mb-2">Purpose:</h5>
                                <p className="text-gray-600">{session.currentQuestion.purpose}</p>
                              </div>
                            )}

                            {session.currentQuestion.follow_ups && session.currentQuestion.follow_ups.length > 0 && (
                              <div>
                                <h5 className="font-semibold mb-2">Suggested Follow-ups:</h5>
                                <ul className="list-disc list-inside space-y-2">
                                  {session.currentQuestion.follow_ups.map((followUp, idx) => (
                                    <li key={idx} className="text-gray-600 ml-4">{followUp}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="retro-card p-6 bg-gradient-to-b from-green-500/10 to-green-500/5">
                        <h4 className="text-lg font-bold mb-4 hover:scale-105 transition-transform cursor-default">
                          <MessageSquare className="inline mr-2" />
                          Tips for Effective Questioning
                        </h4>
                        <ul className="list-disc list-inside space-y-2">
                          <li className="text-gray-600">Use open-ended questions to encourage detailed responses</li>
                          <li className="text-gray-600">Listen actively and prepare relevant follow-up questions</li>
                          <li className="text-gray-600">Focus on both technical skills and behavioral aspects</li>
                          <li className="text-gray-600">Allow the candidate time to think and respond fully</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                <div className="retro-card p-8 hover:scale-[1.02] transition-all">
                  <h3 className="text-2xl font-bold mb-6 flex items-center text-gray-800 hover:scale-105 transition-transform cursor-default">
                    <MessageSquare className="mr-2" />
                    {interviewMode === 'give' ? 'Your Answer' : 'Your Question'}
                  </h3>
                  
                  <div className="mb-8">
                    <div className="text-center mb-8">
                      {isRecording ? (
                        <button
                          onClick={stopRecording}
                          className="retro-button-danger px-12 py-3 text-lg hover:scale-105 transition-transform"
                        >
                          <StopCircle className="h-5 w-5 mr-2" />
                          Stop Recording
                        </button>
                      ) : (
                        <button
                          onClick={startRecording}
                          className="retro-button px-12 py-3 text-lg hover:scale-105 transition-transform"
                        >
                          <Mic className="h-5 w-5 mr-2" />
                          Start Recording
                        </button>
                      )}
                    </div>

                    <textarea
                      value={currentAnswer}
                      onChange={(e) => setCurrentAnswer(e.target.value)}
                      placeholder={interviewMode === 'give' 
                        ? "Your answer will appear here as you speak..."
                        : "Your question will appear here as you speak..."
                      }
                      className="retro-input w-full h-48 text-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-white hover:border-blue-500/50 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  {currentAnswer && !isRecording && renderNextButton()}
                </div>
              </div>
            )}

            {showAnalysis && (
              <div className="retro-card p-8 hover:scale-[1.02] transition-all">
                <h2 className="text-2xl font-bold mb-6 flex items-center hover:scale-105 transition-transform cursor-default">
                  <Sparkles className="mr-2" />
                  Interview Analysis
                </h2>
                {!session?.analysis ? (
                  <>
                    <p className="text-lg mb-8 leading-relaxed hover:scale-[1.01] transition-transform cursor-default">
                      {interviewMode === 'give'
                        ? 'You have completed all questions. Click below to analyze your responses.'
                        : 'Click below to analyze your interviewing technique and questions.'
                      }
                    </p>
                    <div className="text-center">
                      <button
                        onClick={handleAnalyzeInterview}
                        disabled={isLoading}
                        className="retro-button px-12 py-3 text-lg hover:scale-105 transition-transform disabled:hover:scale-100"
                      >
                        {isLoading ? (
                          <div className="flex items-center justify-center">
                            <Loader2 className="animate-spin mr-2 h-5 w-5" />
                            Analyzing...
                          </div>
                        ) : (
                          <>
                            <Sparkles className="inline mr-2" />
                            Analyze Interview
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  renderAnalysisResults()
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewPractice;