import React, { useState } from 'react';
import { Play, Pause, RefreshCw, ThumbsUp, Brain, Volume2 } from 'lucide-react';

const InterviewPractice = () => {
  const [mode, setMode] = useState('casual');
  const [interviewee, setInterviewee] = useState('influencer');
  const [isRecording, setIsRecording] = useState(false);

  const handleStartRecording = () => {
    setIsRecording(!isRecording);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl text-white mb-8 text-center">Interview Practice</h1>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="retro-card">
          <h3 className="text-xl font-bold mb-4">Interview Mode</h3>
          <select 
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="retro-input w-full"
          >
            <option value="casual">Casual</option>
            <option value="formal">Formal</option>
            <option value="investigative">Investigative</option>
          </select>
        </div>

        <div className="retro-card">
          <h3 className="text-xl font-bold mb-4">Interviewee Type</h3>
          <select 
            value={interviewee}
            onChange={(e) => setInterviewee(e.target.value)}
            className="retro-input w-full"
          >
            <option value="influencer">Influencer</option>
            <option value="ceo">CEO</option>
            <option value="politician">Politician</option>
            <option value="journalist">Journalist</option>
          </select>
        </div>
      </div>

      <div className="retro-card mb-8">
        <div className="text-center">
          <button 
            className={`retro-button ${isRecording ? 'bg-pink-500' : ''}`}
            onClick={handleStartRecording}
          >
            {isRecording ? (
              <><Pause className="inline mr-2" /> Stop Recording</>
            ) : (
              <><Play className="inline mr-2" /> Start Recording</>
            )}
          </button>
        </div>
      </div>

      {isRecording && (
        <div className="grid md:grid-cols-3 gap-6">
          <FeedbackCard
            icon={<Volume2 className="text-blue-500" />}
            title="Clarity"
            score={85}
          />
          <FeedbackCard
            icon={<Brain className="text-pink-500" />}
            title="Engagement"
            score={92}
          />
          <FeedbackCard
            icon={<ThumbsUp className="text-yellow-400" />}
            title="Professionalism"
            score={78}
          />
        </div>
      )}
    </div>
  );
};

const FeedbackCard = ({ 
  icon, 
  title, 
  score 
}: { 
  icon: React.ReactNode; 
  title: string; 
  score: number;
}) => (
  <div className="retro-card">
    <div className="flex items-center justify-between mb-4">
      {icon}
      <h3 className="text-lg font-bold">{title}</h3>
    </div>
    <div className="text-center">
      <div className="text-4xl font-bold mb-2">{score}%</div>
      <div className="w-full bg-gray-200 rounded-full h-4">
        <div 
          className="bg-blue-500 rounded-full h-4 transition-all duration-500"
          style={{ width: `${score}%` }}
        ></div>
      </div>
    </div>
  </div>
);

export default InterviewPractice;