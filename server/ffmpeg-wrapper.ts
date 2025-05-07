import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

// Configure FFmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export { ffmpeg, ffmpegInstaller }; 