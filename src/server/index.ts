app.post('/api/analyze-interview', async (req, res) => {
  try {
    console.log('Received interview analysis request:', {
      mode: req.body.mode,
      topic: req.body.topic,
      answersCount: req.body.answers?.length
    });
    
    // Validate request
    if (!req.body.answers || !Array.isArray(req.body.answers) || req.body.answers.length === 0) {
      return res.status(400).json({ message: 'No answers provided for analysis' });
    }
    
    // Generate proper context for the analysis request
    const isIntervieweeMode = req.body.mode === 'give';
    const context = isIntervieweeMode
      ? `You are analyzing an interview where the user was the interviewee answering questions about ${req.body.topic}. Analyze their responses for a ${req.body.interviewee} role.`
      : `You are analyzing questions asked by the user who was the interviewer for a ${req.body.interviewee} role, interviewing about ${req.body.topic}. Focus on how effective their questions were.`;
    
    // Log request for debugging
    console.log('Interview analysis context:', context);
    console.log('Answers/questions to analyze:', req.body.answers);
    
    // Convert the answers to a format that can be used in the completion
    const answersText = req.body.answers.map((a, i) => (
      `${isIntervieweeMode ? 'Question' : 'Interviewer Question'} ${i + 1}: ${a.question}\n${isIntervieweeMode ? 'Answer' : 'Context/Purpose'}: ${a.answer}`
    )).join('\n\n');
    
    console.log('Generated analysis input:', answersText);
    
    // Analyze the interview with Gemini
    const analysisPrompt = `
      ${context}
      
      ${answersText}
      
      Provide a thorough analysis in the following JSON format:
      {
        "overall_assessment": {
          "summary": "Overall analysis summary here",
          "strengths": ["Strength 1", "Strength 2", "Strength 3"],
          "areas_for_improvement": ["Area 1", "Area 2", "Area 3"]
        },
        "technical_evaluation": {
          ${isIntervieweeMode 
            ? `"knowledge_depth": 0.85, // numeric score between 0 and 1
              "communication_clarity": 0.75, // numeric score between 0 and 1
              "problem_solving": 0.8 // numeric score between 0 and 1`
            : `"questioning_technique": 0.85, // numeric score between 0 and 1
              "listening_skills": 0.75, // numeric score between 0 and 1
              "adaptability": 0.8 // numeric score between 0 and 1`
          }
        },
        "question_by_question_feedback": [
          {
            "question": "Question text here",
            "feedback": "Detailed feedback for this question/answer",
            "strengths": ["Strength 1", "Strength 2"],
            "areas_for_improvement": ["Improvement 1", "Improvement 2"]
          }
          // Include one object for each question
        ],
        "recommendations": {
          "key_action_items": ["Action item 1", "Action item 2", "Action item 3"],
          "preparation_tips": ["Tip 1", "Tip 2", "Tip 3"]
        }
      }
      
      Ensure your response is valid JSON with no trailing commas and no explanation or additional text.
    `;
    
    // Call Gemini for analysis
    const result = await genAI.generateContent(analysisPrompt);
    const analysisText = result.response.text();
    
    console.log('Raw analysis from Gemini:', analysisText);
    
    // Try to parse the result
    try {
      // Clean up the response to make it valid JSON
      let cleanedText = analysisText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      // Remove any leading/trailing non-JSON content
      cleanedText = cleanedText.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      
      // Remove any JS-style comments
      cleanedText = cleanedText.replace(/\/\/.*$/gm, '');
      
      console.log('Cleaned analysis JSON:', cleanedText);
      
      // Parse the cleaned JSON
      const analysis = JSON.parse(cleanedText);
      
      // Ensure the expected structure exists
      if (!analysis.overall_assessment || !analysis.recommendations) {
        console.warn('Analysis is missing required fields, using fallback');
        
        // Return a structured fallback with the original analysis
        return res.json({
          overall_assessment: analysis.overall_assessment || {
            summary: "The analysis couldn't be fully structured, but we've provided the available information.",
            strengths: [],
            areas_for_improvement: []
          },
          technical_evaluation: analysis.technical_evaluation || {
            knowledge_depth: 0.7,
            communication_clarity: 0.7,
            problem_solving: 0.7
          },
          question_by_question_feedback: analysis.question_by_question_feedback || 
            req.body.answers.map(a => ({
              question: a.question,
              feedback: "No detailed feedback available for this question.",
              strengths: [],
              areas_for_improvement: []
            })),
          recommendations: analysis.recommendations || {
            key_action_items: [],
            preparation_tips: []
          },
          fallback: true,
          error: "The analysis response was incomplete or malformed."
        });
      }
      
      // Return the valid, parsed analysis
      return res.json(analysis);
      
    } catch (parseError) {
      console.error('Failed to parse interview analysis:', parseError);
      
      // Return a basic fallback analysis
      return res.json({
        overall_assessment: {
          summary: "We couldn't generate a structured analysis for your interview. This may be due to processing limitations or unusual response formats.",
          strengths: ["N/A - See summary"],
          areas_for_improvement: ["N/A - See summary"]
        },
        technical_evaluation: {
          knowledge_depth: 0.5,
          communication_clarity: 0.5,
          problem_solving: 0.5
        },
        question_by_question_feedback: req.body.answers.map(a => ({
          question: a.question,
          feedback: "No detailed feedback available for this question.",
          strengths: [],
          areas_for_improvement: []
        })),
        recommendations: {
          key_action_items: ["Try again with different questions or responses"],
          preparation_tips: ["Review the full recording of your interview for personal insights"]
        },
        fallback: true,
        error: "Failed to parse the analysis JSON: " + parseError.message,
        raw_text: analysisText
      });
    }
  } catch (error) {
    console.error('Error in interview analysis:', error);
    res.status(500).json({ 
      message: 'Failed to analyze interview', 
      error: error.message
    });
  }
}); 