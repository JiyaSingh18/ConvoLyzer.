import pkg from 'whisper-node';
const { downloadModel } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function downloadWhisperModel() {
  console.log('Downloading Whisper model...');
  try {
    const modelsDir = path.join(process.cwd(), 'models');
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
    }
    
    await downloadModel('base', {
      modelPath: modelsDir,
      progressCallback: (progress) => {
        console.log(`Downloading model: ${Math.round(progress * 100)}%`);
      },
    });
    
    console.log('Model downloaded successfully!');
  } catch (error) {
    console.error('Error downloading model:', error);
    process.exit(1);
  }
}

downloadWhisperModel(); 