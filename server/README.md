# Interview Practice Server

This is the backend server for the Interview Practice application. It provides APIs for interview question generation, audio transcription, and interview analysis.

## Features

- Interview question generation using Google's Gemini AI
- Audio transcription using Sarvam AI
- Real-time audio analysis for speech quality metrics
- Comprehensive interview analysis and feedback
- Support for custom interview modes and roles

## Prerequisites

- Node.js (v16 or higher)
- FFmpeg (installed automatically via @ffmpeg-installer/ffmpeg)
- API keys for:
  - Sarvam AI
  - Google Gemini AI

## Setup

1. Clone the repository
2. Navigate to the server directory:
   ```bash
   cd server
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy the environment variables template:
   ```bash
   cp .env.example .env
   ```
5. Update the `.env` file with your API keys:
   ```
   SARVAM_API_KEY=your_sarvam_ai_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

## Development

Start the development server:
```bash
npm run dev
```

The server will start on port 3000 by default (configurable via PORT environment variable).

## API Endpoints

### Question Generation
- `POST /api/generate-questions`
  - Generates interview questions based on topic, context, role, and mode

### Audio Analysis
- `POST /api/transcribe`
  - Transcribes audio and provides detailed analysis
- `POST /api/analyze-audio`
  - Analyzes audio for speech quality metrics
- `POST /api/analyze-audio-chunk`
  - Analyzes individual audio chunks for real-time feedback

### Interview Analysis
- `POST /api/analyze-interview`
  - Provides comprehensive analysis of the entire interview
- `POST /api/analyze-interviewer`
  - Analyzes interviewer's questioning technique

### Status Endpoints
- `GET /api/stt-status`
  - Checks Sarvam AI service availability
- `GET /api/analysis-status`
  - Provides real-time analysis progress updates

## Error Handling

The server includes comprehensive error handling for:
- Invalid or missing API keys
- Audio file validation
- Transcription and analysis failures
- Rate limiting and timeouts

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 