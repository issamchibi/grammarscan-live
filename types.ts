
export enum WritingMode {
  BUSINESS_EMAIL = 'Business Email',
  ACADEMIC_ESSAY = 'Academic Essay',
  RESUME_BULLETS = 'Resume Bullet Points',
  CREATIVE_WRITING = 'Creative Writing',
  BLOG_PARAGRAPH = 'Blog Paragraph',
  INBOX_INTEL = 'Inbox Optimization Intelligence',
  CORRECTION = 'Correction'
}

export type WritingStyle = 'email' | 'academic' | 'professional' | 'creative' | 'friendly' | 'normal';

export interface AnalysisResponse {
  detected_language: string;
  corrected_text: string;
  paraphrase: string;
  rewrite: string;
  tone: string;
}

export interface Suggestion {
  original: string;
  replacement: string;
  explanation: string;
  type: 'grammar' | 'style' | 'clarity' | 'paraphrase';
  startIndex: number;
  endIndex: number;
}
