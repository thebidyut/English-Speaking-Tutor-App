

export interface ProgressData {
    points: number;
    streak: number;
    lastPracticeDate: string | null;
    speakingSessions: number;
    writingSessions: number;
}

export interface WordData {
    word: string;
    englishMeaning: string;
    bengaliMeaning: string;
    exampleSentence: string;
}

export interface Message {
    id: number;
    sender: 'user' | 'ai';
    text: string;
}

export interface Transcription {
    id: number;
    sender: 'user' | 'ai' | 'status';
    text: string;
}

export interface SavedConversation {
    id: number;
    type: 'speak' | 'write';
    date: string;
    transcript: (Message | Transcription)[];
}

export interface ContinuableSession {
  id: number;
  name: string;
  date: string;
  transcript: Transcription[];
}