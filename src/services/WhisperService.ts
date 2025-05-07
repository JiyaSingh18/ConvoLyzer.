import axios from 'axios';
import { pipeline } from '@xenova/transformers';

interface TranscriptionChunk {
  text: string;
  start: number;
  end: number;
}

interface TranscriptionResult {
  text: string;
  chunks: TranscriptionChunk[];
}

class WhisperService {
  private transcriber: any = null;
  private loading: boolean = false;
  private SARVAM_API_KEY = import.meta.env.VITE_SARVAM_API_KEY;

  private async loadModel(): Promise<any> {
    if (this.transcriber) {
      return this.transcriber;
    }

    if (this.loading) {
      // Wait for existing load to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      return this.loadModel();
    }

    this.loading = true;
    try {
      console.log("[WhisperService] Initializing Whisper model...");
      this.transcriber = await pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-base.en',
        {
          quantized: true,
          chunk_length_s: 30,
          stride_length_s: 5,
          progress_callback: (progress: any) => {
            if (progress.status === 'progress') {
              console.debug(`[WhisperService] Loading model: ${Math.round(progress.progress * 100)}%`);
            }
          }
        }
      );
      console.log("[WhisperService] Whisper model initialized successfully");
      return this.transcriber;
    } catch (error) {
      console.error('[WhisperService] Error loading Whisper model:', error);
      this.transcriber = null;
      throw new Error('Unable to load speech recognition model. Please try again.');
    } finally {
      this.loading = false;
    }
  }

  private async convertToFloat32Array(arrayBuffer: ArrayBuffer): Promise<Float32Array> {
    let audioContext: AudioContext | null = null;
    try {
      // Create an audio context
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Decode the audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Get the raw audio data
      const rawData = audioBuffer.getChannelData(0); // Get first channel
      
      // Find max absolute value for normalization
      let maxAbsValue = 0;
      for (let i = 0; i < rawData.length; i++) {
        const absValue = Math.abs(rawData[i]);
        if (absValue > maxAbsValue) {
          maxAbsValue = absValue;
        }
      }
      
      // Prevent division by zero
      maxAbsValue = maxAbsValue || 1;
      
      // Create normalized data
      const normalizedData = new Float32Array(rawData.length);
      for (let i = 0; i < rawData.length; i++) {
        normalizedData[i] = rawData[i] / maxAbsValue;
      }
      
      // Resample to 16kHz if needed
      if (audioBuffer.sampleRate !== 16000) {
        const resampleRatio = 16000 / audioBuffer.sampleRate;
        const resampledLength = Math.floor(normalizedData.length * resampleRatio);
        const resampledData = new Float32Array(resampledLength);
        
        for (let i = 0; i < resampledLength; i++) {
          const originalIndex = Math.floor(i / resampleRatio);
          resampledData[i] = normalizedData[originalIndex];
        }
        
        return resampledData;
      }
      
      return normalizedData;
    } catch (error) {
      console.error('Error processing audio:', error);
      throw new Error('Failed to process audio file. Please try a different file.');
    } finally {
      // Close the audio context
      if (audioContext) {
        await audioContext.close();
      }
    }
  }

  private async transcribeWithSarvam(audioFile: File): Promise<TranscriptionResult> {
    if (!this.SARVAM_API_KEY) {
      throw new Error('Sarvam API key is not configured');
    }

    try {
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('model', 'whisper');
      formData.append('language', 'en');

      const response = await fetch('https://api.sarvam.ai/v1/transcribe', {
        method: 'POST',
        headers: {
          'x-api-key': this.SARVAM_API_KEY
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Sarvam API error response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Transcription service error (${response.status}). Please try again.`);
      }

      const data = await response.json();
      
      // Handle different response formats
      const transcriptionText = data.text || data.transcript || data.transcription;
      if (!transcriptionText) {
        throw new Error('No transcription result available');
      }

      // Handle different segment formats
      const segments = data.segments || data.chunks || [];
      const processedSegments = segments.map((segment: any) => {
        const text = segment.text || segment.transcript || '';
        const start = segment.start || segment.timestamp?.[0] || 0;
        const end = segment.end || segment.timestamp?.[1] || start + (text.split(' ').length * 0.3);
        return { text: text.trim(), start, end };
      });

      return {
        text: transcriptionText.trim(),
        chunks: processedSegments
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to transcribe audio. Please try again.');
    }
  }

  private async transcribeLocally(audioFile: File): Promise<TranscriptionResult> {
    try {
      console.log("[WhisperService] Starting local transcription with Whisper...");
      
      // Load the model first
      const model = await this.loadModel();
      
      // Create a blob URL for the audio file
      const audioURL = URL.createObjectURL(audioFile);
      
      console.log("[WhisperService] Creating audio element...");
      // Create an audio element to get the audio data
      const audio = document.createElement('audio');
      audio.src = audioURL;
      audio.controls = false;
      
      // Wait for the audio to be loaded
      await new Promise<void>((resolve) => {
        audio.addEventListener('canplaythrough', () => resolve());
        audio.load();
      });
      
      console.log("[WhisperService] Audio loaded, transcribing...");
      
      try {
        // Use the pipeline directly with the audio URL
        const result = await model(audioURL, {
          language: 'en',
          return_timestamps: true
        });
        
        console.log("[WhisperService] Transcription completed successfully");
        
        // Clean up
        URL.revokeObjectURL(audioURL);
        
        // Extract chunks from the result
        const chunks: TranscriptionChunk[] = [];
        if (result.chunks) {
          result.chunks.forEach((chunk: any) => {
            chunks.push({
              text: chunk.text,
              start: chunk.timestamp[0],
              end: chunk.timestamp[1]
            });
          });
        }
        
        return {
          text: result.text,
          chunks: chunks
        };
      } catch (transcribeError) {
        console.error("[WhisperService] Transcription error:", transcribeError);
        
        // Try an alternative approach if the first one fails
        console.log("[WhisperService] Trying alternative transcription approach...");
        
        // Import the transformers utilities
        const { env } = await import('@xenova/transformers');
        
        // Configure environment
        env.allowLocalModels = true;
        env.backends.onnx.wasm.numThreads = 1;
        
        // Create a new pipeline with explicit configuration
        const newPipeline = await pipeline(
          'automatic-speech-recognition',
          'Xenova/whisper-tiny.en',
          {
            quantized: true,
            chunk_length_s: 30,
            stride_length_s: 5
          }
        );
        
        // Try with the URL directly
        const newResult = await newPipeline(audioURL);
        
        console.log("[WhisperService] Alternative transcription completed successfully");
        
        // Clean up
        URL.revokeObjectURL(audioURL);
        
        return {
          text: newResult.text,
          chunks: []
        };
      }
    } catch (error) {
      console.error("[WhisperService] Error in local transcription:", error);
      throw new Error(`Local transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async transcribeAudio(audioFile: File): Promise<TranscriptionResult> {
    try {
      // Only support MP3 and WAV
      const supportedFormats = ['audio/wav', 'audio/mp3', 'audio/mpeg'];
      if (!supportedFormats.some(format => audioFile.type.startsWith(format))) {
        throw new Error('Please upload a WAV or MP3 file.');
      }

      // Validate file size (max 25MB)
      const maxSize = 25 * 1024 * 1024; // 25MB in bytes
      if (audioFile.size > maxSize) {
        throw new Error('File too large. Maximum size is 25MB.');
      }

      try {
        // First try the API endpoint
        console.log("[WhisperService] Attempting to use API endpoint for transcription...");
        const formData = new FormData();
        formData.append('audio', audioFile);

        try {
          const response = await axios.post('/api/transcribe', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            // Add timeout and show upload progress
            timeout: 30000, // 30 seconds timeout - fail faster
            onUploadProgress: (progressEvent) => {
              if (!progressEvent.total) return;
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              console.log(`[WhisperService] Upload progress: ${percentCompleted}%`);
            }
          });

          if (response.data?.text) {
            return {
              text: response.data.text,
              chunks: response.data.chunks || []
            };
          }
          
          console.log("[WhisperService] API returned no text, falling back to local transcription");
        } catch (apiError) {
          console.log("[WhisperService] API request failed, falling back to local transcription:", 
            apiError instanceof Error ? apiError.message : 'Unknown API error');
        }
        
        // If we get here, API failed or returned no text, so fall back to local transcription
        console.log("[WhisperService] Falling back to local transcription...");
        return await this.transcribeLocally(audioFile);
      } catch (processingError) {
        console.error("[WhisperService] Processing error:", processingError);
        throw new Error(`Failed to process audio: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`);
      }
    } catch (error) {
      console.error("[WhisperService] Transcription error:", error);
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Transcription timed out. Please try a shorter audio file.');
        }
        throw new Error(error.response?.data?.message || 'Failed to transcribe audio. Please try again.');
      }
      throw error;
    }
  }
}

export const whisperService = new WhisperService(); 