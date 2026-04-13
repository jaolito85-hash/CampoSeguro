export type RiskLevel = 'low' | 'moderate' | 'high' | 'emergency';
export type Confidence = 'low' | 'medium' | 'high';
export type Language = 'pt' | 'es' | 'en';
export type Category = 'plant' | 'mushroom' | 'snake' | 'insect' | 'animal' | 'injury' | 'general';
export type Flag = 'bite' | 'bleeding' | 'breathing' | 'ate';
export type ResultSource =
  | 'offline_safety_protocol'
  | 'offline_vision_protocol'
  | 'offline_safety_fallback'
  | 'gemma_local'
  | 'protocols_only';

export interface AnalysisInput {
  language: Language;
  category: Category;
  question: string;
  flags: Flag[];
  image?: string; // base64
  visualDescription?: string;
}

export interface AnalysisResult {
  source: ResultSource;
  risk: RiskLevel;
  confidence: Confidence;
  likelyIdentification: string;
  visualDescription?: string;
  summary: string;
  doNow: string[];
  avoid: string[];
  needMore: string[];
}

export interface HistoryEntry {
  id: number;
  timestamp: string;
  category: Category;
  question: string;
  imageUri?: string;
  result: AnalysisResult;
  riskLevel: RiskLevel;
  latitude?: number;
  longitude?: number;
}

export interface Protocol {
  id: string;
  category: string;
  riskLevel: RiskLevel;
  title: string;
  doNow: string[];
  avoid: string[];
}

export interface Classification {
  label: string;
  confidence: number;
}

export interface ModelStatus {
  loaded: boolean;
  loading: boolean;
  error?: string;
  modelName?: string;
}
