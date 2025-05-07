import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { text, api_key } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'No text provided for analysis' });
    }

    if (!api_key) {
      return res.status(400).json({ message: 'Gemini API key is required' });
    }

    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(api_key);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Prepare the prompt for conversation analysis
    const prompt = `
      Analyze this conversation transcript and provide a detailed analysis in the following JSON format:
      {
        "overall_assessment": {
          "summary": "A comprehensive summary of the conversation",
          "strengths": ["strength1", "strength2", "strength3"],
          "areas_for_improvement": ["area1", "area2", "area3"]
        },
        "conversation_metrics": {
          "clarity": 0.85,
          "engagement": 0.75,
          "professionalism": 0.90,
          "active_listening": 0.80
        },
        "detailed_analysis": {
          "key_points": ["point1", "point2", "point3"],
          "communication_patterns": {
            "positive_patterns": ["pattern1", "pattern2"],
            "improvement_areas": ["area1", "area2"]
          },
          "language_analysis": {
            "tone": "Professional and engaging",
            "formality_level": "Semi-formal",
            "key_phrases": ["phrase1", "phrase2"]
          },
          "turn_taking": {
            "balance": "Well-balanced discussion",
            "interruptions": 2,
            "average_response_time": "3-4 seconds"
          }
        },
        "recommendations": {
          "immediate_actions": ["action1", "action2"],
          "long_term_improvements": ["improvement1", "improvement2"],
          "suggested_techniques": ["technique1", "technique2"]
        },
        "segment_analysis": [
          {
            "timestamp": "00:00",
            "speaker": "Speaker 1",
            "text": "segment text",
            "analysis": {
              "tone": "Professional",
              "key_points": ["point1", "point2"],
              "suggestions": ["suggestion1", "suggestion2"]
            }
          }
        ]
      }

      Analyze this conversation transcript with the above format:
      ${text}
    `;

    // Generate analysis
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysisText = response.text();

    // Parse the JSON response
    try {
      const analysis = JSON.parse(analysisText);
      res.status(200).json(analysis);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      res.status(500).json({ message: 'Failed to parse analysis results' });
    }
  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({ message: error.message || 'Failed to analyze conversation' });
  }
} 