import React, { useState } from 'react';
import { Upload, Download, Heart, User, Key, BarChart } from 'lucide-react';

const ConversationAnalyser = () => {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setAnalyzing(true);
      // Simulate analysis
      setTimeout(() => setAnalyzing(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl text-white mb-8 text-center">Conversation Analyser</h1>
      
      <div className="retro-card mb-8">
        <div className="text-center p-8 border-4 border-dashed border-black rounded-lg">
          <Upload size={48} className="mx-auto mb-4 text-blue-500" />
          <input
            type="file"
            accept=".mp3,.wav"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="retro-button cursor-pointer inline-block">
            Upload Audio File
          </label>
          <p className="mt-2 text-gray-600">Supports MP3 and WAV formats</p>
        </div>
      </div>

      {file && (
        <div className="grid grid-cols-2 gap-6">
          <AnalysisCard
            icon={<Heart className="text-pink-500" />}
            title="Sentiment Analysis"
            loading={analyzing}
            content="Positive: 70% | Neutral: 20% | Negative: 10%"
          />
          <AnalysisCard
            icon={<User className="text-blue-500" />}
            title="Speaker Identification"
            loading={analyzing}
            content="Speaker A: 60% | Speaker B: 40%"
          />
          <AnalysisCard
            icon={<Key className="text-yellow-400" />}
            title="Keywords"
            loading={analyzing}
            content="innovation, technology, future, development"
          />
          <AnalysisCard
            icon={<BarChart className="text-purple-500" />}
            title="Statistics"
            loading={analyzing}
            content="Duration: 5:30 | Words: 824 | Pace: Normal"
          />
        </div>
      )}

      {file && !analyzing && (
        <div className="text-center mt-8">
          <button className="retro-button flex items-center mx-auto">
            <Download className="mr-2" />
            Download Report
          </button>
        </div>
      )}
    </div>
  );
};

const AnalysisCard = ({ 
  icon, 
  title, 
  loading, 
  content 
}: { 
  icon: React.ReactNode; 
  title: string; 
  loading: boolean; 
  content: string;
}) => (
  <div className="retro-card">
    <div className="flex items-center mb-4">
      {icon}
      <h3 className="ml-2 text-lg font-bold">{title}</h3>
    </div>
    <div className="min-h-[100px] flex items-center justify-center">
      {loading ? (
        <div className="animate-pulse-fast text-gray-400">Analyzing...</div>
      ) : (
        <p className="text-gray-800">{content}</p>
      )}
    </div>
  </div>
);

export default ConversationAnalyser;