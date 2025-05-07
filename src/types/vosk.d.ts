declare module 'vosk' {
  export class Model {
    constructor(modelPath: string);
  }

  export class KaldiRecognizer {
    constructor(model: Model, sampleRate: number);
    setWords(words: boolean): void;
    acceptWaveform(buffer: Buffer): boolean;
    result(): string;
    finalResult(): string;
  }
} 