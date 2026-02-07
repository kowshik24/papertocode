# PaperToCode

A browser-based tool that transforms academic research papers into runnable Jupyter notebooks. Upload a PDF and get an educational implementation that demonstrates the paper's core algorithms using simplified, CPU-friendly code.

## Features

- **Multi-Provider Support**: Works with Gemini, OpenAI, Anthropic, Groq, Ollama (local), and HuggingFace
- **Multi-Step Generation**: Optional 3-step pipeline (Analyze → Design → Generate) for higher quality output
- **Domain Detection**: Automatically identifies paper domain (ML, NLP, Vision, RL) and applies appropriate simplifications
- **Browser-Only**: No backend required - runs entirely in your browser
- **Educational Output**: Generated notebooks include explanations, visualizations, and step-by-step comments

## Quick Start

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` in your browser.

## Usage

1. Select an AI provider from the dropdown
2. Enter your API key (not required for Ollama)
3. Toggle "Multi-Step Generation" for better quality (takes longer)
4. Upload a research paper PDF
5. Download the generated `.ipynb` notebook

## Supported Providers

| Provider | API Key Required | Notes |
|----------|------------------|-------|
| Google Gemini | Yes | Best PDF support (native) |
| OpenAI | Yes | GPT-4o has vision support |
| Anthropic | Yes | Claude 3 models supported |
| Groq | Yes | Fast inference |
| Ollama | No | Local models, requires Ollama running |
| HuggingFace | Yes | Inference API |

## Project Structure

```
├── App.tsx                 # Main application component
├── components/
│   ├── ConfigPanel.tsx     # Provider and model selection
│   ├── FileUpload.tsx      # PDF upload handler
│   ├── ProcessingState.tsx # Progress indicator
│   └── ResultView.tsx      # Notebook preview and download
├── services/
│   ├── geminiService.ts    # Core generation logic for all providers
│   ├── orchestratorService.ts # Multi-step generation pipeline
│   ├── pdfService.ts       # PDF text extraction
│   └── modelService.ts     # Model fetching utilities
├── constants.ts            # System prompts and templates
└── types.ts                # TypeScript type definitions
```

## Configuration

For Ollama users, ensure the server is running with CORS enabled:

```bash
OLLAMA_ORIGINS='*' ollama serve
```

## Limitations

- Generated notebooks are simplified implementations for educational purposes
- Performance will not match original paper results
- Scanned PDFs may not extract text properly (Gemini handles these best)
- Some providers may have rate limits or CORS restrictions

## License

MIT
