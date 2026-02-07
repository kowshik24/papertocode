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
  const textContent = await extractTextFromPdf(file);
  
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
        { role: "user", content: `Here is the text content of the research paper:\n\n${textContent}\n\nImplement this paper as a toy notebook.` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "OpenAI API request failed");
  }

  const data = await response.json();
  const resultText = data.choices[0].message.content;
  return JSON.parse(resultText) as GeneratedContent;
};

// --- Anthropic Implementation ---
const generateAnthropic = async (file: File, config: AIConfig): Promise<GeneratedContent> => {
  const textContent = await extractTextFromPdf(file);
  
  // Note: Anthropic often blocks browser requests via CORS. 
  // If this fails, user might need a proxy or backend. 
  // We use standard fetch here assuming an environment where this is permitted or proxied.
  
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "dangerously-allow-browser": "true" // This header is sometimes required by client libs, adding just in case for proxies
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4096,
      system: SYSTEM_INSTRUCTION,
      messages: [
        { role: "user", content: `Here is the text content of the research paper:\n\n${textContent}\n\nImplement this paper as a toy notebook. Return ONLY valid JSON.` }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "Anthropic API request failed (Check CORS/API Key)");
  }

  const data = await response.json();
  const resultText = data.content[0].text;
  
  // Basic cleanup if model wraps in markdown blocks despite instructions
  const jsonStr = resultText.replace(/```json\n?|\n?```/g, '');
  return JSON.parse(jsonStr) as GeneratedContent;
};

export const generateToyImplementation = async (file: File, config: AIConfig): Promise<GeneratedContent> => {
  if (!config.apiKey) throw new Error("API Key is required.");

  switch (config.provider) {
    case 'gemini':
      return generateGemini(file, config);
    case 'openai':
      return generateOpenAI(file, config);
    case 'anthropic':
      return generateAnthropic(file, config);
    default:
      throw new Error("Unsupported provider");
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
