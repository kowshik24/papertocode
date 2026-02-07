import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import ProcessingState from './components/ProcessingState';
import ResultView from './components/ResultView';
import ConfigPanel from './components/ConfigPanel';
import { generateToyImplementation } from './services/geminiService';
import { generateMultiStep, MultiStepProgress, AnalysisResult, DesignResult } from './services/orchestratorService';
import { AppState, GeneratedContent, GenerationError, AIConfig, EnrichedDocument } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<GenerationError | null>(null);
  const [useMultiStep, setUseMultiStep] = useState<boolean>(true);
  const [progress, setProgress] = useState<MultiStepProgress | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [designResult, setDesignResult] = useState<DesignResult | null>(null);
  const [enrichedDoc, setEnrichedDoc] = useState<EnrichedDocument | null>(null);
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    apiKey: ''
  });

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
      } else {
        // Single-step generation (original behavior)
        const result = await generateToyImplementation(file, aiConfig);
        setContent(result);
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-50 to-blue-50 flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C6.5 6.253 2 10.753 2 16.253s4.5 10 10 10 10-4.5 10-10S17.5 6.253 12 6.253z" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-xl text-slate-900 tracking-tight">PaperToCode</h1>
              <p className="text-xs text-slate-500">Transform Research into Notebooks</p>
            </div>
          </div>
          <div className="text-sm text-slate-600 font-medium hidden sm:block bg-blue-50 px-3 py-1 rounded-full">
            🚀 Multi-Provider Supported
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 w-full">
        
        {appState === AppState.IDLE && (
          <div className="w-full max-w-4xl space-y-12 animate-fade-in">
            {/* Hero Section */}
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center px-4 py-2 bg-blue-100 rounded-full mb-2">
                <span className="text-sm font-semibold text-blue-700">✨ AI-Powered Understanding</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Understand papers by<br />
                <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                  building them.
                </span>
              </h2>
              <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Upload a research paper PDF. Our AI extracts core algorithms and builds a runnable, pedagogical Jupyter notebook that teaches you the paper's ideas.
              </p>
            </div>
            
            {/* Configuration & Upload */}
            <div className="space-y-8 bg-white rounded-2xl shadow-xl p-8 md:p-12">
              <ConfigPanel 
                config={aiConfig} 
                onChange={setAiConfig} 
              />
              
              {/* Generation Mode Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <h4 className="font-semibold text-slate-800">Multi-Step Generation</h4>
                  <p className="text-sm text-slate-600">Analyze → Design → Generate (better quality, takes longer)</p>
                </div>
                <button
                  onClick={() => setUseMultiStep(!useMultiStep)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    useMultiStep ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useMultiStep ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <div className="border-t border-slate-100 pt-8">
                <FileUpload 
                  onFileSelect={handleFileSelect} 
                  disabled={!aiConfig.apiKey && aiConfig.provider !== 'ollama'}
                />
              </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="group p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="font-semibold text-slate-900 mb-2">CPU Optimized</div>
                <p className="text-sm text-slate-600">
                  Generated notebooks run on standard Google Colab CPUs. No GPU or expensive resources required.
                </p>
              </div>
              <div className="group p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
                  <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242m-4.243 4.242L9.879 5.879" />
                  </svg>
                </div>
                <div className="font-semibold text-slate-900 mb-2">Toy Components</div>
                <p className="text-sm text-slate-600">
                  Heavy models are replaced with lightweight, educational substitutes you can understand and modify.
                </p>
              </div>
              <div className="group p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C6.5 6.253 2 10.753 2 16.253s4.5 10 10 10 10-4.5 10-10S17.5 6.253 12 6.253z" />
                  </svg>
                </div>
                <div className="font-semibold text-slate-900 mb-2">Pedagogical</div>
                <p className="text-sm text-slate-600">
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
            <div className="p-8 bg-white rounded-2xl shadow-xl border-2 border-red-100">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-100 mb-6">
                <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 text-center">Processing Failed</h3>
              <p className="text-slate-600 text-center mb-6">{error?.message}</p>
              {error?.details && (
                <details className="mb-6">
                  <summary className="cursor-pointer font-semibold text-slate-700 hover:text-slate-900 mb-2">
                    📋 Error Details
                  </summary>
                  <div className="text-xs text-slate-600 bg-red-50 p-4 rounded-lg font-mono border border-red-200 overflow-auto max-h-40">
                    {error.details}
                  </div>
                </details>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 inline-flex justify-center rounded-lg border-2 border-blue-600 shadow-md px-4 py-3 bg-blue-600 text-base font-semibold text-white hover:bg-blue-700 hover:border-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
                >
                  ← Go Back
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
            <div>
              <h4 className="font-semibold text-white mb-2">About</h4>
              <p className="text-sm">Transform research papers into interactive learning experiences.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Supported Providers</h4>
              <p className="text-sm">Gemini, OpenAI, Anthropic, Groq, Ollama, HuggingFace</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Note</h4>
              <p className="text-sm">Your API key is used only in your browser and never stored.</p>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-4 text-center text-xs text-slate-400">
            <p>⚠️ This tool generates toy implementations for educational purposes. Results are approximations and may not match paper performance.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
