import React, { useState } from 'react';
import { Upload, Download, Heart, User, Key, BarChart, MessageCircle, Brain, Lightbulb, Loader2, FileText } from 'lucide-react';
import { audioAnalysisService } from '../services/AudioAnalysisService';
import { whisperService } from '../services/WhisperService';
import type { Recommendation, Strength } from '../services/AudioAnalysisService';

interface TranscriptionChunk {
  text: string;
  start: number;
  end: number;
}

interface TranscriptionResult {
  text: string;
  chunks: TranscriptionChunk[];
}

interface EmotionAnalysis {
  emotions: Record<string, number>;
}

interface SpeakerAnalysis {
  emotions: EmotionAnalysis;
}

interface SentimentAnalysis {
  overall: {
    score: number;
    magnitude: number;
  };
  by_speaker: Record<string, SpeakerAnalysis>;
}

interface ContentAnalysis {
  main_topics: Array<{ topic: string }>;
  key_insights: Array<{ insight: string }>;
}

interface AnalysisResult {
  transcription: string;
  words: Array<{ word: string; timestamp: number }>;
  analysis: {
    sentiment: SentimentAnalysis;
    content_analysis: ContentAnalysis;
    expertise_indicators: {
      domain_knowledge: {
        score: number;
        areas: string[];
      };
    };
    speakers: Array<{
      characteristics: {
        speaking_style: string;
      };
      language: {
        communication_clarity: number;
      };
      metrics: {
        questions_asked: number;
        filler_words_frequency: number;
      };
    }>;
    summary: {
      detailed: string;
    };
    recommendations: {
      areas_for_improvement: Recommendation[];
      notable_strengths: Strength[];
    };
  };
}

const ConversationAnalyser = () => {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    try {
      setFile(uploadedFile);
      setTranscribing(true);
      setAnalyzing(false);
      setError(null);
      setProgress('Analyzing your conversation...');

      // Transcribe the audio
      console.log("Starting transcription process...");
      const transcriptionResult = await whisperService.transcribeAudio(uploadedFile);
      console.log("Transcription completed:", transcriptionResult);

      if (!transcriptionResult.text) {
        throw new Error("Transcription failed: No text was generated");
      }

      setProgress('Analyzing your conversation...');
      setTranscribing(false);
      setAnalyzing(true);

      // Analyze the transcription
      try {
        const analysisResult = await audioAnalysisService.analyzeTranscription(transcriptionResult.text);
        setResult({
          transcription: transcriptionResult.text,
          analysis: analysisResult
        });
      } catch (analysisError) {
        console.error("Analysis error:", analysisError);
        setError(`Analysis failed: ${analysisError instanceof Error ? analysisError.message : 'Unknown error'}`);
      } finally {
        setAnalyzing(false);
        setProgress('');
      }
    } catch (error) {
      console.error("Transcription error:", error);
      setError(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTranscribing(false);
      setAnalyzing(false);
      setProgress('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <h1 className="text-5xl font-bold mb-8 text-center bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text dark:from-blue-400 dark:to-purple-400 transition-all duration-300 hover:scale-105">
          Conversation Analyser
        </h1>
        
        <div className="retro-card mb-8 transform hover:scale-[1.02] transition-all duration-300 bg-white dark:bg-gray-800 shadow-xl rounded-2xl overflow-hidden">
          <div className="text-center p-12 border-4 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
            <Upload size={64} className="mx-auto mb-6 text-blue-500 animate-bounce" />
            <input
              type="file"
              accept="audio/mp3,audio/wav,audio/mpeg"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
              disabled={transcribing || analyzing}
            />
            <label 
              htmlFor="file-upload" 
              className={`retro-button cursor-pointer inline-block px-8 py-4 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl ${(transcribing || analyzing) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {transcribing || analyzing ? 'Processing...' : 'Upload Audio File'}
            </label>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Supports MP3 and WAV formats (max 25MB)</p>
            {(transcribing || analyzing) && (
              <div className="mt-6 text-accent text-lg font-medium flex items-center justify-center space-x-3">
                <Loader2 className="animate-spin" />
                <span>Analyzing your conversation...</span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="retro-card border-red-500 mb-8 bg-red-50 dark:bg-red-900/20 p-6 rounded-xl">
            <p className="text-red-500 font-medium">{error}</p>
          </div>
        )}

        {file && result && (
          <div className="space-y-8">
            <div className="retro-card bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 transform hover:scale-[1.01] transition-all duration-300">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center">
                <FileText className="mr-2" /> 
                Transcription
              </h2>
              <div className="max-h-[600px] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4">
                <p className="whitespace-pre-wrap text-lg text-gray-700 dark:text-gray-300 leading-relaxed">{result.transcription}</p>
              </div>
              {result.words && result.words.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Word Timeline</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.words.map((word, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200"
                        title={`${(word.timestamp / 1000).toFixed(2)}s`}
                      >
                        {word.word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <AnalysisCard
                icon={<Heart className="text-pink-500" size={32} />}
                title="Sentiment Analysis"
                loading={analyzing}
                content={`Score: ${(result.analysis?.sentiment?.overall?.score * 100 || 0).toFixed(1)}% | Magnitude: ${(result.analysis?.sentiment?.overall?.magnitude * 100 || 0).toFixed(1)}%`}
                gradient="from-pink-500/20 to-red-500/20"
              />
              <AnalysisCard
                icon={<Brain className="text-purple-500" size={32} />}
                title="Emotions"
                loading={analyzing}
                content={result.analysis?.sentiment?.by_speaker ? 
                  Object.entries(Object.values(result.analysis.sentiment.by_speaker)[0]?.emotions || {})
                    .map(([emotion, score]) => `${emotion}: ${(Number(score) * 100).toFixed(1)}%`)
                    .join(' | ') 
                  : 'No emotions detected'}
                gradient="from-purple-500/20 to-indigo-500/20"
              />
              <AnalysisCard
                icon={<Lightbulb className="text-yellow-500" size={32} />}
                title="Topics"
                loading={analyzing}
                content={result.analysis?.content_analysis?.main_topics?.map(t => t.topic).join(', ') || 'No topics detected'}
                gradient="from-yellow-500/20 to-orange-500/20"
              />
              <AnalysisCard
                icon={<Key className="text-green-500" size={32} />}
                title="Keywords"
                loading={analyzing}
                content={result.analysis?.content_analysis?.key_insights?.map(i => i.insight).join(', ') || 'No keywords detected'}
                gradient="from-green-500/20 to-emerald-500/20"
              />
            </div>

            <div className="retro-card bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 transform hover:scale-[1.01] transition-all duration-300">
              <h2 className="text-3xl font-bold mb-6 flex items-center text-gray-800 dark:text-gray-200">
                <BarChart className="mr-3 text-indigo-500" />
                Analysis
              </h2>
              <div className="space-y-6">
                <div className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl">
                  <p className="text-lg mb-2">Overall Sentiment: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{(result.analysis?.sentiment?.overall?.score * 100).toFixed(1)}%</span></p>
                  <p className="text-lg">Magnitude: <span className="font-semibold text-blue-600 dark:text-blue-400">{(result.analysis?.sentiment?.overall?.magnitude * 100).toFixed(1)}%</span></p>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Domain Knowledge</h3>
                  <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
                    <p className="text-lg mb-2">Score: <span className="font-semibold text-purple-600 dark:text-purple-400">{(result.analysis?.expertise_indicators?.domain_knowledge?.score * 100).toFixed(1)}%</span></p>
                    {result.analysis?.expertise_indicators?.domain_knowledge?.areas?.length > 0 && (
                      <p className="text-lg">Areas: <span className="font-semibold text-pink-600 dark:text-pink-400">{result.analysis.expertise_indicators.domain_knowledge.areas.join(', ')}</span></p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="retro-card">
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <BarChart className="mr-2 text-orange-500" />
                Conversation Feedback
              </h2>
              <div className="space-y-4">
                {/* Areas for Improvement */}
                <div>
                  <h3 className="text-lg font-semibold text-red-600 mb-2">Areas for Improvement</h3>
                  {result.analysis?.recommendations?.areas_for_improvement?.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1">
                      {result.analysis.recommendations.areas_for_improvement.map((area: Recommendation, index: number) => (
                        <li key={index} className="text-red-700">
                          <strong>{area.aspect}:</strong> {area.suggestion}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-600 italic">No specific areas for improvement identified.</p>
                  )}
                </div>

                {/* Notable Strengths */}
                <div>
                  <h3 className="text-lg font-semibold text-green-600 mb-2">Notable Strengths</h3>
                  {result.analysis?.recommendations?.notable_strengths?.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1">
                      {result.analysis.recommendations.notable_strengths.map((strength: Strength, index: number) => (
                        <li key={index} className="text-green-700">
                          <strong>{strength.aspect}:</strong> {strength.detail}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-600 italic">No notable strengths identified.</p>
                  )}
                </div>

                {/* Communication Style Analysis */}
                <div>
                  <h3 className="text-lg font-semibold text-blue-600 mb-2">Communication Style</h3>
                  <ul className="space-y-2">
                    <li>
                      <span className="font-medium">Speaking Style:</span> {result.analysis?.speakers?.[0]?.characteristics?.speaking_style || 'Not analyzed'}
                    </li>
                    <li>
                      <span className="font-medium">Clarity:</span> {result.analysis?.speakers?.[0]?.language?.communication_clarity * 10}/10
                    </li>
                    <li>
                      <span className="font-medium">Questions Asked:</span> {result.analysis?.speakers?.[0]?.metrics?.questions_asked || 0}
                    </li>
                    <li>
                      <span className="font-medium">Filler Words:</span> {(result.analysis?.speakers?.[0]?.metrics?.filler_words_frequency * 100).toFixed(1)}%
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="retro-card">
              <h2 className="text-2xl font-bold mb-4">Summary</h2>
              <p>{result.analysis?.summary?.detailed || 'No summary available'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AnalysisCard = ({ 
  icon, 
  title, 
  loading, 
  content,
  gradient 
}: { 
  icon: React.ReactNode; 
  title: string; 
  loading: boolean; 
  content: string;
  gradient: string;
}) => (
  <div className={`retro-card bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 transform hover:scale-[1.02] transition-all duration-300`}>
    <div className="flex items-center mb-6">
      <div className={`p-4 rounded-xl bg-gradient-to-br ${gradient} mr-4 shadow-lg`}>
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{title}</h3>
    </div>
    <div className="min-h-[100px] flex items-center">
      {loading ? (
        <div className="animate-pulse text-gray-400 flex items-center">
          <span className="inline-block animate-spin mr-2">⚡</span>
          Analyzing...
        </div>
      ) : (
        <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">{content}</p>
      )}
    </div>
  </div>
);

export default ConversationAnalyser;