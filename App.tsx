import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import ProcessingState from './components/ProcessingState';
import ResultView from './components/ResultView';
import ConfigPanel from './components/ConfigPanel';
import { generateToyImplementation } from './services/geminiService';
import { AppState, GeneratedContent, GenerationError, AIConfig } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<GenerationError | null>(null);
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    apiKey: ''
  });

  const handleFileSelect = async (file: File) => {
    if (!aiConfig.apiKey.trim()) {
      alert(`Please enter your ${aiConfig.provider} API Key first.`);
      return;
    }

    setAppState(AppState.PROCESSING);
    setError(null);
    try {
      const result = await generateToyImplementation(file, aiConfig);
      setContent(result);
      setAppState(AppState.COMPLETE);
    } catch (err: any) {
      console.error(err);
      setError({
        message: "Failed to process research paper.",
        details: err.message
      });
      setAppState(AppState.ERROR);
    }
  };

  const handleReset = () => {
    setAppState(AppState.IDLE);
    setContent(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h1 className="font-bold text-xl text-slate-900 tracking-tight">PaperToCode</h1>
          </div>
          <div className="text-sm text-slate-500 hidden sm:block">
            Multi-Provider Support
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        
        {appState === AppState.IDLE && (
          <div className="w-full max-w-3xl space-y-12 animate-fade-in-up">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-extrabold text-slate-900 sm:text-5xl tracking-tight">
                Understand papers by <br />
                <span className="text-blue-600">building them.</span>
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Upload a research paper PDF. We'll extract the core algorithms and build a runnable, pedagogical Jupyter notebook for you.
              </p>
            </div>
            
            <div className="space-y-8">
              <ConfigPanel 
                config={aiConfig} 
                onChange={setAiConfig} 
              />
              <FileUpload 
                onFileSelect={handleFileSelect} 
                disabled={!aiConfig.apiKey}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center text-sm text-slate-500 max-w-4xl mx-auto pt-8">
              <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                <div className="font-semibold text-slate-900 mb-1">CPU Optimized</div>
                Generated notebooks run on standard Google Colab CPUs. No GPU required.
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                <div className="font-semibold text-slate-900 mb-1">Toy Components</div>
                Heavy models are replaced with lightweight, educational substitutes.
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                <div className="font-semibold text-slate-900 mb-1">Pedagogical</div>
                Focuses on step-by-step understanding, transparency, and clarity.
              </div>
            </div>
          </div>
        )}

        {appState === AppState.PROCESSING && (
          <ProcessingState />
        )}

        {appState === AppState.COMPLETE && content && (
          <ResultView content={content} onReset={handleReset} />
        )}

        {appState === AppState.ERROR && (
          <div className="text-center max-w-md mx-auto p-8 bg-white rounded-xl shadow-sm border border-red-100">
             <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">Generation Failed</h3>
            <p className="text-slate-500 mb-6">{error?.message}</p>
            {error?.details && (
              <details className="text-left text-xs text-red-500 bg-red-50 p-3 rounded mb-6 overflow-auto max-h-32">
                <summary className="cursor-pointer font-medium mb-1">Technical Details</summary>
                {error.details}
              </details>
            )}
            <button
              onClick={handleReset}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
            >
              Try Again
            </button>
          </div>
        )}

      </main>

      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
           <p className="text-center text-xs text-slate-400">
             Disclaimer: This tool generates toy implementations for educational purposes. Results are approximations.
           </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
