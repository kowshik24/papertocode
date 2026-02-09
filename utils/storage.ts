/**
 * Storage utility for persisting user settings and history
 * Uses localStorage with optional encryption for sensitive data
 */

import { AIConfig, AIProvider } from '../types';

const STORAGE_KEYS = {
  CONFIG: 'papertocode_config',
  THEME: 'papertocode_theme',
  HISTORY: 'papertocode_history',
  RECENT_PAPERS: 'papertocode_recent_papers',
} as const;

// Simple obfuscation for API keys (not true encryption, but prevents casual reading)
// In production, consider using Web Crypto API for proper encryption
const obfuscate = (str: string): string => {
  if (!str) return '';
  return btoa(str.split('').reverse().join(''));
};

const deobfuscate = (str: string): string => {
  if (!str) return '';
  try {
    return atob(str).split('').reverse().join('');
  } catch {
    return '';
  }
};

export interface StoredConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
  ollamaEndpoint?: string;
  maxTokens: number;
  temperature: number;
  useMultiStep: boolean;
}

export interface RecentPaper {
  id: string;
  name: string;
  title?: string;
  processedAt: string;
  provider: AIProvider;
  model: string;
}

export interface GenerationHistoryItem {
  id: string;
  paperId: string;
  paperName: string;
  paperTitle?: string;
  generatedAt: string;
  provider: AIProvider;
  model: string;
  notebookName: string;
  cellCount: number;
  // We don't store the full notebook in localStorage (too large)
  // For full history, use IndexedDB (Phase 2)
}

export type Theme = 'light' | 'dark' | 'system';

/**
 * Save AI configuration to localStorage
 */
export function saveConfig(config: AIConfig, useMultiStep: boolean): void {
  try {
    const storedConfig: StoredConfig = {
      provider: config.provider,
      model: config.model,
      apiKey: obfuscate(config.apiKey),
      ollamaEndpoint: config.ollamaEndpoint,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      useMultiStep,
    };
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(storedConfig));
  } catch (error) {
    console.warn('Failed to save config to localStorage:', error);
  }
}

const VALID_PROVIDERS: AIProvider[] = ['gemini', 'openai', 'anthropic', 'groq', 'ollama', 'huggingface'];

/**
 * Load AI configuration from localStorage
 */
export function loadConfig(): { config: Partial<AIConfig>; useMultiStep: boolean } | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!stored) return null;

    const storedConfig: StoredConfig = JSON.parse(stored);
    
    // Validate provider - default to 'gemini' if invalid
    const provider = VALID_PROVIDERS.includes(storedConfig.provider) 
      ? storedConfig.provider 
      : 'gemini';
    
    return {
      config: {
        provider,
        model: storedConfig.model,
        apiKey: deobfuscate(storedConfig.apiKey),
        ollamaEndpoint: storedConfig.ollamaEndpoint,
        maxTokens: storedConfig.maxTokens,
        temperature: storedConfig.temperature,
      },
      useMultiStep: storedConfig.useMultiStep ?? true,
    };
  } catch (error) {
    console.warn('Failed to load config from localStorage:', error);
    return null;
  }
}

/**
 * Clear stored API key only (for security)
 */
export function clearApiKey(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (stored) {
      const storedConfig: StoredConfig = JSON.parse(stored);
      storedConfig.apiKey = '';
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(storedConfig));
    }
  } catch (error) {
    console.warn('Failed to clear API key:', error);
  }
}

/**
 * Save theme preference
 */
export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch (error) {
    console.warn('Failed to save theme:', error);
  }
}

/**
 * Load theme preference
 */
export function loadTheme(): Theme {
  try {
    const theme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (theme === 'light' || theme === 'dark' || theme === 'system') {
      return theme;
    }
    return 'light';
  } catch {
    return 'light';
  }
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

/**
 * Add a paper to recent papers list
 */
export function addRecentPaper(paper: Omit<RecentPaper, 'id' | 'processedAt'>): void {
  try {
    const papers = getRecentPapers();
    const newPaper: RecentPaper = {
      ...paper,
      id: crypto.randomUUID(),
      processedAt: new Date().toISOString(),
    };
    
    // Keep only last 10 papers
    const updated = [newPaper, ...papers.filter(p => p.name !== paper.name)].slice(0, 10);
    localStorage.setItem(STORAGE_KEYS.RECENT_PAPERS, JSON.stringify(updated));
  } catch (error) {
    console.warn('Failed to save recent paper:', error);
  }
}

/**
 * Get list of recent papers
 */
export function getRecentPapers(): RecentPaper[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.RECENT_PAPERS);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Add item to generation history
 */
export function addToHistory(item: Omit<GenerationHistoryItem, 'id' | 'generatedAt'>): void {
  try {
    const history = getHistory();
    const newItem: GenerationHistoryItem = {
      ...item,
      id: crypto.randomUUID(),
      generatedAt: new Date().toISOString(),
    };
    
    // Keep only last 20 items
    const updated = [newItem, ...history].slice(0, 20);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
  } catch (error) {
    console.warn('Failed to save to history:', error);
  }
}

/**
 * Get generation history
 */
export function getHistory(): GenerationHistoryItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Clear all stored data
 */
export function clearAllData(): void {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.warn('Failed to clear data:', error);
  }
}
