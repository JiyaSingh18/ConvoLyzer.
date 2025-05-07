import React, { useState } from 'react';
import { Send, Sparkles, MessageSquare } from 'lucide-react';

const QuestionGenerator = () => {
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    type: 'casual'
  });
  const [questions, setQuestions] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate AI generation
    const demoQuestions = [
      "What inspired you to start your career in this industry?",
      "How do you see the industry evolving in the next 5 years?",
      "Can you describe a challenging situation you've overcome?",
      "What's your approach to innovation and staying competitive?",
      "How do you maintain work-life balance in your role?"
    ];
    setQuestions(demoQuestions);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl text-white mb-8 text-center">Question Generator</h1>

      <div className="retro-card mb-8">
        <form onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold mb-2">Interviewee Name</label>
              <input
                type="text"
                className="retro-input w-full"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Industry/Topic</label>
              <input
                type="text"
                className="retro-input w-full"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="Technology"
              />
            </div>
          </div>
          
          <div className="mt-6">
            <label className="block text-sm font-bold mb-2">Interview Type</label>
            <select
              className="retro-input w-full"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="casual">Casual</option>
              <option value="formal">Formal</option>
              <option value="investigative">Investigative</option>
            </select>
          </div>

          <div className="text-center mt-6">
            <button type="submit" className="retro-button">
              <Sparkles className="inline mr-2" />
              Generate Questions
            </button>
          </div>
        </form>
      </div>

      {questions.length > 0 && (
        <div className="retro-card">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <MessageSquare className="mr-2" />
            Generated Questions
          </h2>
          <ul className="space-y-4">
            {questions.map((question, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-500 mr-2">{index + 1}.</span>
                <p>{question}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default QuestionGenerator;