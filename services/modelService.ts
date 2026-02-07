import { AIModel, AIProvider } from "../types";
import { GROQ_MODELS, fetchGroqModels } from "./groqService";
import { OLLAMA_FALLBACK_MODELS, fetchOllamaModels } from "./ollamaService";
import { HUGGINGFACE_MODELS, fetchHuggingFaceModels } from "./huggingfaceService";

export const FALLBACK_MODELS: Record<AIProvider, AIModel[]> = {
  gemini: [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash-8B' }
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
  ],
  anthropic: [
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' }
  ],
  groq: GROQ_MODELS,
  ollama: OLLAMA_FALLBACK_MODELS,
  huggingface: HUGGINGFACE_MODELS
};

export const fetchModels = async (
  provider: AIProvider, 
  apiKey: string, 
  ollamaEndpoint?: string
): Promise<AIModel[]> => {
  if (!apiKey && provider !== 'ollama') return FALLBACK_MODELS[provider];

  try {
    switch (provider) {
      case 'gemini':
        return await fetchGeminiModels(apiKey);
      case 'openai':
        return await fetchOpenAIModels(apiKey);
      case 'anthropic':
        return await fetchAnthropicModels(apiKey);
      case 'groq':
        return await fetchGroqModels(apiKey);
      case 'ollama':
        return await fetchOllamaModels(ollamaEndpoint);
      case 'huggingface':
        return await fetchHuggingFaceModels(apiKey);
      default:
        return FALLBACK_MODELS[provider];
    }
  } catch (error) {
    console.warn(`Failed to fetch models for ${provider}. Using fallbacks.`, error);
    // Return fallbacks if fetch fails (e.g. due to CORS or invalid key)
    return FALLBACK_MODELS[provider];
  }
};

const fetchGeminiModels = async (apiKey: string): Promise<AIModel[]> => {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  if (!response.ok) throw new Error('Failed to fetch Gemini models');
  
  const data = await response.json();
  if (!data.models) return FALLBACK_MODELS.gemini;

  return data.models
    .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m: any) => ({
      id: m.name.replace('models/', ''),
      name: m.displayName || m.name.replace('models/', '')
    }))
    .sort((a: AIModel, b: AIModel) => {
      // Prioritize flash/pro models
      const score = (model: AIModel) => {
        if (model.id.includes('flash')) return 3;
        if (model.id.includes('pro')) return 2;
        return 1;
      };
      return score(b) - score(a);
    });
};

const fetchOpenAIModels = async (apiKey: string): Promise<AIModel[]> => {
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  if (!response.ok) throw new Error('Failed to fetch OpenAI models');

  const data = await response.json();
  return data.data
    .filter((m: any) => m.id.startsWith('gpt'))
    .map((m: any) => ({
      id: m.id,
      name: m.id
    }))
    .sort((a: AIModel, b: AIModel) => b.id.localeCompare(a.id));
};

const fetchAnthropicModels = async (apiKey: string): Promise<AIModel[]> => {
  const response = await fetch('https://api.anthropic.com/v1/models', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'dangerously-allow-browser': 'true'
    }
  });
  if (!response.ok) throw new Error('Failed to fetch Anthropic models');

  const data = await response.json();
  return data.data.map((m: any) => ({
    id: m.id,
    name: m.display_name || m.id
  }));
};
