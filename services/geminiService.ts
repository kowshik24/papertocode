import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { GeneratedContent, NotebookCell, AIConfig } from "../types";
import { extractTextFromPdf } from "./pdfService";
import { withRetry } from "../utils/retry";

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

// Shared markdown instruction for all providers (more reliable than JSON)
const MARKDOWN_NOTEBOOK_INSTRUCTIONS = `
Create a Jupyter notebook implementation of this paper. Format your response EXACTLY as follows:

---NOTEBOOK_START---
TITLE: [Paper Implementation Title]
GUIDE: [Brief 1-2 sentence guide on running this notebook]

---CELL_MARKDOWN---
# Your Markdown Title Here

Your explanation text here.

---CELL_CODE---
# Your Python code here
import numpy as np
print("Hello")

---CELL_MARKDOWN---
## Next Section

More explanation...

---CELL_CODE---
# More code...

---NOTEBOOK_END---

Rules:
1. Start every code cell with ---CELL_CODE---
2. Start every markdown cell with ---CELL_MARKDOWN---
3. The content follows on the next line after the marker
4. Include at least 5-10 cells mixing code and explanations
5. Make it a complete, runnable implementation
6. Focus on the core algorithm, use toy/synthetic data
7. All code should be CPU-friendly and run in minutes`;

// --- Gemini Implementation ---
const generateGemini = async (file: File, config: AIConfig): Promise<GeneratedContent> => {
  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  const base64Data = await processFileToBase64(file);

  const response = await ai.models.generateContent({
    model: config.model,
    contents: {
      parts: [
        { inlineData: { mimeType: file.type, data: base64Data } },
        { text: `Implement this paper as a toy notebook according to the system instructions.${MARKDOWN_NOTEBOOK_INSTRUCTIONS}` },
      ],
    },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");
  return parseMarkdownNotebook(text);
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
            text: `Analyze this research paper PDF and implement it as a toy notebook.${MARKDOWN_NOTEBOOK_INSTRUCTIONS}`
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
        content: `Here is the text content of the research paper:\n\n${textContent}\n\nImplement this paper as a toy notebook.${MARKDOWN_NOTEBOOK_INSTRUCTIONS}` 
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
  
  return parseMarkdownNotebook(resultText);
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
          content: `Here is the text content of the research paper:\n\n${textContent}\n\nImplement this paper as a toy notebook.${MARKDOWN_NOTEBOOK_INSTRUCTIONS}` 
        }
      ],
      temperature: config.temperature ?? 0.3,
      max_tokens: config.maxTokens || 4096
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || "OpenAI API request failed");
  }

  const data = await response.json();
  return parseMarkdownNotebook(data.choices[0]?.message?.content || "");
};

// --- Anthropic Implementation ---
const generateAnthropic = async (file: File, config: AIConfig): Promise<GeneratedContent> => {
  // Extract text content - Anthropic works better with text than trying to process PDFs directly
  let textContent = "";
  try {
    textContent = await extractAndValidateText(file);
  } catch (e) {
    throw new Error(
      "Could not extract text from this PDF. Claude API requires text-based PDFs. " +
      "Please try with Gemini which can process scanned PDFs, or use a PDF with selectable text."
    );
  }
  
  // Limit text to avoid hitting context limits (Claude 3 Haiku has smaller context)
  const maxTextLength = config.model.includes('haiku') ? 50000 : 80000;
  if (textContent.length > maxTextLength) {
    textContent = textContent.substring(0, maxTextLength) + "\n\n[Text truncated due to length...]";
  }

  const content = [
    {
      type: "text",
      text: `Here is the text content of the research paper:\n\n${textContent}\n\nImplement this paper as a toy Jupyter notebook following the system instructions.${MARKDOWN_NOTEBOOK_INSTRUCTIONS}`
    }
  ];
  
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
  
  // Parse the markdown-formatted response
  return parseMarkdownNotebook(resultText);
};

// Parse markdown-formatted notebook response (more reliable than JSON for some models)
const parseMarkdownNotebook = (text: string): GeneratedContent => {
  const cells: NotebookCell[] = [];
  let guide = "Run cells sequentially to see the implementation.";
  let notebookName = "paper_implementation.ipynb";
  
  // Extract title and guide if present
  const titleMatch = text.match(/TITLE:\s*(.+?)(?:\n|$)/i);
  if (titleMatch) {
    notebookName = titleMatch[1].trim().replace(/[^a-zA-Z0-9_-]/g, '_') + '.ipynb';
  }
  
  const guideMatch = text.match(/GUIDE:\s*(.+?)(?:\n---|\n\n|$)/is);
  if (guideMatch) {
    guide = guideMatch[1].trim();
  }
  
  // Split by cell markers
  const cellPattern = /---CELL_(MARKDOWN|CODE)---/gi;
  const parts = text.split(cellPattern);
  
  // Process parts - each cell type marker is followed by its content
  for (let i = 1; i < parts.length; i += 2) {
    const cellType = parts[i]?.toLowerCase();
    const cellContent = parts[i + 1]?.trim();
    
    if (cellContent && (cellType === 'markdown' || cellType === 'code')) {
      cells.push({
        cell_type: cellType as 'markdown' | 'code',
        source: cellContent
      });
    }
  }
  
  // Fallback: if no cells found with markers, try to extract code blocks
  if (cells.length === 0) {
    console.log("No cell markers found, falling back to code block extraction");
    return parseCodeBlocksAsNotebook(text);
  }
  
  // Ensure we have at least some content
  if (cells.length < 2) {
    throw new Error(
      "The AI response didn't contain enough content to create a notebook. " +
      "Please try again or use a different model."
    );
  }
  
  return { guide, notebookName, cells };
};

// Fallback parser that extracts code blocks from markdown
const parseCodeBlocksAsNotebook = (text: string): GeneratedContent => {
  const cells: NotebookCell[] = [];
  
  // Match code blocks with optional language specifier
  const codeBlockRegex = /```(?:python|py)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  
  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add any text before this code block as markdown
    const textBefore = text.slice(lastIndex, match.index).trim();
    if (textBefore) {
      // Clean up the markdown text
      const cleanedText = textBefore
        .replace(/---NOTEBOOK_START---.*?(?=```|$)/gis, '')
        .replace(/---NOTEBOOK_END---/gi, '')
        .replace(/TITLE:.*?\n/gi, '')
        .replace(/GUIDE:.*?\n/gi, '')
        .trim();
      
      if (cleanedText) {
        cells.push({ cell_type: 'markdown', source: cleanedText });
      }
    }
    
    // Add the code block
    const codeContent = match[1].trim();
    if (codeContent) {
      cells.push({ cell_type: 'code', source: codeContent });
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add any remaining text as markdown
  const remainingText = text.slice(lastIndex).trim()
    .replace(/---NOTEBOOK_END---/gi, '')
    .trim();
  if (remainingText && cells.length > 0) {
    cells.push({ cell_type: 'markdown', source: remainingText });
  }
  
  if (cells.length === 0) {
    // Last resort: treat the whole response as a single code cell
    const cleanedText = text
      .replace(/---NOTEBOOK_START---/gi, '')
      .replace(/---NOTEBOOK_END---/gi, '')
      .replace(/TITLE:.*?\n/gi, '')
      .replace(/GUIDE:.*?\n/gi, '')
      .trim();
    
    if (cleanedText) {
      cells.push({ 
        cell_type: 'markdown', 
        source: '# Paper Implementation\n\nGenerated implementation from the research paper.' 
      });
      cells.push({ cell_type: 'code', source: cleanedText });
    }
  }
  
  if (cells.length === 0) {
    throw new Error(
      "Could not extract any code from the AI response. " +
      "Please try again with a different model (Gemini recommended)."
    );
  }
  
  return {
    guide: "Run cells sequentially. Generated from raw model output.",
    notebookName: "paper_implementation.ipynb",
    cells
  };
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
          content: `Here is the text content of the research paper:\n\n${textContent}\n\nImplement this paper as a toy notebook.${MARKDOWN_NOTEBOOK_INSTRUCTIONS}` 
        }
      ],
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
  return parseMarkdownNotebook(data.choices[0]?.message?.content || "");
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
          content: `Here is the text content of the research paper:\n\n${textContent}\n\nImplement this paper as a toy notebook.${MARKDOWN_NOTEBOOK_INSTRUCTIONS}` 
        }
      ],
      stream: false
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
  return parseMarkdownNotebook(data.message?.content || "");
};

// --- HuggingFace Implementation ---
const generateHuggingFace = async (file: File, config: AIConfig): Promise<GeneratedContent> => {
  const textContent = await extractAndValidateText(file);
  
  // HuggingFace Inference API endpoint
  const modelEndpoint = `https://api-inference.huggingface.co/models/${config.model}`;
  
  const prompt = `${SYSTEM_INSTRUCTION}\n\nUser: Here is the text content of the research paper:\n\n${textContent}\n\nImplement this paper as a toy notebook.${MARKDOWN_NOTEBOOK_INSTRUCTIONS}\n\nAssistant:`;
  
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
  
  return parseMarkdownNotebook(generatedText);
};

export const generateToyImplementation = async (file: File, config: AIConfig): Promise<GeneratedContent> => {
  if (!config.apiKey && config.provider !== 'ollama') {
    throw new Error("API Key is required.");
  }

  // Use retry with exponential backoff for API resilience
  const generateFn = async (): Promise<GeneratedContent> => {
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

  return withRetry(generateFn, {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    onRetry: (attempt, error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Generation attempt ${attempt} failed: ${errorMessage}. Retrying...`);
    }
  });
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
