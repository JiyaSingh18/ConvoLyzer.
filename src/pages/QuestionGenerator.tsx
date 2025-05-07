import React, { useState } from 'react';
import axios from 'axios';
import { HelpCircle, Send, Loader, MessageSquare, Target, Clock, AlertTriangle, CheckCircle2, ChevronDown, BrainCircuit } from 'lucide-react';

interface Question {
  question: string;
  purpose: string;
  follow_ups: string[];
}

interface InterviewQuestions {
  interview_questions: {
    opening_questions: Question[];
    core_questions: Question[];
    closing_questions: Question[];
  };
  interview_strategy: {
    recommended_duration: string;
    key_areas_to_probe: string[];
    potential_challenges: string[];
    success_indicators: string[];
  };
}

const QuestionGenerator = () => {
  const [topic, setTopic] = useState('');
  const [interviewee, setInterviewee] = useState('');
  const [context, setContext] = useState('');
  const [mode, setMode] = useState('technical');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestions | null>(null);
  const [activeSection, setActiveSection] = useState<'opening' | 'core' | 'closing' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setQuestions(null);

    try {
      const response = await axios.post('http://localhost:4000/api/generate-questions', {
        topic,
        context,
        interviewee,
        mode,
        numQuestions: 3 // Explicitly request 3 questions per section
      }, {
        headers: {
          'X-Request-Source': 'question-generator' // Add a custom header to identify this request
        }
      });

      if (!response.data || !response.data.interview_questions) {
        throw new Error('Invalid response format from server');
      }

      // Create a complete question set with fallbacks if needed
      const { interview_questions = {}, interview_strategy = {} } = response.data;
      
      // Create default questions if any section is missing
      const defaultQuestion = {
        question: `Tell me about your experience with ${topic}.`,
        purpose: "To understand the candidate's background and experience.",
        follow_ups: ["Can you provide specific examples?", "What challenges did you face?"]
      };
      
      // Ensure we have all question sections with at least one question
      const completeQuestions = {
        interview_questions: {
          opening_questions: Array.isArray(interview_questions.opening_questions) && interview_questions.opening_questions.length > 0 
            ? interview_questions.opening_questions 
            : [defaultQuestion, 
               { 
                 question: `What interests you about ${topic}?`, 
                 purpose: "To gauge the candidate's motivation and interest.", 
                 follow_ups: ["Why is this important to you?", "How does this align with your career goals?"] 
               }],
          
          core_questions: Array.isArray(interview_questions.core_questions) && interview_questions.core_questions.length > 0 
            ? interview_questions.core_questions 
            : [{ 
                question: `What's the most challenging ${topic} problem you've solved?`, 
                purpose: "To assess problem-solving abilities.", 
                follow_ups: ["How did you approach it?", "What was the outcome?"] 
              },
              { 
                question: `How do you stay updated with the latest developments in ${topic}?`, 
                purpose: "To evaluate continuous learning mindset.", 
                follow_ups: ["What resources do you use?", "What's a recent development that excited you?"] 
              }],
          
          closing_questions: Array.isArray(interview_questions.closing_questions) && interview_questions.closing_questions.length > 0 
            ? interview_questions.closing_questions 
            : [{ 
                question: "Do you have any questions about the role or our organization?", 
                purpose: "To assess the candidate's interest and preparation.", 
                follow_ups: ["What are you looking for in your next role?", "Where do you see yourself in 5 years?"] 
              }]
        },
        interview_strategy: {
          recommended_duration: interview_strategy.recommended_duration || "45-60 minutes",
          key_areas_to_probe: Array.isArray(interview_strategy.key_areas_to_probe) && interview_strategy.key_areas_to_probe.length > 0 
            ? interview_strategy.key_areas_to_probe 
            : [`Experience with ${topic}`, "Problem-solving approach", "Technical depth"],
          potential_challenges: Array.isArray(interview_strategy.potential_challenges) && interview_strategy.potential_challenges.length > 0 
            ? interview_strategy.potential_challenges 
            : ["Assessing depth of knowledge", "Evaluating practical experience", "Time management"],
          success_indicators: Array.isArray(interview_strategy.success_indicators) && interview_strategy.success_indicators.length > 0 
            ? interview_strategy.success_indicators 
            : ["Clear communication", "Structured thinking", "Relevant examples"]
        }
      };

      setQuestions(completeQuestions);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to generate questions';
      setError(errorMessage);
      console.error('Error generating questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const QuestionSection = ({ title, questions, type }: { title: string; questions: Question[]; type: 'opening' | 'core' | 'closing' }) => (
    <div className="retro-card mb-8 transition-all duration-300">
      <button 
        onClick={() => setActiveSection(activeSection === type ? null : type)}
        className="w-full flex items-center justify-between p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300"
      >
        <div className="flex items-center">
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 dark:from-blue-500/10 dark:to-purple-500/10 mr-4">
            {type === 'opening' && <MessageSquare className="text-blue-500" size={32} />}
            {type === 'core' && <Target className="text-purple-500" size={32} />}
            {type === 'closing' && <CheckCircle2 className="text-indigo-500" size={32} />}
          </div>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{title}</h3>
        </div>
        <ChevronDown className={`transform transition-transform duration-300 ${activeSection === type ? 'rotate-180' : ''}`} />
      </button>
      
      <div className={`mt-4 space-y-4 transition-all duration-500 ${activeSection === type ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
        {questions.map((q, index) => (
          <div key={index} className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">{q.question}</p>
            <div className="flex items-start space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
              <HelpCircle size={16} className="mt-1 flex-shrink-0" />
              <p>{q.purpose}</p>
            </div>
            {q.follow_ups.length > 0 && (
              <div className="mt-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-xl p-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Follow-up questions:</p>
                <ul className="space-y-2">
                  {q.follow_ups.map((followUp, idx) => (
                    <li key={idx} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></div>
                      {followUp}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <h1 className="text-5xl font-bold mb-8 text-center bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text dark:from-blue-400 dark:to-purple-400 transition-all duration-300 hover:scale-105">
          Interview Question Generator
        </h1>

        <div className="retro-card mb-8 transform hover:scale-[1.02] transition-all duration-300 bg-white dark:bg-gray-800 shadow-xl rounded-2xl overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label htmlFor="topic" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Interview Topic
                </label>
              <input
                  id="topic"
                type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  placeholder="e.g., Software Development Career Path"
                  required
              />
            </div>

              <div>
                <label htmlFor="mode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Interview Mode
                </label>
                <select
                  id="mode"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  required
                >
                  <option value="technical">Technical Interview</option>
                  <option value="behavioral">Behavioral Interview</option>
                  <option value="system_design">System Design Interview</option>
                  <option value="leadership">Leadership Interview</option>
                  <option value="cultural">Cultural Fit Interview</option>
                  <option value="case_study">Case Study Interview</option>
                </select>
              </div>

            <div>
                <label htmlFor="interviewee" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Who are you interviewing?
                </label>
              <input
                  id="interviewee"
                type="text"
                  value={interviewee}
                  onChange={(e) => setInterviewee(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  placeholder="e.g., Senior Software Engineer with 10 years of experience"
                  required
                />
              </div>

              <div>
                <label htmlFor="context" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Additional Context
                </label>
                <textarea
                  id="context"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 h-[calc(100%-2rem)]"
                  placeholder="Provide additional context about the interview (e.g., focus on leadership experience, technical skills, or specific projects)"
                  required
              />
            </div>
          </div>
          
            <button
              type="submit"
              disabled={loading}
              className="retro-button w-full py-4 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  <span>Generating Questions...</span>
                </>
              ) : (
                <>
                  <Send size={20} />
                  <span>Generate Questions</span>
                </>
              )}
            </button>
        </form>
      </div>

        {error && (
          <div className="retro-card border-red-500 mb-8 bg-red-50 dark:bg-red-900/20 p-6 rounded-xl">
            <p className="text-red-500 font-medium flex items-start">
              <AlertTriangle className="flex-shrink-0 mr-3 mt-1" />
              {error}
            </p>
          </div>
        )}

        {questions && (
          <div className="space-y-8">
            <div className="retro-card bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8">
              <h2 className="text-3xl font-bold mb-6 flex items-center text-gray-800 dark:text-gray-200">
                <Clock className="mr-3 text-blue-500" />
                Interview Strategy
          </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl">
                  <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">Recommended Duration</p>
                  <p className="text-gray-600 dark:text-gray-400">{questions.interview_strategy.recommended_duration}</p>
                </div>
                <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
                  <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">Key Areas to Probe</p>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                    {questions.interview_strategy.key_areas_to_probe.map((area, index) => (
                      <li key={index}>{area}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl">
                  <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">Potential Challenges</p>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                    {questions.interview_strategy.potential_challenges.map((challenge, index) => (
                      <li key={index}>{challenge}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-6 bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-xl">
                  <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">Success Indicators</p>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                    {questions.interview_strategy.success_indicators.map((indicator, index) => (
                      <li key={index}>{indicator}</li>
            ))}
          </ul>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <QuestionSection 
                title="Opening Questions" 
                questions={questions.interview_questions.opening_questions}
                type="opening"
              />
              <QuestionSection 
                title="Core Questions" 
                questions={questions.interview_questions.core_questions}
                type="core"
              />
              <QuestionSection 
                title="Closing Questions" 
                questions={questions.interview_questions.closing_questions}
                type="closing"
              />
            </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default QuestionGenerator;