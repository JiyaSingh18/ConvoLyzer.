import React from 'react';
import { Link } from 'react-router-dom';
import { Mic, UserSquare2, FileQuestion, Youtube, Users, Briefcase, Radio, Presentation, Brain } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen text-center py-12">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="mb-8">
          <h1 className="text-8xl font-bold relative">
            <span className="relative z-10 text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
              CONVO
            </span>
            <span className="relative z-10 text-retro-yellow drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] border-b-4 border-retro-yellow">
              LYZER
            </span>
          </h1>
        </div>
        
        <p className="text-2xl text-white mb-12 max-w-2xl mx-auto text-center font-bold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
          Your ultimate conversation analysis companion powered by advanced AI
        </p>

        {/* Main features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-12">
          <FeatureCard
            to="/analyser"
            icon={<div className="animate-pulse"><Mic size={48} className="animate-bounce" /></div>}
            title="Conversation Analyser"
            description="Upload and analyze conversations with advanced AI"
          />
          <FeatureCard
            to="/practice"
            icon={<div className="animate-pulse"><UserSquare2 size={48} className="animate-bounce delay-150" /></div>}
            title="Interview Practice"
            description="Practice your interviewing skills with AI feedback"
          />
          <FeatureCard
            to="/generator"
            icon={<div className="animate-pulse"><FileQuestion size={48} className="animate-bounce delay-300" /></div>}
            title="Question Generator"
            description="Generate smart interview questions instantly"
          />
        </div>

        {/* Use cases section */}
        <div className="mt-54 mb-16">
          <h2 className="text-4xl font-bold mb-8 text-center text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pt-16">
            Perfect For
          </h2>
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">
            <UseCase icon={<Youtube className="animate-pulse" />} title="YouTube Content" />
            <UseCase icon={<Users className="animate-pulse delay-75" />} title="Interviews" />
            <UseCase icon={<Radio className="animate-pulse delay-150" />} title="Podcasts" />
            <UseCase icon={<Presentation className="animate-pulse delay-225" />} title="Presentations" />
            <UseCase icon={<Briefcase className="animate-pulse delay-300" />} title="Job Practice" />
            <UseCase icon={<Brain className="animate-pulse delay-375" />} title="Self Analysis" />
          </div>
        </div>

        {/* Call to action */}
        <div className="mt-16 text-center">
          <Link
            to="/analyser"
            className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-4 rounded-full text-xl font-bold hover:scale-105 transition-transform duration-300 shadow-lg hover:shadow-xl"
          >
            Start Analyzing Now
          </Link>
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
    className="retro-card bg-white dark:bg-gray-800 p-8 transform hover:scale-[1.02] transition-all duration-300"
  >
    <div className="text-pink-500 dark:text-pink-400 mb-6 group-hover:scale-110 transition-transform duration-300">
      {icon}
    </div>
    <h3 className="text-2xl font-bold mb-3 text-gray-800 dark:text-gray-200">{title}</h3>
    <p className="text-gray-600 dark:text-gray-300">{description}</p>
  </Link>
);

const UseCase = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div className="retro-card bg-white dark:bg-gray-800 p-5 transform hover:scale-[1.02] transition-all duration-300 flex flex-col items-center">
    <div className="text-pink-500 dark:text-pink-400 mb-3 group-hover:scale-110 transition-transform duration-300">
      {icon}
    </div>
    <span className="text-gray-800 dark:text-gray-200 text-sm font-semibold">{title}</span>
  </div>
);

export default LandingPage;