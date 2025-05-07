import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import whisper from 'node-whisper';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '50mb',
  },
};

// Initialize model download
let modelDownloaded = false;
const initializeModel = async () => {
  if (modelDownloaded) return;

  const modelsDir = path.join(process.cwd(), 'models');
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }

  try {
    // Use whisper with download_model option
    await whisper('dummy.wav', {
      download_model: true,
      model: 'base'
    });
    modelDownloaded = true;
  } catch (error) {
    console.error('Error downloading model:', error);
    throw new Error('Failed to download Whisper model');
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Ensure model is downloaded
    await initializeModel();

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Configure formidable to save files to the uploads directory
    const form = formidable({
      uploadDir: uploadsDir,
      keepExtensions: true,
      maxFileSize: 25 * 1024 * 1024, // 25MB
    });

    // Parse the form data
    const [fields, files] = await form.parse(req);
    const audioFile = files.audio?.[0];

    if (!audioFile) {
      return res.status(400).json({ message: 'No audio file provided' });
    }

    // Validate file type
    const supportedFormats = ['.wav', '.mp3'];
    const ext = path.extname(audioFile.originalFilename || '').toLowerCase();
    if (!supportedFormats.includes(ext)) {
      fs.unlinkSync(audioFile.filepath);
      return res.status(400).json({ message: 'Please upload a WAV or MP3 file' });
    }

    try {
      // Use Whisper to transcribe
      const result = await whisper(audioFile.filepath, {
        model: 'base',
        language: 'en',
        output_format: 'json',
        word_timestamps: true
      });

      // Get the JSON content
      const jsonContent = await result.json.getContent();

      // Process the result
      const transcription = {
        text: jsonContent.text,
        chunks: jsonContent.segments.map((segment) => ({
          text: segment.text,
          start: segment.start,
          end: segment.end,
        }))
      };

      // Clean up
      fs.unlinkSync(audioFile.filepath);

      res.status(200).json(transcription);
    } catch (transcribeError) {
      console.error('Transcription error:', transcribeError);
      fs.unlinkSync(audioFile.filepath);
      throw new Error('Failed to transcribe audio');
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to process audio file' });
  }
} 