/**
 * Multi-Step Generation Orchestrator
 * 
 * Runs entirely in the browser - no backend required.
 * Implements a 3-step pipeline: Analyze → Design → Generate Code
 */

import { AIConfig, GeneratedContent, PaperDomain, EnrichedDocument } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";
import { extractEnrichedDocument } from "./pdfService";

// ============================================================================
// STEP PROMPTS - Embedded directly in TypeScript for browser execution
// ============================================================================

const STEP1_ANALYSIS_PROMPT = `
# Step 1: Paper Analysis

Extract structured information from the research paper to guide implementation planning.

## Required Outputs

1. **Paper Intent**: What problem does it solve? (1-2 sentences)
2. **Novelty**: What's new compared to prior work? (1-2 sentences)  
3. **Core Algorithms**: List 2-4 key algorithms/techniques by name
4. **Complexity Assessment**: Simple | Moderate | Complex
5. **Dependencies**: What existing algorithms/models does it build on?

## Complexity Scale

**Simple**: Single algorithm, few steps, runs quickly, minimal dependencies
**Moderate**: Multi-stage pipeline, moderate dependencies, reasonable training time  
**Complex**: Distributed training, large models, many components

## Output Format (JSON ONLY)

Return ONLY valid JSON with no markdown code fences:
{
  "intent": "Brief problem statement (1-2 sentences)",
  "novelty": "What's new in this paper (1-2 sentences)",
  "core_algorithms": ["Algorithm Name 1", "Algorithm Name 2"],
  "complexity": "Simple | Moderate | Complex",
  "dependencies": ["prerequisite_1", "prerequisite_2"]
}
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

1. **Toy Architecture**: High-level design (3-5 sentences)
2. **Simplification Strategy**: How to simplify each heavy component
3. **Mock Components**: What will be mocked and how
4. **Expected Behavior**: What qualitative trends should we observe?
5. **Module Breakdown**: Map paper sections to notebook cells

## Simplification Strategies

**Neural Networks** → 1-2 hidden layers, 5-50 units, ReLU/tanh
**Datasets** → Generate synthetic with same statistical properties
**Reward Models** → Heuristic scoring with 2-3 features  
**Pretrained Models** → Shallow embeddings or rule-based
**Distributed Systems** → Single-process with print statements

## Output Format (JSON ONLY)

Return ONLY valid JSON with no markdown code fences:
{
  "toy_architecture": "High-level design description",
  "simplifications": [
    {"original": "Heavy component", "simplified": "Toy replacement", "rationale": "Why this works"}
  ],
  "mock_components": [
    {"name": "Component name", "type": "generator|model|scorer", "implementation": "Brief description"}
  ],
  "expected_behavior": "What trends/patterns to expect",
  "module_breakdown": [
    {"section": "Paper section name", "notebook_cell": "Cell purpose/title"}
  ]
}
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
      temperature: 0.3,
      max_tokens: 8192
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
      max_tokens: 8192,
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
      temperature: 0.3,
      max_tokens: 8192
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
        max_new_tokens: 4096,
        temperature: 0.3,
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
 * Parse JSON from AI response (handles markdown code blocks)
 */
const parseJSON = <T>(text: string): T => {
  if (!text?.trim()) throw new Error("Empty response from AI");
  
  // Try direct parse
  try {
    return JSON.parse(text);
  } catch {
    // Try extracting from markdown blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {}
    }
    
    // Try finding JSON object
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {}
    }
    
    throw new Error("Failed to parse AI response as JSON. Please try again.");
  }
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
  return parseJSON<AnalysisResult>(response);
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
  return parseJSON<DesignResult>(response);
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

Generate the complete notebook. Return ONLY valid JSON with this structure:
{
  "guide": "Execution guide explaining the notebook",
  "notebookName": "descriptive_name.ipynb",
  "cells": [
    {"cell_type": "markdown" | "code", "source": "cell content"}
  ]
}`;

  const response = await callProvider(SYSTEM_INSTRUCTION, userPrompt, config);
  return parseJSON<GeneratedContent>(response);
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

Return ONLY valid JSON with this structure:
{
  "guide": "Execution guide",
  "notebookName": "name.ipynb", 
  "cells": [{"cell_type": "markdown"|"code", "source": "content"}]
}`;

  const response = await callProvider(SYSTEM_INSTRUCTION, userPrompt, config);
  return parseJSON<GeneratedContent>(response);
};
