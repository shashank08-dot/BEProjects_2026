
export interface User {
  id: string;
  email: string;
}

export enum QuestionType {
  MCQ = 'MCQ',
  RATING = 'RATING',
  SLIDER = 'SLIDER',
}

export interface Question {
  id: number;
  questionText: string;
  type: QuestionType;
  options?: string[]; // For MCQ
  min?: number; // For rating/slider
  max?: number; // For rating/slider
  minLabel?: string;
  maxLabel?: string;
}

export interface Answer {
  questionId: number;
  questionText: string;
  answerValue: string | number;
}

export interface Doctor {
  name: string;
  specialty: string;
  address: string;
  phone: string;
  website?: string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export interface ReportData {
  summary: string;
  concerns: string[];
  strengths: string[];
  suggestions: string[];
  disclaimer: string;
}

export interface Helpline {
    name: string;
    phone: string;
    description: string;
    website?: string;
}

export interface Fact {
    title: string;
    snippet: string;
}
