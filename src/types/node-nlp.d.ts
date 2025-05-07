declare module 'node-nlp' {
  export class NlpManager {
    constructor(settings: { languages: string[] });
    
    addDocument(language: string, text: string, intent: string): void;
    addNamedEntityText(
      entityName: string,
      optionName: string,
      languages: string[],
      examples: string[]
    ): void;
    train(): Promise<void>;
    
    process(language: string, text: string): Promise<{
      sentiment: {
        score: number;
        vote: string;
      };
      intent: string;
      score: number;
      entities: Array<{
        start: number;
        end: number;
        len: number;
        accuracy: number;
        sourceText: string;
        utteranceText: string;
        entity: string;
        option: string;
      }>;
    }>;
  }
} 