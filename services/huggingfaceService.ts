import type { EnrichedDocument, GeneratedContent, AIModel } from '../types';

export const HUGGINGFACE_MODELS: AIModel[] = [
  { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct', name: 'Llama 3.1 70B Instruct', tier: 'quality' },
  { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B Instruct', tier: 'fast' },
  { id: 'mistralai/Mistral-7B-Instruct-v0.3', name: 'Mistral 7B Instruct', tier: 'balanced' },
  { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', name: 'Mixtral 8x7B Instruct', tier: 'quality' },
  { id: 'HuggingFaceH4/zephyr-7b-beta', name: 'Zephyr 7B Beta', tier: 'fast' }
];

interface HuggingFaceRequest {
  inputs: string;
  parameters?: {
    max_new_tokens?: number;
    temperature?: number;
    return_full_text?: boolean;
  };
}

export const generateWithHuggingFace = async (
  document: EnrichedDocument,
  systemPrompt: string,
  apiKey: string,
  model: string = 'meta-llama/Meta-Llama-3.1-8B-Instruct'
): Promise<GeneratedContent> => {
  const fullPrompt = `${systemPrompt}

Here is the research paper:

Title: ${document.metadata.title}
Authors: ${document.metadata.authors.join(', ')}
Year: ${document.metadata.year}
Domain: ${document.metadata.estimatedDomain}

Abstract:
${document.metadata.abstract}

Key Algorithms:
${document.metadata.keyAlgorithms.join(', ')}

Full Paper Text (first 8000 chars):
${document.fullText.substring(0, 8000)}

Please generate a complete, runnable Jupyter notebook implementing this paper as a toy/pedagogical example. 
Respond with valid JSON in the format: {"guide": "...", "notebookName": "...", "cells": [...]}`;

  const requestBody: HuggingFaceRequest = {
    inputs: fullPrompt,
    parameters: {
      max_new_tokens: 4000,
      temperature: 0.7,
      return_full_text: false
    }
  };

  const response = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HuggingFace API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  // HuggingFace Inference API returns array of results
  let content = '';
  if (Array.isArray(data) && data.length > 0) {
    content = data[0].generated_text || data[0].text || '';
  } else if (data.generated_text) {
    content = data.generated_text;
  } else {
    throw new Error('Unexpected HuggingFace response format');
  }

  if (!content) {
    throw new Error('No content in HuggingFace response');
  }

  try {
    // Try to extract JSON from response (might be wrapped in markdown)
    let jsonContent = content;
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                     content.match(/\{[\s\S]*"cells"[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1] || jsonMatch[0];
    }

    const parsed = JSON.parse(jsonContent);
    return {
      guide: parsed.guide || '',
      notebookName: parsed.notebookName || 'notebook',
      cells: parsed.cells || []
    };
  } catch (error) {
    throw new Error(`Failed to parse HuggingFace response as JSON: ${error}`);
  }
};

// Note: HuggingFace Inference API doesn't have a models list endpoint
// We use a curated list of well-performing models
export const fetchHuggingFaceModels = async (apiKey: string): Promise<AIModel[]> => {
  // HuggingFace Inference API doesn't provide a simple way to list available models
  // Return curated list of known good models
  return HUGGINGFACE_MODELS;
};
