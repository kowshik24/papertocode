import type { EnrichedDocument, GeneratedContent, AIModel } from '../types';

export const GROQ_MODELS: AIModel[] = [
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (Fast)', tier: 'fast' },
  { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B', tier: 'quality' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Instant)', tier: 'fast' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B', tier: 'balanced' }
];

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqRequest {
  model: string;
  messages: GroqMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
}

export const generateWithGroq = async (
  document: EnrichedDocument,
  systemPrompt: string,
  apiKey: string,
  model: string = 'mixtral-8x7b-32768'
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

Please generate a complete, runnable Jupyter notebook implementing this paper as a toy/pedagogical example.`;

  const requestBody: GroqRequest = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 8000,
    response_format: { type: 'json_object' }
  };

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No content in Groq response');
  }

  try {
    const parsed = JSON.parse(content);
    return {
      guide: parsed.guide || '',
      notebookName: parsed.notebookName || 'notebook',
      cells: parsed.cells || []
    };
  } catch (error) {
    throw new Error(`Failed to parse Groq response as JSON: ${error}`);
  }
};

export const fetchGroqModels = async (apiKey: string): Promise<AIModel[]> => {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      console.warn('Failed to fetch Groq models, using fallback list');
      return GROQ_MODELS;
    }

    const data = await response.json();
    const models = data.data
      .filter((m: any) => m.id.includes('llama') || m.id.includes('mixtral') || m.id.includes('gemma'))
      .map((m: any) => ({
        id: m.id,
        name: m.id,
        tier: 'balanced' as const
      }));

    return models.length > 0 ? models : GROQ_MODELS;
  } catch (error) {
    console.warn('Error fetching Groq models:', error);
    return GROQ_MODELS;
  }
};
