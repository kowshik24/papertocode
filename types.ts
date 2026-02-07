export enum AppState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  EXTRACTING_METADATA = 'EXTRACTING_METADATA',
  ANALYZING = 'ANALYZING',
  DESIGNING = 'DESIGNING',
  GENERATING = 'GENERATING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export enum GenerationStep {
  IDLE = 0,
  EXTRACT_METADATA = 1,
  ANALYZE_PAPER = 2,
  DESIGN_TOY = 3,
  GENERATE_CODE = 4,
  COMPLETE = 5
}

export interface NotebookCell {
  cell_type: 'code' | 'markdown';
  source: string;
}

export interface GeneratedContent {
  guide: string;
  notebookName: string;
  cells: NotebookCell[];
}

export interface GenerationError {
  message: string;
  details?: string;
}

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'groq' | 'ollama' | 'huggingface';

export type PaperDomain = 'ML-Training' | 'NLP-Language' | 'Vision-Perception' | 'RL-Control' | 'Other';

export interface AIModel {
  id: string;
  name: string;
  tier?: 'fast' | 'balanced' | 'quality' | 'local';
}

export interface AIConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
  ollamaEndpoint?: string; // For Ollama provider
  maxTokens: number;
  temperature: number;
}

export interface PaperMetadata {
  title: string;
  authors: string[];
  year: number;
  conference?: string;
  abstract: string;
  keyAlgorithms: string[];
  estimatedDomain: PaperDomain;
}

export interface EnrichedDocument {
  metadata: PaperMetadata;
  fullText: string;
  estimatedDomain: PaperDomain;
}

export interface AnalysisOutput {
  intent: string;
  novelty: string;
  core_algorithms: string[];
  complexity: 'Simple' | 'Moderate' | 'Complex';
  dependencies: string[];
}

export interface DesignOutput {
  toy_architecture: string;
  simplification_strategy: Record<string, string>;
  mock_components: string[];
  expected_behavior: string;
  module_breakdown: Record<string, string>;
}

export interface MultiStepState {
  currentStep: GenerationStep;
  stepDescription: string;
  metadata: PaperMetadata | null;
  analysis: AnalysisOutput | null;
  design: DesignOutput | null;
}
