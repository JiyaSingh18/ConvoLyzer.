declare module 'node-wav' {
  export interface WavData {
    sampleRate: number;
    channelData: Float32Array[];
  }

  export function decode(buffer: Buffer): WavData;
  export function encode(channelData: Float32Array[], opts: { sampleRate: number }): Buffer;
} 