import React from 'react';
import { Link } from 'react-router-dom';
import { Mic, UserSquare2, FileQuestion, Music, Zap, Disc } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="text-center py-12 relative overflow-hidden">
      {/* 90s-inspired background elements */}
      <div className="absolute inset-0 z-0">
        <Zap className="absolute top-10 left-10 text-yellow-400 w-16 h-16 transform rotate-12" />
        <Music className="absolute top-20 right-20 text-pink-500 w-12 h-12 animate-bounce" />
        <Disc className="absolute bottom-20 left-20 text-blue-500 w-14 h-14 animate-spin-slow" />
        <Zap className="absolute bottom-10 right-10 text-yellow-400 w-16 h-16 transform -rotate-12" />
      </div>

      <div className="relative z-10">
        <h1 className="text-8xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-pink-500 to-yellow-400 animate-pulse">
          CONVO<span className="text-black">LYZER</span>
        </h1>
        
        <p className="text-2xl text-white mb-12 max-w-2xl mx-auto">
          Your ultimate interview companion with AI-powered analysis and practice tools
        </p>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-12 px-4">
          <FeatureCard
            to="/analyser"
            icon={<Mic size={48} />}
            title="Conversation Analyser"
            description="Upload and analyze conversations with advanced AI"
          />
          <FeatureCard
            to="/practice"
            icon={<UserSquare2 size={48} />}
            title="Interview Practice"
            description="Practice your interviewing skills with AI feedback"
          />
          <FeatureCard
            to="/generator"
            icon={<FileQuestion size={48} />}
            title="Question Generator"
            description="Generate smart interview questions instantly"
          />
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ to, icon, title, description }: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <Link
    to={to}
    className="bg-white p-8 rounded-lg shadow-xl transform hover:-translate-y-2 transition-all duration-300 group border-4 border-black hover:border-pink-500"
  >
    <div className="text-blue-500 mb-4 group-hover:scale-110 transition-transform duration-300">
      {icon}
    </div>
    <h3 className="text-2xl font-bold mb-2 text-black font-['Press_Start_2P']">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </Link>
);

export default LandingPage;