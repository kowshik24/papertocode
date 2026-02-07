export enum AppState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
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

export type AIProvider = 'gemini' | 'openai' | 'anthropic';

export interface AIModel {
  id: string;
  name: string;
}

export interface AIConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
}
