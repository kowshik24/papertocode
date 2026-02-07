import type { EnrichedDocument, GeneratedContent, AIModel } from '../types';

export const OLLAMA_FALLBACK_MODELS: AIModel[] = [
  { id: 'mistral', name: 'Mistral (Local)', tier: 'fast' },
  { id: 'llama3.1', name: 'Llama 3.1 (Local)', tier: 'quality' },
  { id: 'codellama', name: 'Code Llama (Local)', tier: 'balanced' },
  { id: 'neural-chat', name: 'Neural Chat (Local)', tier: 'balanced' },
  { id: 'llama2', name: 'Llama 2 (Local)', tier: 'fast' }
];

interface OllamaRequest {
  model: string;
  prompt: string;
  system?: string;
  stream: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
}

export const generateWithOllama = async (
  document: EnrichedDocument,
  systemPrompt: string,
  endpoint: string = 'http://localhost:11434',
  model: string = 'mistral'
): Promise<GeneratedContent> => {
  const userPrompt = `Here is the research paper:

Title: ${document.metadata.title}
Authors: ${document.metadata.authors.join(', ')}
Year: ${document.metadata.year}
Domain: ${document.metadata.estimatedDomain}

Abstract:
${document.metadata.abstract}

Key Algorithms:
${document.metadata.keyAlgorithms.join(', ')}

Full Paper Text (first 10000 chars):
${document.fullText.substring(0, 10000)}

Please generate a complete, runnable Jupyter notebook implementing this paper as a toy/pedagogical example. 
Respond with valid JSON in the format: {"guide": "...", "notebookName": "...", "cells": [...]}`;

  const requestBody: OllamaRequest = {
    model,
    prompt: userPrompt,
    system: systemPrompt,
    stream: false,
    options: {
      temperature: 0.7,
      num_predict: 8000
    }
  };

  const response = await fetch(`${endpoint}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.response;

  if (!content) {
    throw new Error('No content in Ollama response');
  }

  try {
    // Ollama might return markdown code blocks, try to extract JSON
    let jsonContent = content;
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonContent);
    return {
      guide: parsed.guide || '',
      notebookName: parsed.notebookName || 'notebook',
      cells: parsed.cells || []
    };
  } catch (error) {
    throw new Error(`Failed to parse Ollama response as JSON: ${error}`);
  }
};

export const fetchOllamaModels = async (endpoint: string = 'http://localhost:11434'): Promise<AIModel[]> => {
  try {
    const response = await fetch(`${endpoint}/api/tags`, {
      method: 'GET'
    });

    if (!response.ok) {
      console.warn('Failed to fetch Ollama models, using fallback list');
      return OLLAMA_FALLBACK_MODELS;
    }

    const data = await response.json();
    const models = data.models?.map((m: any) => ({
      id: m.name,
      name: `${m.name} (Local)`,
      tier: 'local' as const
    })) || [];

    return models.length > 0 ? models : OLLAMA_FALLBACK_MODELS;
  } catch (error) {
    console.warn('Error fetching Ollama models (is Ollama running?):', error);
    return OLLAMA_FALLBACK_MODELS;
  }
};

export const checkOllamaConnection = async (endpoint: string = 'http://localhost:11434'): Promise<boolean> => {
  try {
    const response = await fetch(`${endpoint}/api/tags`, { method: 'GET' });
    return response.ok;
  } catch (error) {
    return false;
  }
};
