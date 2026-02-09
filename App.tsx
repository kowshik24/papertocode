import React, { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import ProcessingState from './components/ProcessingState';
import ResultView from './components/ResultView';
import ConfigPanel from './components/ConfigPanel';
import ThemeToggle from './components/ThemeToggle';
import { generateToyImplementation } from './services/geminiService';
import { generateMultiStep, MultiStepProgress, AnalysisResult, DesignResult } from './services/orchestratorService';
import { AppState, GeneratedContent, GenerationError, AIConfig, EnrichedDocument } from './types';
import { loadConfig, saveConfig, loadTheme, applyTheme, addRecentPaper, addToHistory } from './utils/storage';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<GenerationError | null>(null);
  const [progress, setProgress] = useState<MultiStepProgress | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [designResult, setDesignResult] = useState<DesignResult | null>(null);
  const [enrichedDoc, setEnrichedDoc] = useState<EnrichedDocument | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  
  // Load saved settings on initial render
  const savedData = loadConfig();
  const [useMultiStep, setUseMultiStep] = useState<boolean>(savedData?.useMultiStep ?? true);
  const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
    if (savedData?.config) {
      // Merge saved config with defaults (in case some keys are missing)
      return {
        provider: savedData.config.provider || 'gemini',
        model: savedData.config.model || 'gemini-2.0-flash',
        apiKey: savedData.config.apiKey || '',
        maxTokens: savedData.config.maxTokens || 4096,
        temperature: savedData.config.temperature ?? 0.3,
        ollamaEndpoint: savedData.config.ollamaEndpoint,
      };
    }
    return {
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      apiKey: '',
      maxTokens: 4096,
      temperature: 0.3
    };
  });

  // Apply saved theme on mount
  useEffect(() => {
    applyTheme(loadTheme());
  }, []);

  // Save config whenever it changes
  useEffect(() => {
    saveConfig(aiConfig, useMultiStep);
  }, [aiConfig, useMultiStep]);

  const handleFileSelect = async (file: File) => {
    // Check API key (except for Ollama which doesn't need one)
    if (!aiConfig.apiKey.trim() && aiConfig.provider !== 'ollama') {
      setError({
        message: `Please enter your ${aiConfig.provider} API Key first.`,
        details: 'No API key detected in configuration.'
      });
      setAppState(AppState.ERROR);
      return;
    }

    setAppState(AppState.PROCESSING);
    setError(null);
    setProgress(null);
    setAnalysisResult(null);
    setDesignResult(null);
    setEnrichedDoc(null);
    setCurrentFileName(file.name);

    // Add to recent papers
    addRecentPaper(file.name);

    try {
      if (useMultiStep) {
        // Multi-step generation with progress tracking
        const result = await generateMultiStep(file, aiConfig, (p) => {
          setProgress(p);
        });
        setContent(result.content);
        setAnalysisResult(result.analysis);
        setDesignResult(result.design);
        setEnrichedDoc(result.enrichedDoc);

        // Add successful generation to history
        addToHistory({
          paperName: file.name,
          provider: aiConfig.provider,
          model: aiConfig.model,
          multiStep: true
        });
      } else {
        // Single-step generation (original behavior)
        const result = await generateToyImplementation(file, aiConfig);
        setContent(result);

        // Add successful generation to history
        addToHistory({
          paperName: file.name,
          provider: aiConfig.provider,
          model: aiConfig.model,
          multiStep: false
        });
      }
      setAppState(AppState.COMPLETE);
    } catch (err: any) {
      console.error(err);
      setError({
        message: "Failed to process research paper.",
        details: err.message || 'Unknown error occurred during processing.'
      });
      setAppState(AppState.ERROR);
    }
  };

  const handleReset = () => {
    setAppState(AppState.IDLE);
    setContent(null);
    setError(null);
    setProgress(null);
    setAnalysisResult(null);
    setDesignResult(null);
    setEnrichedDoc(null);
    setCurrentFileName('');
  };

  return (
    <div className="min-h-screen bg-claude-bg flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 glass border-b border-claude-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logo/logo.png" 
              alt="PaperToCode Logo" 
              className="w-10 h-10 rounded-xl shadow-soft hover:shadow-soft-md transition-all duration-300"
            />
            <div>
              <h1 className="font-semibold text-xl text-claude-text tracking-tight font-display">PaperToCode</h1>
              <p className="text-xs text-claude-text-secondary">Transform Research into Notebooks</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-claude-text-secondary dark:text-claude-dark-text-secondary font-medium hidden sm:flex items-center gap-2 bg-claude-bg-alt dark:bg-claude-dark-bg-alt border border-claude-border dark:border-claude-dark-border px-4 py-2 rounded-xl shadow-soft">
              <span className="text-claude-orange">✽</span> Multi-Provider Supported
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 w-full">
        
        {appState === AppState.IDLE && (
          <div className="w-full max-w-4xl space-y-16 animate-fade-in">
            {/* Hero Section */}
            <div className="text-center space-y-8">
              <div className="inline-flex items-center justify-center px-4 py-2 bg-claude-bg-alt border border-claude-border rounded-full shadow-soft">
                <span className="text-sm font-medium text-claude-text-secondary"><span className="text-claude-orange">✽</span> AI-Powered Understanding</span>
              </div>
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-semibold text-claude-text tracking-tight leading-[1.1] font-display">
                Understand papers by<br />
                <span className="text-gradient">
                  building them.
                </span>
              </h2>
              <p className="text-lg md:text-xl text-claude-text-secondary max-w-2xl mx-auto leading-relaxed">
                Upload a research paper PDF. Our AI extracts core algorithms and builds a runnable, pedagogical Jupyter notebook that teaches you the paper's ideas.
              </p>
            </div>
            
            {/* Configuration & Upload */}
            <div className="card space-y-8 p-8 md:p-12">
              <ConfigPanel 
                config={aiConfig} 
                onChange={setAiConfig} 
              />
              
              {/* Generation Mode Toggle */}
              <div className="flex items-center justify-between p-5 bg-claude-bg rounded-2xl border border-claude-border">
                <div>
                  <h4 className="font-semibold text-claude-text">Multi-Step Generation</h4>
                  <p className="text-sm text-claude-text-secondary mt-1">Analyze → Design → Generate (better quality, takes longer)</p>
                </div>
                <button
                  onClick={() => setUseMultiStep(!useMultiStep)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 ${
                    useMultiStep ? 'bg-claude-orange' : 'bg-claude-border'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-soft transition-transform duration-300 ${
                      useMultiStep ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <div className="border-t border-claude-border-subtle pt-8">
                <FileUpload 
                  onFileSelect={handleFileSelect} 
                  disabled={!aiConfig.apiKey && aiConfig.provider !== 'ollama'}
                />
              </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card card-interactive group p-6">
                <div className="w-12 h-12 bg-claude-bg rounded-xl flex items-center justify-center mb-5 border border-claude-border group-hover:border-claude-orange transition-colors">
                  <svg className="w-6 h-6 text-claude-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="font-semibold text-claude-text mb-2">CPU Optimized</div>
                <p className="text-sm text-claude-text-secondary leading-relaxed">
                  Generated notebooks run on standard Google Colab CPUs. No GPU or expensive resources required.
                </p>
              </div>
              <div className="card card-interactive group p-6">
                <div className="w-12 h-12 bg-claude-bg rounded-xl flex items-center justify-center mb-5 border border-claude-border group-hover:border-claude-orange transition-colors">
                  <svg className="w-6 h-6 text-claude-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242m-4.243 4.242L9.879 5.879" />
                  </svg>
                </div>
                <div className="font-semibold text-claude-text mb-2">Toy Components</div>
                <p className="text-sm text-claude-text-secondary leading-relaxed">
                  Heavy models are replaced with lightweight, educational substitutes you can understand and modify.
                </p>
              </div>
              <div className="card card-interactive group p-6">
                <div className="w-12 h-12 bg-claude-bg rounded-xl flex items-center justify-center mb-5 border border-claude-border group-hover:border-claude-orange transition-colors">
                  <svg className="w-6 h-6 text-claude-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C6.5 6.253 2 10.753 2 16.253s4.5 10 10 10 10-4.5 10-10S17.5 6.253 12 6.253z" />
                  </svg>
                </div>
                <div className="font-semibold text-claude-text mb-2">Pedagogical</div>
                <p className="text-sm text-claude-text-secondary leading-relaxed">
                  Every step is explained with clear comments, prints, and visualizations for learning.
                </p>
              </div>
            </div>
          </div>
        )}

        {appState === AppState.PROCESSING && (
          <ProcessingState progress={progress} />
        )}

        {appState === AppState.COMPLETE && content && (
          <ResultView 
            content={content} 
            onReset={handleReset}
            analysis={analysisResult}
            design={designResult}
            enrichedDoc={enrichedDoc}
          />
        )}

        {appState === AppState.ERROR && (
          <div className="w-full max-w-lg mx-auto">
            <div className="card p-8 border-claude-error/20">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-2xl bg-claude-error/10 mb-6">
                <svg className="h-7 w-7 text-claude-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-claude-text mb-2 text-center">Processing Failed</h3>
              <p className="text-claude-text-secondary text-center mb-6">{error?.message}</p>
              {error?.details && (
                <details className="mb-6">
                  <summary className="cursor-pointer font-medium text-claude-text hover:text-claude-orange mb-2 transition-colors">
                    <span className="ml-1">Error Details</span>
                  </summary>
                  <div className="text-xs text-claude-text-secondary bg-claude-error/5 p-4 rounded-xl font-mono border border-claude-error/20 overflow-auto max-h-40 mt-2">
                    {error.details}
                  </div>
                </details>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="btn-primary flex-1 inline-flex justify-center items-center gap-2"
                >
                  ← Go Back
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-claude-text text-claude-bg border-t border-claude-dark-border mt-auto">
        <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2"><span className="text-claude-orange">✽</span> About</h4>
              <p className="text-sm text-claude-dark-text-secondary leading-relaxed">Transform research papers into interactive learning experiences.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2"><span className="text-claude-orange">✽</span> Supported Providers</h4>
              <p className="text-sm text-claude-dark-text-secondary leading-relaxed">Gemini, OpenAI, Anthropic, Groq, Ollama, HuggingFace</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2"><span className="text-claude-orange">✽</span> Note</h4>
              <p className="text-sm text-claude-dark-text-secondary leading-relaxed">Your API key is used only in your browser and never stored.</p>
            </div>
          </div>
          <div className="border-t border-claude-dark-border pt-6 text-center text-xs text-claude-dark-text-tertiary">
            <p>This tool generates toy implementations for educational purposes. Results are approximations and may not match paper performance.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
