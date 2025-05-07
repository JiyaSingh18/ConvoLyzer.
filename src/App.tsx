import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home, BarChart3, BookOpen, Settings, Mic, FileQuestion, UserSquare2 } from 'lucide-react';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import ConversationAnalyser from './pages/ConversationAnalyser';
import InterviewPractice from './pages/InterviewPractice';
import QuestionGenerator from './pages/QuestionGenerator';
import Dashboard from './pages/Dashboard';
import Resources from './pages/Resources';
import SettingsPage from './pages/Settings';
import { SettingsProvider } from './contexts/SettingsContext';

function App() {
  return (
    <SettingsProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-blue-500 via-pink-500 to-yellow-400 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
          <Navbar />
          <div className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/analyser" element={<ConversationAnalyser />} />
              <Route path="/practice" element={<InterviewPractice />} />
              <Route path="/generator" element={<QuestionGenerator />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </div>
      </Router>
    </SettingsProvider>
  );
}

export default App;