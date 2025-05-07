import axios from 'axios';

// Get port from environment or use default
const API_PORT = import.meta.env.VITE_API_PORT || 3021;
const API_BASE_URL = `http://localhost:${API_PORT}/api`;

export interface Word {
  word: string;
  timestamp: number;
}

export interface Speaker {
  id: string;
  characteristics: {
    gender: string;
    speaking_style: string;
    role: string;
  };
  metrics: {
    speaking_time_percentage: number;
    interruptions_made: number;
    questions_asked: number;
    filler_words_frequency: number;
  };
  language: {
    vocabulary_level: string;
    technical_terms_used: string[];
    communication_clarity: number;
  };
}

export interface ConversationDynamics {
  turn_taking: {
    balanced: boolean;
    dominant_speaker: string;
    interruption_patterns: string;
  };
  engagement_level: {
    score: number;
    indicators: string[];
  };
}

export interface ContentAnalysis {
  main_topics: {
    topic: string;
    time_spent: string;
    depth: string;
  }[];
  key_insights: {
    insight: string;
    speaker: string;
    impact: string;
  }[];
  question_quality: {
    score: number;
    types: {
      open_ended: number;
      follow_up: number;
      clarifying: number;
    };
  };
}

export interface SentimentAnalysis {
  overall: {
    score: number;
    magnitude: number;
  };
  by_speaker: {
    [key: string]: {
      score: number;
      magnitude: number;
      emotions: {
        joy: number;
        interest: number;
        skepticism: number;
        agreement: number;
      };
    };
  };
}

export interface ExpertiseIndicators {
  domain_knowledge: {
    score: number;
    areas: string[];
    evidence: string[];
  };
  credibility_markers: string[];
}

export interface Recommendation {
  aspect: string;
  suggestion: string;
}

export interface Strength {
  aspect: string;
  detail: string;
}

export interface Recommendations {
  areas_for_improvement: Recommendation[];
  notable_strengths: Strength[];
}

export interface Summary {
  brief: string;
  detailed: string;
  key_takeaways: string[];
}

export interface AnalysisResult {
  transcription: string;
  words?: Array<{
    word: string;
    timestamp: number;
  }>;
  analysis?: any;
}

export class AudioAnalysisService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private API_BASE_URL = 'http://localhost:4000/api';
  private eventSource: EventSource | null = null;

  async analyzeAudio(file: File): Promise<AnalysisResult> {
    const formData = new FormData();
    formData.append('audio', file);

    try {
      const response = await fetch(`${this.API_BASE_URL}/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error analyzing audio:', error);
      throw error;
    }
  }

  async analyzeTranscription(text: string): Promise<any> {
    try {
      if (!text || text.trim() === '') {
        throw new Error('No transcription text provided');
      }
      
      console.log(`Analyzing transcription of length: ${text.length} characters`);
      
      const response = await fetch(`${this.API_BASE_URL}/analyze-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text }),
      });

      if (!response.ok) {
        throw new Error(`Error analyzing transcription: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Ensure we use the full transcript from the server response if available
      if (result.full_transcript) {
        console.log(`Received full transcript from server (${result.full_transcript.length} characters)`);
        result.transcription = result.full_transcript;
        // Remove the duplicate property to save space
        delete result.full_transcript;
      }
      
      return result;
    } catch (error) {
      console.error('Error in analyzeTranscription:', error);
      throw error;
    }
  }
}

export const audioAnalysisService = new AudioAnalysisService(); 