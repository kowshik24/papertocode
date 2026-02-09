/**
 * Multi-Step Generation Orchestrator
 * 
 * Runs entirely in the browser - no backend required.
 * Implements a 3-step pipeline: Analyze → Design → Generate Code
 */

import { AIConfig, GeneratedContent, PaperDomain, EnrichedDocument, NotebookCell } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";
import { extractEnrichedDocument } from "./pdfService";

// Markdown format instructions for notebook generation
const MARKDOWN_NOTEBOOK_INSTRUCTIONS = `
Create a Jupyter notebook implementation. Format your response EXACTLY as follows:

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

// ============================================================================
// STEP PROMPTS - Embedded directly in TypeScript for browser execution
// ============================================================================

const STEP1_ANALYSIS_PROMPT = `
# Step 1: Paper Analysis

Extract structured information from the research paper to guide implementation planning.

## Required Outputs

Respond in this EXACT format (copy these labels exactly):

INTENT: [What problem does this paper solve? 1-2 sentences]

NOVELTY: [What's new compared to prior work? 1-2 sentences]

CORE_ALGORITHMS: [Algorithm 1], [Algorithm 2], [Algorithm 3]

COMPLEXITY: [Simple | Moderate | Complex]

DEPENDENCIES: [dependency1], [dependency2]

## Complexity Scale
- Simple: Single algorithm, few steps, runs quickly
- Moderate: Multi-stage pipeline, moderate dependencies
- Complex: Distributed training, large models, many components
`;

const STEP2_DESIGN_PROMPT = `
# Step 2: Toy Architecture Design

Design a simplified implementation following the core principle:
**The algorithm does not know it is a toy.**

## What We Preserve
- Interfaces and API shapes
- Control flow and decision logic
- Algorithm structure

## What We Simplify
- Models (tiny networks, 5-50 units total)
- Data (synthetic, ~50-100 samples)
- Scale (single machine, CPU only)
- Compute (minutes, not hours)

## Required Outputs

Respond in this EXACT format (copy these labels exactly):

ARCHITECTURE: [High-level design in 3-5 sentences]

SIMPLIFICATIONS:
- [Original component] -> [Simplified version]: [Why this works]
- [Original component] -> [Simplified version]: [Why this works]

MOCK_COMPONENTS:
- [ComponentName] (type): [How it will be implemented]
- [ComponentName] (type): [How it will be implemented]

EXPECTED_BEHAVIOR: [What trends/patterns should we observe?]

MODULE_BREAKDOWN:
- [Paper Section] -> [Notebook Cell Purpose]
- [Paper Section] -> [Notebook Cell Purpose]

## Simplification Strategies
- Neural Networks -> 1-2 hidden layers, 5-50 units, ReLU/tanh
- Datasets -> Generate synthetic with same statistical properties
- Reward Models -> Heuristic scoring with 2-3 features
- Pretrained Models -> Shallow embeddings or rule-based
- Distributed Systems -> Single-process with print statements
`;

const DOMAIN_CONTEXTS: Record<PaperDomain, string> = {
  'ML-Training': `
## Machine Learning Training Domain

### Common Paper Types
- Optimization algorithms (Adam variants, LARS, LAMB)
- Loss function innovations
- Training dynamics analysis
- Regularization techniques

### Valid Toy Simplifications
- Train on synthetic XOR/spiral/moons datasets (50-200 points)
- Use 2-3 layer networks with 10-50 total parameters
- Compare loss curves over 50-200 epochs
- Show gradient statistics with print statements

### Key Visualizations
- Loss curve comparison (baseline vs proposed)
- Gradient norm over training
- Parameter trajectory in 2D (for simple cases)
- Learning rate schedule visualization
`,

  'NLP-Language': `
## NLP/Language Domain

### Common Paper Types
- Attention mechanisms
- Sequence modeling
- Text classification/generation
- Embedding methods

### Valid Toy Simplifications
- Fixed vocabulary of 50-200 words
- Sequence length 5-20 tokens
- Embedding dimension 8-32
- Generate synthetic sentences with clear patterns
- Use rule-based tokenization

### Key Visualizations
- Attention weight heatmaps
- Embedding space (PCA/TSNE to 2D)
- Perplexity/accuracy over training
- Token prediction examples
`,

  'Vision-Perception': `
## Computer Vision Domain

### Common Paper Types
- CNN architectures
- Object detection
- Image segmentation
- Feature extraction

### Valid Toy Simplifications
- Tiny images (8x8 to 32x32 grayscale)
- Simple shapes (circles, squares, triangles)
- 2-3 conv layers with small kernels
- Binary or 3-class classification
- Generate synthetic images with numpy

### Key Visualizations
- Filter visualizations
- Feature maps at each layer
- Confusion matrix
- Sample predictions with confidence
`,

  'RL-Control': `
## Reinforcement Learning Domain

### Common Paper Types
- Policy gradient methods
- Q-learning variants
- Model-based RL
- Multi-agent systems

### Valid Toy Simplifications
- Grid world (5x5 to 10x10)
- Bandit problems (3-10 arms)
- Simple continuous control (1D/2D)
- Episode length 20-100 steps
- Tabular or tiny function approximators

### Key Visualizations
- Reward curves over episodes
- Policy visualization (action probabilities)
- Value function heatmap
- State visitation frequency
`,

  'Other': `
## General Research Domain

### Key Principles
- Identify the core algorithmic contribution
- Find the simplest problem that demonstrates the idea
- Use synthetic data that you fully control
- Make all intermediate states visible

### Default Simplifications
- Replace complex systems with print-heavy implementations
- Use small-scale versions of any data structures
- Mock external dependencies with deterministic functions
- Limit iterations/epochs for quick feedback
`
};

// ============================================================================
// Types for Multi-Step Generation
// ============================================================================

export interface AnalysisResult {
  intent: string;
  novelty: string;
  core_algorithms: string[];
  complexity: 'Simple' | 'Moderate' | 'Complex';
  dependencies: string[];
}

export interface DesignResult {
  toy_architecture: string;
  simplifications: Array<{
    original: string;
    simplified: string;
    rationale: string;
  }>;
  mock_components: Array<{
    name: string;
    type: string;
    implementation: string;
  }>;
  expected_behavior: string;
  module_breakdown: Array<{
    section: string;
    notebook_cell: string;
  }>;
}

export interface MultiStepProgress {
  currentStep: number;
  totalSteps: number;
  stepName: string;
  message: string;
}

export type ProgressCallback = (progress: MultiStepProgress) => void;

// ============================================================================
// Core Generation Functions
// ============================================================================

/**
 * Call the AI provider with a prompt
 */
const callProvider = async (
  systemPrompt: string,
  userPrompt: string,
  config: AIConfig
): Promise<string> => {
  switch (config.provider) {
    case 'gemini':
      return callGemini(systemPrompt, userPrompt, config);
    case 'openai':
      return callOpenAI(systemPrompt, userPrompt, config);
    case 'anthropic':
      return callAnthropic(systemPrompt, userPrompt, config);
    case 'groq':
      return callGroq(systemPrompt, userPrompt, config);
    case 'ollama':
      return callOllama(systemPrompt, userPrompt, config);
    case 'huggingface':
      return callHuggingFace(systemPrompt, userPrompt, config);
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
};

const callGemini = async (systemPrompt: string, userPrompt: string, config: AIConfig): Promise<string> => {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  
  const response = await ai.models.generateContent({
    model: config.model,
    contents: { parts: [{ text: userPrompt }] },
    config: {
      systemInstruction: systemPrompt,
    },
  });
  
  return response.text || "";
};

const callOpenAI = async (systemPrompt: string, userPrompt: string, config: AIConfig): Promise<string> => {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: config.temperature ?? 0.3,
      max_tokens: config.maxTokens || 4096
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI API failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
};

const callAnthropic = async (systemPrompt: string, userPrompt: string, config: AIConfig): Promise<string> => {
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
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Anthropic API failed: ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || "";
};

const callGroq = async (systemPrompt: string, userPrompt: string, config: AIConfig): Promise<string> => {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: config.temperature ?? 0.3,
      max_tokens: config.maxTokens || 8192
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Groq API failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
};

const callOllama = async (systemPrompt: string, userPrompt: string, config: AIConfig): Promise<string> => {
  const endpoint = config.ollamaEndpoint || 'http://localhost:11434';
  
  const response = await fetch(`${endpoint}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.message?.content || "";
};

const callHuggingFace = async (systemPrompt: string, userPrompt: string, config: AIConfig): Promise<string> => {
  const response = await fetch(`https://api-inference.huggingface.co/models/${config.model}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      inputs: `${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant:`,
      parameters: {
        max_new_tokens: config.maxTokens || 4096,
        temperature: config.temperature ?? 0.3,
        return_full_text: false
      }
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HuggingFace API failed: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data[0]?.generated_text : data.generated_text || "";
};

/**
 * Parse analysis response from text format
 */
const parseAnalysisResponse = (text: string): AnalysisResult => {
  if (!text?.trim()) throw new Error("Empty response from AI in Analysis step");
  
  // Try to extract labeled fields
  const getField = (label: string): string => {
    const regex = new RegExp(`${label}:\\s*(.+?)(?=\\n[A-Z_]+:|$)`, 'is');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  };
  
  const getListField = (label: string): string[] => {
    const value = getField(label);
    if (!value) return [];
    // Split by commas, "and", or newlines with bullets
    return value
      .split(/[,\n]|(?:\band\b)/)
      .map(s => s.replace(/^[\s\-\*\d\.]+/, '').replace(/[\[\]]/g, '').trim())
      .filter(s => s.length > 0);
  };
  
  const intent = getField('INTENT') || getField('Intent') || 'Paper analysis intent not extracted';
  const novelty = getField('NOVELTY') || getField('Novelty') || 'Paper novelty not extracted';
  const core_algorithms = getListField('CORE_ALGORITHMS') || getListField('Core Algorithms') || ['Algorithm'];
  const complexity = (getField('COMPLEXITY') || getField('Complexity') || 'Moderate') as 'Simple' | 'Moderate' | 'Complex';
  const dependencies = getListField('DEPENDENCIES') || getListField('Dependencies') || [];
  
  // Validate we got something useful
  if (intent === 'Paper analysis intent not extracted' && novelty === 'Paper novelty not extracted') {
    // Try JSON fallback
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as AnalysisResult;
      }
    } catch {}
    
    // Return a basic analysis based on raw text
    console.warn("Could not parse structured analysis, using fallback");
    return {
      intent: text.substring(0, 200) || 'See paper for details',
      novelty: 'Novel approach described in paper',
      core_algorithms: ['Main Algorithm'],
      complexity: 'Moderate',
      dependencies: []
    };
  }
  
  return { intent, novelty, core_algorithms, complexity, dependencies };
};

/**
 * Parse design response from text format
 */
const parseDesignResponse = (text: string): DesignResult => {
  if (!text?.trim()) throw new Error("Empty response from AI in Design step");
  
  const getField = (label: string): string => {
    const regex = new RegExp(`${label}:\\s*(.+?)(?=\\n[A-Z_]+:|$)`, 'is');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  };
  
  const getListSection = (label: string): string[] => {
    const regex = new RegExp(`${label}:([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`, 'i');
    const match = text.match(regex);
    if (!match) return [];
    return match[1]
      .split('\n')
      .map(s => s.replace(/^[\s\-\*]+/, '').trim())
      .filter(s => s.length > 0);
  };
  
  const architecture = getField('ARCHITECTURE') || getField('Architecture') || 'Toy implementation of paper algorithm';
  const expectedBehavior = getField('EXPECTED_BEHAVIOR') || getField('Expected Behavior') || 'Implementation demonstrates key concepts';
  
  // Parse simplifications
  const simplificationLines = getListSection('SIMPLIFICATIONS') || getListSection('Simplifications');
  const simplifications = simplificationLines.map(line => {
    const arrowMatch = line.match(/(.+?)\s*(?:->|→|:)\s*(.+?)(?::|$)(.*)?/);
    if (arrowMatch) {
      return {
        original: arrowMatch[1].trim(),
        simplified: arrowMatch[2].trim(),
        rationale: arrowMatch[3]?.trim() || 'Simplifies computation'
      };
    }
    return { original: line, simplified: 'Toy version', rationale: 'Simplification' };
  });
  
  // Parse mock components
  const mockLines = getListSection('MOCK_COMPONENTS') || getListSection('Mock Components');
  const mock_components = mockLines.map(line => {
    const match = line.match(/(.+?)\s*\((.+?)\)\s*:?\s*(.*)/);
    if (match) {
      return {
        name: match[1].trim(),
        type: match[2].trim() as 'generator' | 'model' | 'scorer',
        implementation: match[3]?.trim() || 'Simple implementation'
      };
    }
    return { name: line, type: 'model' as const, implementation: 'Mock implementation' };
  });
  
  // Parse module breakdown
  const moduleLines = getListSection('MODULE_BREAKDOWN') || getListSection('Module Breakdown');
  const module_breakdown = moduleLines.map(line => {
    const arrowMatch = line.match(/(.+?)\s*(?:->|→|:)\s*(.+)/);
    if (arrowMatch) {
      return {
        section: arrowMatch[1].trim(),
        notebook_cell: arrowMatch[2].trim()
      };
    }
    return { section: line, notebook_cell: 'Implementation cell' };
  });
  
  // Validate and provide defaults
  if (!architecture || architecture === 'Toy implementation of paper algorithm') {
    // Try JSON fallback
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as DesignResult;
      }
    } catch {}
  }
  
  return {
    toy_architecture: architecture,
    simplifications: simplifications.length > 0 ? simplifications : [
      { original: 'Full model', simplified: 'Toy model', rationale: 'Reduces complexity' }
    ],
    mock_components: mock_components.length > 0 ? mock_components : [
      { name: 'ToyModel', type: 'model', implementation: 'Simple neural network' }
    ],
    expected_behavior: expectedBehavior,
    module_breakdown: module_breakdown.length > 0 ? module_breakdown : [
      { section: 'Introduction', notebook_cell: 'Setup and imports' },
      { section: 'Method', notebook_cell: 'Core implementation' },
      { section: 'Results', notebook_cell: 'Evaluation and visualization' }
    ]
  };
};

/**
 * Parse markdown-formatted notebook response
 */
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
  
  // Process parts
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
  
  // Fallback: extract code blocks if no markers found
  if (cells.length === 0) {
    const codeBlockRegex = /```(?:python|py)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
      const textBefore = text.slice(lastIndex, match.index).trim()
        .replace(/---NOTEBOOK_START---.*?(?=```|$)/gis, '')
        .replace(/---NOTEBOOK_END---/gi, '')
        .replace(/TITLE:.*?\n/gi, '')
        .replace(/GUIDE:.*?\n/gi, '')
        .trim();
      
      if (textBefore) {
        cells.push({ cell_type: 'markdown', source: textBefore });
      }
      
      const codeContent = match[1].trim();
      if (codeContent) {
        cells.push({ cell_type: 'code', source: codeContent });
      }
      
      lastIndex = match.index + match[0].length;
    }
  }
  
  if (cells.length < 2) {
    throw new Error(
      "Could not extract notebook cells from the AI response. " +
      "Try disabling Multi-Step Generation or using a different model."
    );
  }
  
  return { guide, notebookName, cells };
};

// ============================================================================
// Multi-Step Orchestrator
// ============================================================================

/**
 * Step 1: Analyze the paper
 */
export const step1Analyze = async (
  paperText: string,
  config: AIConfig,
  onProgress?: ProgressCallback
): Promise<AnalysisResult> => {
  onProgress?.({
    currentStep: 1,
    totalSteps: 3,
    stepName: "Analysis",
    message: "Analyzing paper structure and extracting key concepts..."
  });

  const userPrompt = `Analyze this research paper and extract the required information.\n\nPaper content:\n${paperText.substring(0, 50000)}`;
  
  const response = await callProvider(STEP1_ANALYSIS_PROMPT, userPrompt, config);
  return parseAnalysisResponse(response);
};

/**
 * Step 2: Design the toy architecture
 */
export const step2Design = async (
  paperText: string,
  analysis: AnalysisResult,
  domain: PaperDomain,
  config: AIConfig,
  onProgress?: ProgressCallback
): Promise<DesignResult> => {
  onProgress?.({
    currentStep: 2,
    totalSteps: 3,
    stepName: "Design",
    message: "Designing toy architecture and simplification strategy..."
  });

  const domainContext = DOMAIN_CONTEXTS[domain] || DOMAIN_CONTEXTS['Other'];
  const systemPrompt = STEP2_DESIGN_PROMPT + "\n\n" + domainContext;
  
  const userPrompt = `Based on the following paper analysis, design a toy implementation.

## Paper Analysis
- Intent: ${analysis.intent}
- Novelty: ${analysis.novelty}
- Core Algorithms: ${analysis.core_algorithms.join(', ')}
- Complexity: ${analysis.complexity}
- Dependencies: ${analysis.dependencies.join(', ')}

## Paper Content (for reference)
${paperText.substring(0, 30000)}

Design the toy architecture following the guidelines.`;

  const response = await callProvider(systemPrompt, userPrompt, config);
  return parseDesignResponse(response);
};

/**
 * Step 3: Generate the notebook code
 */
export const step3Generate = async (
  paperText: string,
  analysis: AnalysisResult,
  design: DesignResult,
  domain: PaperDomain,
  config: AIConfig,
  onProgress?: ProgressCallback
): Promise<GeneratedContent> => {
  onProgress?.({
    currentStep: 3,
    totalSteps: 3,
    stepName: "Code Generation",
    message: "Generating complete Jupyter notebook implementation..."
  });

  const domainContext = DOMAIN_CONTEXTS[domain] || DOMAIN_CONTEXTS['Other'];
  
  const userPrompt = `Generate a complete, runnable Jupyter notebook implementing this paper as a toy.

## Paper Analysis
- Intent: ${analysis.intent}
- Novelty: ${analysis.novelty}  
- Core Algorithms: ${analysis.core_algorithms.join(', ')}
- Complexity: ${analysis.complexity}

## Toy Design
Architecture: ${design.toy_architecture}

Simplifications:
${design.simplifications.map(s => `- ${s.original} → ${s.simplified} (${s.rationale})`).join('\n')}

Mock Components:
${design.mock_components.map(c => `- ${c.name} (${c.type}): ${c.implementation}`).join('\n')}

Expected Behavior: ${design.expected_behavior}

Module Breakdown:
${design.module_breakdown.map(m => `- ${m.section} → ${m.notebook_cell}`).join('\n')}

## Domain-Specific Guidance
${domainContext}

## Paper Content
${paperText.substring(0, 40000)}

Generate the complete notebook.${MARKDOWN_NOTEBOOK_INSTRUCTIONS}`;

  const response = await callProvider(SYSTEM_INSTRUCTION, userPrompt, config);
  return parseMarkdownNotebook(response);
};

/**
 * Run the full multi-step generation pipeline
 */
export const generateMultiStep = async (
  file: File,
  config: AIConfig,
  onProgress?: ProgressCallback
): Promise<{
  content: GeneratedContent;
  analysis: AnalysisResult;
  design: DesignResult;
  enrichedDoc: EnrichedDocument;
}> => {
  // Extract enriched document with text and metadata
  onProgress?.({
    currentStep: 0,
    totalSteps: 3,
    stepName: "Preparation",
    message: "Extracting text and metadata from PDF..."
  });
  
  const enrichedDoc = await extractEnrichedDocument(file);
  
  // Step 1: Analyze
  const analysis = await step1Analyze(enrichedDoc.fullText, config, onProgress);
  
  // Step 2: Design
  const design = await step2Design(
    enrichedDoc.fullText, 
    analysis, 
    enrichedDoc.estimatedDomain, 
    config, 
    onProgress
  );
  
  // Step 3: Generate
  const content = await step3Generate(
    enrichedDoc.fullText,
    analysis,
    design,
    enrichedDoc.estimatedDomain,
    config,
    onProgress
  );
  
  return { content, analysis, design, enrichedDoc };
};

/**
 * Quick single-step generation (for backward compatibility)
 */
export const generateSingleStep = async (
  file: File,
  config: AIConfig
): Promise<GeneratedContent> => {
  const enrichedDoc = await extractEnrichedDocument(file);
  const domainContext = DOMAIN_CONTEXTS[enrichedDoc.estimatedDomain] || DOMAIN_CONTEXTS['Other'];
  
  const userPrompt = `Generate a complete Jupyter notebook implementing this research paper as a toy.

Paper Title: ${enrichedDoc.metadata.title}
Domain: ${enrichedDoc.estimatedDomain}
Abstract: ${enrichedDoc.metadata.abstract}

${domainContext}

Paper Content:
${enrichedDoc.fullText.substring(0, 60000)}

${MARKDOWN_NOTEBOOK_INSTRUCTIONS}`;

  const response = await callProvider(SYSTEM_INSTRUCTION, userPrompt, config);
  return parseMarkdownNotebook(response);
};
