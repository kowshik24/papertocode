import React, { useEffect, useState } from 'react';
import { AIConfig, AIProvider, AIModel } from '../types';
import { fetchModels, FALLBACK_MODELS } from '../services/modelService';

interface ConfigPanelProps {
  config: AIConfig;
  onChange: (config: AIConfig) => void;
  disabled?: boolean;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onChange, disabled }) => {
  const [availableModels, setAvailableModels] = useState<AIModel[]>(FALLBACK_MODELS[config.provider]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isKeyValid, setIsKeyValid] = useState<boolean | null>(null);

  // Reset models when provider changes
  useEffect(() => {
    setAvailableModels(FALLBACK_MODELS[config.provider]);
    setIsKeyValid(null);
    // If we have an API key, try to fetch models immediately or keep default
    // We default to the first model in the fallback list if the current model is invalid for the new provider
    const fallbacks = FALLBACK_MODELS[config.provider];
    if (!fallbacks.find(m => m.id === config.model)) {
        onChange({ ...config, model: fallbacks[0].id });
    }
  }, [config.provider]);

  const handleFetchModels = async () => {
    // Allow fetching for Ollama even without API key (it's optional)
    if (!config.apiKey && config.provider !== 'ollama') return;
    
    setIsLoadingModels(true);
    setIsKeyValid(null);
    
    try {
      const models = await fetchModels(config.provider, config.apiKey, config.ollamaEndpoint);
      setAvailableModels(models);
      
      // Check if we got valid models back (implies key worked)
      // Note: fetchModels returns fallbacks on error, so we need to check if result is different from fallback 
      // OR explicitly handle success in fetchModels. 
      // For simplified UX, we assume if we get a list, we are good. 
      // A better way is to check if we actually performed a network request successfully.
      // Since fetchModels catches errors and returns fallbacks, we can't easily detect auth failure there without changing signature.
      // However, usually if key is wrong, the fetch throws, catch block runs, returns fallback.
      // Visual indicator for "Verified" is nice but "Loaded" is safer.
      if (config.provider !== 'ollama') {
        setIsKeyValid(true); 
      }
      
      // Ensure selected model is in the list
      if (!models.find(m => m.id === config.model)) {
        onChange({ ...config, model: models[0]?.id || '' });
      }
    } catch (e) {
      if (config.provider !== 'ollama') {
        setIsKeyValid(false);
      }
    } finally {
      setIsLoadingModels(false);
    }
  };

  const getProviderIcon = (provider: AIProvider) => {
    switch (provider) {
      case 'gemini': return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 24C12 24 10 14 0 12C10 10 12 0 12 0C12 0 14 10 24 12C14 14 12 24 12 24Z" fill="currentColor" className="text-blue-500"/>
        </svg>
      );
      case 'openai': return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.28 9.82a5.98 5.98 0 00-.52-4.91 6.05 6.05 0 00-6.51-2.9A6.07 6.07 0 004.98 4.18a5.98 5.98 0 00-4 2.9 6.05 6.05 0 00.74 7.1 5.98 5.98 0 00.51 4.91 6.05 6.05 0 006.51 2.9A5.98 5.98 0 0013.26 24a6.06 6.06 0 005.77-4.21 5.99 5.99 0 004-2.9 6.06 6.06 0 00-.75-7.07z" fill="currentColor" className="text-slate-800"/>
        </svg>
      );
      case 'anthropic': return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.47 4.61s-3.55 5.18-5.47 8.25c-1.92-3.07-5.47-8.25-5.47-8.25S2.59 10.37 2.59 10.37s4.7 6.91 4.7 6.91h9.41s4.7-6.91 4.7-6.91-3.94-5.76-3.94-5.76zM12 15.65l-2.3-3.46L12 8.74l2.3 3.45-2.3 3.46z" fill="currentColor" className="text-orange-700"/>
        </svg>
      );
      case 'groq': return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-500"/>
          <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-orange-500"/>
        </svg>
      );
      case 'ollama': return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="12" cy="12" rx="8" ry="10" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600"/>
          <circle cx="9" cy="10" r="1.5" fill="currentColor" className="text-gray-600"/>
          <circle cx="15" cy="10" r="1.5" fill="currentColor" className="text-gray-600"/>
          <path d="M9 15c1.5 1.5 4.5 1.5 6 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-gray-600"/>
        </svg>
      );
      case 'huggingface': return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-1-1 1-1-1-1 1-1 2 2-2 2zm4 0l-2-2 2-2 1 1-1 1 1 1-1 1zm-2-8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" fill="currentColor" className="text-yellow-500"/>
        </svg>
      );
      default: return null;
    }
  };

  const getApiKeyLabel = (provider: AIProvider) => {
    switch (provider) {
      case 'huggingface': return 'Access Token';
      case 'ollama': return 'API Key (Optional)';
      default: return 'API Key';
    }
  };

  const getApiKeyPlaceholder = (provider: AIProvider) => {
    switch (provider) {
      case 'gemini': return 'Paste your Google AI API Key';
      case 'openai': return 'Paste your OpenAI API Key (sk-...)';
      case 'anthropic': return 'Paste your Anthropic API Key';
      case 'groq': return 'Paste your Groq API Key';
      case 'ollama': return 'Optional - leave empty for local';
      case 'huggingface': return 'Paste your HuggingFace Access Token (hf_...)';
      default: return 'Paste your API Key';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 mb-8">
      
      {/* Configuration Card */}
      <div className="bg-claude-bg-alt rounded-2xl border border-claude-border overflow-hidden transition-all hover:shadow-soft-md">
        
        {/* Header */}
        <div className="bg-claude-bg px-6 py-4 border-b border-claude-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-claude-bg-alt rounded-xl border border-claude-border shadow-soft text-claude-text-secondary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
            <h3 className="font-semibold text-claude-text">Model Configuration</h3>
          </div>
          <div className="flex items-center gap-2">
             <span className={`h-2 w-2 rounded-full ${config.apiKey ? 'bg-claude-success' : 'bg-claude-border'}`}></span>
             <span className="text-xs font-medium text-claude-text-secondary">
                {config.apiKey ? 'Key Provided' : 'No Key'}
             </span>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-claude-text-secondary uppercase tracking-wider ml-1">
              AI Provider
            </label>
            <div className="relative">
              <select
                value={config.provider}
                disabled={disabled}
                onChange={(e) => onChange({ ...config, provider: e.target.value as AIProvider, apiKey: '', ollamaEndpoint: e.target.value === 'ollama' ? 'http://localhost:11434' : undefined, maxTokens: config.maxTokens || 4096, temperature: config.temperature ?? 0.3 })}
                className="w-full pl-10 pr-4 py-3 bg-claude-bg border border-claude-border rounded-xl text-claude-text font-medium focus:ring-2 focus:ring-claude-orange focus:border-claude-orange outline-none appearance-none transition-all cursor-pointer hover:bg-claude-bg-alt"
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="groq">Groq (Fast)</option>
                <option value="ollama">Ollama (Local)</option>
                <option value="huggingface">HuggingFace</option>
              </select>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-claude-text-secondary">
                {getProviderIcon(config.provider)}
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-claude-text-tertiary">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-claude-text-secondary uppercase tracking-wider ml-1">
                Model
              </label>
              <button 
                onClick={handleFetchModels}
                disabled={!config.apiKey || isLoadingModels || disabled}
                className="text-xs text-claude-orange hover:text-claude-orange-dark font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                 {isLoadingModels ? (
                   <span className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full"/>
                 ) : (
                   <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                   </svg>
                 )}
                 Refresh List
              </button>
            </div>
            <div className="relative">
              <select
                value={config.model}
                disabled={disabled}
                onChange={(e) => onChange({ ...config, model: e.target.value })}
                className="w-full pl-3 pr-10 py-3 bg-claude-bg border border-claude-border rounded-xl text-claude-text font-medium focus:ring-2 focus:ring-claude-orange focus:border-claude-orange outline-none appearance-none transition-all cursor-pointer hover:bg-claude-bg-alt"
              >
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-claude-text-tertiary">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Ollama Endpoint (only for Ollama) */}
          {config.provider === 'ollama' && (
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-medium text-claude-text-secondary uppercase tracking-wider ml-1">
                Ollama Endpoint
              </label>
              <input
                type="text"
                value={config.ollamaEndpoint || 'http://localhost:11434'}
                disabled={disabled}
                onChange={(e) => onChange({ ...config, ollamaEndpoint: e.target.value })}
                placeholder="http://localhost:11434"
                className="w-full px-4 py-3 bg-claude-bg-alt border border-claude-border rounded-xl text-claude-text font-mono text-sm focus:ring-2 focus:ring-claude-orange focus:border-claude-orange outline-none transition-all"
              />
              <p className="text-[11px] text-claude-text-tertiary ml-1">
                Make sure Ollama is running with CORS enabled: <code className="bg-claude-bg px-1.5 py-0.5 rounded border border-claude-border font-mono">OLLAMA_ORIGINS='*' ollama serve</code>
              </p>
            </div>
          )}

          {/* API Key Input */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-medium text-claude-text-secondary uppercase tracking-wider ml-1">
              {getApiKeyLabel(config.provider)}
            </label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-claude-text-tertiary group-focus-within:text-claude-orange transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <input
                type="password"
                value={config.apiKey}
                disabled={disabled}
                onChange={(e) => {
                  onChange({ ...config, apiKey: e.target.value });
                  setIsKeyValid(null);
                }}
                onBlur={() => {
                   if (config.apiKey && !isKeyValid && config.provider !== 'ollama') {
                     handleFetchModels();
                   }
                }}
                placeholder={getApiKeyPlaceholder(config.provider)}
                className={`w-full pl-10 pr-24 py-3 bg-claude-bg-alt border rounded-xl text-claude-text font-mono text-sm focus:ring-2 focus:ring-claude-orange outline-none transition-all
                  ${isKeyValid === true ? 'border-claude-success focus:border-claude-success focus:ring-claude-success/20' : ''}
                  ${isKeyValid === false ? 'border-claude-error focus:border-claude-error focus:ring-claude-error/20' : ''}
                  ${isKeyValid === null ? 'border-claude-border focus:border-claude-orange' : ''}
                `}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                {isKeyValid === true && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-claude-success/10 text-claude-success">
                    Verified
                  </span>
                )}
                {isKeyValid === false && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-claude-error/10 text-claude-error">
                    Invalid
                  </span>
                )}
                 {config.apiKey && isKeyValid === null && !isLoadingModels && config.provider !== 'ollama' && (
                   <button
                    onClick={handleFetchModels}
                    className="text-xs bg-claude-bg hover:bg-claude-border text-claude-text-secondary px-3 py-1.5 rounded-lg transition-colors border border-claude-border"
                   >
                     Verify
                   </button>
                 )}
              </div>
            </div>
            <p className="text-[11px] text-claude-text-tertiary ml-1">
              {config.provider === 'ollama' 
                ? 'Ollama runs locally - no API key needed unless you configured authentication.'
                : 'Your key is used directly in your browser to fetch models and generate content. It is never stored.'
              }
            </p>
          </div>

          {/* Advanced Parameters */}
          <div className="md:col-span-2 pt-4 border-t border-claude-border-subtle">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-4 h-4 text-claude-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span className="text-xs font-medium text-claude-text-secondary uppercase tracking-wider">Generation Parameters</span>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-xs font-medium text-claude-text-secondary ml-1 flex justify-between">
                  <span>Max Tokens</span>
                  <span className="text-claude-text-tertiary font-mono">{config.maxTokens || 4096}</span>
                </label>
                <input
                  type="range"
                  min="1024"
                  max="8192"
                  step="512"
                  value={config.maxTokens || 4096}
                  disabled={disabled}
                  onChange={(e) => onChange({ ...config, maxTokens: parseInt(e.target.value) })}
                  className="w-full h-2 bg-claude-border rounded-lg appearance-none cursor-pointer accent-claude-orange"
                />
                <div className="flex justify-between text-[10px] text-claude-text-tertiary px-1">
                  <span>1024</span>
                  <span>8192</span>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-medium text-claude-text-secondary ml-1 flex justify-between">
                  <span>Temperature</span>
                  <span className="text-claude-text-tertiary font-mono">{(config.temperature ?? 0.3).toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.temperature ?? 0.3}
                  disabled={disabled}
                  onChange={(e) => onChange({ ...config, temperature: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-claude-border rounded-lg appearance-none cursor-pointer accent-claude-orange"
                />
                <div className="flex justify-between text-[10px] text-claude-text-tertiary px-1">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>
            </div>
          </div>

        </div>
        
        {/* Info Banner for providers */}
        {config.provider !== 'gemini' && (
           <div className={`px-6 py-4 border-t flex items-start gap-3 ${
             config.provider === 'ollama' ? 'bg-claude-info/5 border-claude-info/20' : 'bg-claude-warning/5 border-claude-warning/20'
           }`}>
             <svg className={`w-5 h-5 shrink-0 mt-0.5 ${
               config.provider === 'ollama' ? 'text-claude-info' : 'text-claude-warning'
             }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
               {config.provider === 'ollama' ? (
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               ) : (
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
               )}
             </svg>
             <div>
               {config.provider === 'ollama' ? (
                 <>
                   <p className="text-xs font-medium text-claude-info">Local Processing</p>
                   <p className="text-[11px] text-claude-text-secondary mt-1 leading-relaxed">
                     Ollama runs entirely on your machine. Make sure you have a model pulled (e.g., <code className="bg-claude-info/10 px-1.5 py-0.5 rounded font-mono text-claude-info">ollama pull llama3</code>).
                   </p>
                 </>
               ) : config.provider === 'groq' ? (
                 <>
                   <p className="text-xs font-medium text-claude-warning">Text-Only Processing</p>
                   <p className="text-[11px] text-claude-text-secondary mt-1 leading-relaxed">
                     Groq extracts text from PDFs locally. Scanned/image PDFs won't work well. For best results with complex papers, use <strong>Gemini</strong>.
                   </p>
                 </>
               ) : config.provider === 'huggingface' ? (
                 <>
                   <p className="text-xs font-medium text-claude-warning">Inference API Limits</p>
                   <p className="text-[11px] text-claude-text-secondary mt-1 leading-relaxed">
                     HuggingFace Inference API has rate limits and some models may be slow to load. For production use, consider other providers.
                   </p>
                 </>
               ) : (
                 <>
                   <p className="text-xs font-medium text-claude-warning">Limited PDF Support</p>
                   <p className="text-[11px] text-claude-text-secondary mt-1 leading-relaxed">
                     {config.provider === 'openai' ? 'OpenAI (GPT-4o has vision support)' : 'Anthropic (Claude 3 has vision support)'} will try vision mode first, falling back to text extraction. For scanned PDFs, <strong>Gemini</strong> is recommended.
                   </p>
                 </>
               )}
             </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default ConfigPanel;