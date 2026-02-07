import { GoogleGenAI, Type, Schema } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { GeneratedContent, NotebookCell, AIConfig } from "../types";
import { extractTextFromPdf } from "./pdfService";

const processFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

// Extract text and validate it's not empty
const extractAndValidateText = async (file: File): Promise<string> => {
  const textContent = await extractTextFromPdf(file);
  
  // Check if we got meaningful text (at least 100 chars of actual content)
  const cleanedText = textContent.replace(/---\s*Page\s*\d+\s*---/g, '').trim();
  if (cleanedText.length < 100) {
    throw new Error(
      "Could not extract sufficient text from this PDF. " +
      "This may be a scanned/image-based PDF. Please try with Gemini which can process PDF images directly, " +
      "or use a PDF with selectable text."
    );
  }
  
  // Truncate if too long (most APIs have context limits)
  const maxLength = 100000; // ~25k tokens roughly
  if (textContent.length > maxLength) {
    console.warn(`PDF text truncated from ${textContent.length} to ${maxLength} characters`);
    return textContent.substring(0, maxLength) + "\n\n[Text truncated due to length...]";
  }
  
  return textContent;
};

const notebookSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    guide: {
      type: Type.STRING,
      description: "A short execution guide explaining the key insights.",
    },
    notebookName: {
      type: Type.STRING,
      description: "Suggested filename ending in .ipynb",
    },
    cells: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          cell_type: { type: Type.STRING, enum: ["code", "markdown"] },
          source: { type: Type.STRING },
        },
        required: ["cell_type", "source"],
      },
    },
  },
  required: ["guide", "notebookName", "cells"],
};

// --- Gemini Implementation ---
const generateGemini = async (file: File, config: AIConfig): Promise<GeneratedContent> => {
  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  const base64Data = await processFileToBase64(file);

  const response = await ai.models.generateContent({
    model: config.model,
    contents: {
      parts: [
        { inlineData: { mimeType: file.type, data: base64Data } },
        { text: "Implement this paper as a toy notebook according to the system instructions. Provide the output in the specified JSON schema." },
      ],
    },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: notebookSchema,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");
  return JSON.parse(text) as GeneratedContent;
};

// --- OpenAI Implementation ---
const generateOpenAI = async (file: File, config: AIConfig): Promise<GeneratedContent> => {
  // Check if model supports vision (GPT-4o, GPT-4-turbo, GPT-4-vision)
  const supportsVision = config.model.includes('gpt-4o') || 
                         config.model.includes('gpt-4-turbo') ||
                         config.model.includes('vision');
  
  let messages: any[];
  
  if (supportsVision) {
    // Use vision capability - send PDF as images
    const base64Data = await processFileToBase64(file);
    messages = [
      { role: "system", content: SYSTEM_INSTRUCTION },
      { 
        role: "user", 
        content: [
          {
            type: "text",
            text: "Analyze this research paper PDF and implement it as a toy notebook. Return your response as a JSON object with keys: guide (string), notebookName (string ending in .ipynb), and cells (array of objects with cell_type and source)."
          },
          {
            type: "image_url",
            image_url: {
              url: `data:application/pdf;base64,${base64Data}`,
              detail: "high"
            }
          }
        ]
      }
    ];
  } else {
    // Fall back to text extraction for older models
    const textContent = await extractAndValidateText(file);
    messages = [
      { role: "system", content: SYSTEM_INSTRUCTION },
      { 
        role: "user", 
        content: `Here is the text content of the research paper:\n\n${textContent}\n\nImplement this paper as a toy notebook. Return your response as a JSON object with keys: guide (string), notebookName (string ending in .ipynb), and cells (array of objects with cell_type and source).` 
      }
    ];
  }
  
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      response_format: { type: "json_object" },
      temperature: config.temperature ?? 0.3,
      max_tokens: config.maxTokens || 4096
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
    const errorMsg = err.error?.message || `OpenAI API request failed with status ${response.status}`;
    
    // Provide helpful message for common errors
    if (response.status === 401) {
      throw new Error("Invalid OpenAI API key. Please check your API key and try again.");
    } else if (response.status === 429) {
      throw new Error("OpenAI rate limit exceeded. Please wait a moment and try again.");
    } else if (response.status === 400 && errorMsg.includes('image')) {
      // Vision not supported, retry with text
      console.warn("Vision not supported for this model, falling back to text extraction");
      const textContent = await extractAndValidateText(file);
      return generateOpenAIWithText(textContent, config);
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const resultText = data.choices[0]?.message?.content;
  
  if (!resultText) {
    throw new Error("Empty response from OpenAI API");
  }
  
  return parseJSONResponse(resultText);
};

// Helper for text-only OpenAI generation
const generateOpenAIWithText = async (textContent: string, config: AIConfig): Promise<GeneratedContent> => {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { 
          role: "user", 
          content: `Here is the text content of the research paper:\n\n${textContent}\n\nImplement this paper as a toy notebook. Return your response as a JSON object with keys: guide (string), notebookName (string ending in .ipynb), and cells (array of objects with cell_type and source).` 
        }
      ],
      response_format: { type: "json_object" },
      temperature: config.temperature ?? 0.3,
      max_tokens: config.maxTokens || 4096
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || "OpenAI API request failed");
  }

  const data = await response.json();
  return parseJSONResponse(data.choices[0]?.message?.content || "");
};

// --- Anthropic Implementation ---
const generateAnthropic = async (file: File, config: AIConfig): Promise<GeneratedContent> => {
  // Claude 3 models support vision
  const supportsVision = config.model.includes('claude-3') || 
                         config.model.includes('claude-3.5') ||
                         config.model.includes('sonnet') ||
                         config.model.includes('opus') ||
                         config.model.includes('haiku');
  
  let content: any[];
  
  if (supportsVision) {
    // Use vision - convert PDF to images
    // Note: Anthropic doesn't support PDF directly, we'll try sending first page as image
    // For full PDF support, we'd need to convert pages to images server-side
    // Fall back to text extraction for now but add the base64 as document
    const base64Data = await processFileToBase64(file);
    
    // Try text extraction first, use vision as backup context
    let textContent = "";
    try {
      textContent = await extractAndValidateText(file);
    } catch (e) {
      // If text extraction fails, we'll rely on the instruction to analyze
      textContent = "[PDF text could not be extracted - this may be a scanned document]";
    }
    
    content = [
      {
        type: "text",
        text: `Here is a research paper. The extracted text is below (if available). Please analyze and implement it as a toy notebook.\n\nExtracted text:\n${textContent}\n\nImplement this paper as a toy notebook. Return ONLY a valid JSON object with these exact keys:\n- "guide": a short execution guide (string)\n- "notebookName": filename ending in .ipynb (string)\n- "cells": array of objects, each with "cell_type" ("code" or "markdown") and "source" (string)`
      }
    ];
  } else {
    // Text only for older models
    const textContent = await extractAndValidateText(file);
    content = [
      {
        type: "text",
        text: `Here is the text content of the research paper:\n\n${textContent}\n\nImplement this paper as a toy notebook. Return ONLY a valid JSON object with these exact keys:\n- "guide": a short execution guide (string)\n- "notebookName": filename ending in .ipynb (string)\n- "cells": array of objects, each with "cell_type" ("code" or "markdown") and "source" (string)`
      }
    ];
  }
  
  // Determine max tokens - respect model limits (Claude 3 non-3.5 maxes at 4096)
  const modelMaxTokens = config.model.includes('3-5') || config.model.includes('3.5') ? 8192 : 4096;
  const maxTokens = Math.min(config.maxTokens || 4096, modelMaxTokens);
  
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: maxTokens,
      temperature: config.temperature ?? 0.3,
      system: SYSTEM_INSTRUCTION,
      messages: [
        { role: "user", content }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
    const errorMsg = err.error?.message || `Anthropic API request failed with status ${response.status}`;
    
    // Provide helpful messages for common errors
    if (response.status === 401) {
      throw new Error("Invalid Anthropic API key. Please check your API key and try again.");
    } else if (response.status === 429) {
      throw new Error("Anthropic rate limit exceeded. Please wait a moment and try again.");
    } else if (response.status === 403 || errorMsg.includes('CORS')) {
      throw new Error(
        "Anthropic API blocked due to CORS policy. " +
        "Browser-based requests to Anthropic require the 'anthropic-dangerous-direct-browser-access' header to be enabled on your API key. " +
        "Alternatively, try using Gemini or OpenAI which have better browser support."
      );
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const resultText = data.content?.[0]?.text;
  
  if (!resultText) {
    throw new Error("Empty response from Anthropic API");
  }
  
  return parseJSONResponse(resultText);
};

// Helper to parse JSON from model response (handles markdown code blocks)
const parseJSONResponse = (text: string): GeneratedContent => {
  if (!text || text.trim().length === 0) {
    throw new Error("Empty response received from AI model");
  }
  
  // Try direct parse first
  try {
    return JSON.parse(text) as GeneratedContent;
  } catch {
    // Try removing markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim()) as GeneratedContent;
      } catch {
        // Continue to other attempts
      }
    }
    
    // Try finding JSON object in the text
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]) as GeneratedContent;
      } catch {
        // Continue
      }
    }
    
    throw new Error(
      "Failed to parse AI response as JSON. The model may have returned an invalid format. " +
      "Please try again or switch to a different model."
    );
  }
};

// --- Groq Implementation ---
const generateGroq = async (file: File, config: AIConfig): Promise<GeneratedContent> => {
  const textContent = await extractAndValidateText(file);
  
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { 
          role: "user", 
          content: `Here is the text content of the research paper:\n\n${textContent}\n\nImplement this paper as a toy notebook. Return your response as a JSON object with keys: guide (string), notebookName (string ending in .ipynb), and cells (array of objects with cell_type and source).` 
        }
      ],
      response_format: { type: "json_object" },
      temperature: config.temperature ?? 0.3,
      max_tokens: config.maxTokens || 8192
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
    const errorMsg = err.error?.message || `Groq API request failed with status ${response.status}`;
    
    if (response.status === 401) {
      throw new Error("Invalid Groq API key. Please check your API key and try again.");
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return parseJSONResponse(data.choices[0]?.message?.content || "");
};

// --- Ollama Implementation ---
const generateOllama = async (file: File, config: AIConfig): Promise<GeneratedContent> => {
  const textContent = await extractAndValidateText(file);
  const endpoint = config.ollamaEndpoint || 'http://localhost:11434';
  
  const response = await fetch(`${endpoint}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { 
          role: "user", 
          content: `Here is the text content of the research paper:\n\n${textContent}\n\nImplement this paper as a toy notebook. Return your response as a JSON object with keys: guide (string), notebookName (string ending in .ipynb), and cells (array of objects with cell_type and source). Return ONLY the JSON, no other text.` 
        }
      ],
      stream: false,
      format: "json"
    })
  });

  if (!response.ok) {
    if (response.status === 0 || response.type === 'opaque') {
      throw new Error(
        "Could not connect to Ollama. Make sure Ollama is running locally and accessible at " + endpoint +
        ". You may need to start it with: OLLAMA_ORIGINS='*' ollama serve"
      );
    }
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || `Ollama request failed with status ${response.status}`);
  }

  const data = await response.json();
  return parseJSONResponse(data.message?.content || "");
};

// --- HuggingFace Implementation ---
const generateHuggingFace = async (file: File, config: AIConfig): Promise<GeneratedContent> => {
  const textContent = await extractAndValidateText(file);
  
  // HuggingFace Inference API endpoint
  const modelEndpoint = `https://api-inference.huggingface.co/models/${config.model}`;
  
  const prompt = `${SYSTEM_INSTRUCTION}\n\nUser: Here is the text content of the research paper:\n\n${textContent}\n\nImplement this paper as a toy notebook. Return your response as a JSON object with keys: guide (string), notebookName (string ending in .ipynb), and cells (array of objects with cell_type and source).\n\nAssistant:`;
  
  const response = await fetch(modelEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: config.maxTokens || 4096,
        temperature: config.temperature ?? 0.3,
        return_full_text: false
      }
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    const errorMsg = err.error || `HuggingFace API request failed with status ${response.status}`;
    
    if (response.status === 401) {
      throw new Error("Invalid HuggingFace API token. Please check your token and try again.");
    } else if (response.status === 503) {
      throw new Error("HuggingFace model is loading. Please wait a moment and try again.");
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const generatedText = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;
  
  if (!generatedText) {
    throw new Error("Empty response from HuggingFace API");
  }
  
  return parseJSONResponse(generatedText);
};

export const generateToyImplementation = async (file: File, config: AIConfig): Promise<GeneratedContent> => {
  if (!config.apiKey && config.provider !== 'ollama') {
    throw new Error("API Key is required.");
  }

  switch (config.provider) {
    case 'gemini':
      return generateGemini(file, config);
    case 'openai':
      return generateOpenAI(file, config);
    case 'anthropic':
      return generateAnthropic(file, config);
    case 'groq':
      return generateGroq(file, config);
    case 'ollama':
      return generateOllama(file, config);
    case 'huggingface':
      return generateHuggingFace(file, config);
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
};

export const createNotebookBlob = (cells: NotebookCell[]): Blob => {
  const ipynb = {
    cells: cells.map(cell => ({
      cell_type: cell.cell_type,
      metadata: {},
      source: cell.source.split('\n').map(line => line + '\n'),
      outputs: [],
      execution_count: null
    })),
    metadata: {
      kernelspec: {
        display_name: "Python 3",
        language: "python",
        name: "python3"
      },
      language_info: {
        codemirror_mode: { name: "ipython", version: 3 },
        file_extension: ".py",
        mimetype: "text/x-python",
        name: "python",
        nbconvert_exporter: "python",
        pygments_lexer: "ipython3",
        version: "3.10.0"
      }
    },
    nbformat: 4,
    nbformat_minor: 5
  };

  return new Blob([JSON.stringify(ipynb, null, 2)], { type: 'application/json' });
};
