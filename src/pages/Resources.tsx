import React from 'react';
import { BookOpen, Video, Headphones, ExternalLink } from 'lucide-react';

const Resources = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl text-white mb-8 text-center">Resources</h1>

      <div className="space-y-8">
        <ResourceSection
          icon={<BookOpen className="text-blue-500" size={32} />}
          title="Interview Guides"
          resources={[
            {
              title: "The Art of Interviewing",
              description: "Master the fundamentals of conducting great interviews",
              link: "#"
            },
            {
              title: "Question Techniques",
              description: "Learn how to ask effective follow-up questions",
              link: "#"
            },
            {
              title: "Body Language Guide",
              description: "Understanding non-verbal communication",
              link: "#"
            }
          ]}
        />

        <ResourceSection
          icon={<Video className="text-pink-500" size={32} />}
          title="Video Tutorials"
          resources={[
            {
              title: "Interview Preparation",
              description: "Step-by-step guide to preparing for interviews",
              link: "#"
            },
            {
              title: "Advanced Techniques",
              description: "Professional interviewing strategies",
              link: "#"
            },
            {
              title: "Common Pitfalls",
              description: "Mistakes to avoid during interviews",
              link: "#"
            }
          ]}
        />

        <ResourceSection
          icon={<Headphones className="text-yellow-400" size={32} />}
          title="Recommended Podcasts"
          resources={[
            {
              title: "The Interview Master",
              description: "Weekly tips from professional interviewers",
              link: "#"
            },
            {
              title: "Communication Skills 101",
              description: "Improve your speaking and listening abilities",
              link: "#"
            },
            {
              title: "Industry Insights",
              description: "Learn from experienced professionals",
              link: "#"
            }
          ]}
        />

        <div className="mt-8 text-center">
          <div className="retro-card inline-block px-6 py-3">
            <p className="text-lg font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent animate-pulse">
              More Learning Resources Coming Soon!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ResourceSection = ({ 
  icon, 
  title, 
  resources 
}: { 
  icon: React.ReactNode; 
  title: string; 
  resources: Array<{
    title: string;
    description: string;
    link: string;
  }>;
}) => (
  <div className="retro-card">
    <div className="flex items-center mb-6">
      {icon}
      <h2 className="ml-2 text-2xl font-bold">{title}</h2>
    </div>
    <div className="grid md:grid-cols-3 gap-6">
      {resources.map((resource, index) => (
        <a
          key={index}
          href={resource.link}
          className="block p-4 border-4 border-black rounded-lg hover:bg-gray-50 transition-colors"
        >
          <h3 className="font-bold mb-2 flex items-center">
            {resource.title}
            <ExternalLink className="ml-1" size={16} />
          </h3>
          <p className="text-sm text-gray-600">{resource.description}</p>
        </a>
      ))}
    </div>
  </div>
);

export default Resources;