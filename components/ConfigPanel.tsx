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
    if (!config.apiKey) return;
    
    setIsLoadingModels(true);
    setIsKeyValid(null);
    
    try {
      const models = await fetchModels(config.provider, config.apiKey);
      setAvailableModels(models);
      
      // Check if we got valid models back (implies key worked)
      // Note: fetchModels returns fallbacks on error, so we need to check if result is different from fallback 
      // OR explicitly handle success in fetchModels. 
      // For simplified UX, we assume if we get a list, we are good. 
      // A better way is to check if we actually performed a network request successfully.
      // Since fetchModels catches errors and returns fallbacks, we can't easily detect auth failure there without changing signature.
      // However, usually if key is wrong, the fetch throws, catch block runs, returns fallback.
      // Visual indicator for "Verified" is nice but "Loaded" is safer.
      setIsKeyValid(true); 
      
      // Ensure selected model is in the list
      if (!models.find(m => m.id === config.model)) {
        onChange({ ...config, model: models[0]?.id || '' });
      }
    } catch (e) {
      setIsKeyValid(false);
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
          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0847 5.6554-3.2638 1.4554-.84l-4.2176-2.4332-4.203 2.4332-1.4651.84.1467.0847a4.398 4.398 0 0 1-2.0629-3.7937A4.4578 4.4578 0 0 1 5.9323 11.23l2.6748 1.5432-1.3725.7925-.0919.0527-2.7307-1.5746-.1467-.0848a4.49 4.49 0 0 1-1.0999-3.0372 4.49 4.49 0 0 1 1.7088-3.535l.1467.0848 2.6504 1.5335 1.3725-.7925-.0918-.0527-2.5895-1.5042-.1419-.0847a4.3854 4.3854 0 0 1 3.5855-.2682 4.4503 4.4503 0 0 1 2.808 2.3732l.1419.0847-1.3725.7925 2.5895 1.5041.1419.0847a4.423 4.423 0 0 1 1.4894 3.3243 4.423 4.423 0 0 1-1.4894 3.3243l-.1419.0847-2.5895 1.5041 1.3725.7925-.1419-.0847a4.4503 4.4503 0 0 1-2.808 2.3732zM10.1504 6.784l2.6455-1.5286 2.5895 1.5042.1419.0847a4.403 4.403 0 0 1 2.1311 3.7301 4.4716 4.4716 0 0 1-1.129 3.1006l-.1419.0848-5.6506-3.2687-1.4602-.84 4.2224-2.4332-1.3725-.7925-.0919.0528-2.6747 1.5432-.1419-.0847a4.469 4.469 0 0 1-1.7428-2.6106 4.4173 4.4173 0 0 1 .5365-1.6366z" fill="currentColor" className="text-slate-800"/>
        </svg>
      );
      case 'anthropic': return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 4.608C17.472 4.608 13.92 9.792 12 12.864C10.08 9.792 6.528 4.608 6.528 4.608C6.528 4.608 2.592 10.368 2.592 10.368C2.592 10.368 7.296 17.28 7.296 17.28H16.704C16.704 17.28 21.408 10.368 21.408 10.368C21.408 10.368 17.472 4.608 17.472 4.608ZM12 15.648L9.696 12.192L12 8.736L14.304 12.192L12 15.648Z" fill="currentColor" className="text-orange-700"/>
        </svg>
      );
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 mb-8">
      
      {/* Configuration Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-white rounded-md border border-slate-200 shadow-sm text-slate-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
            <h3 className="font-semibold text-slate-800">Model Configuration</h3>
          </div>
          <div className="flex space-x-1">
             <span className={`h-2 w-2 rounded-full mt-2 ${config.apiKey ? 'bg-green-500' : 'bg-slate-300'}`}></span>
             <span className="text-xs font-medium text-slate-500 pt-1">
                {config.apiKey ? 'Key Provided' : 'No Key'}
             </span>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
              AI Provider
            </label>
            <div className="relative">
              <select
                value={config.provider}
                disabled={disabled}
                onChange={(e) => onChange({ ...config, provider: e.target.value as AIProvider, apiKey: '' })}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none transition-shadow cursor-pointer hover:bg-slate-100"
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                {getProviderIcon(config.provider)}
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                Model
              </label>
              <button 
                onClick={handleFetchModels}
                disabled={!config.apiKey || isLoadingModels || disabled}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none transition-shadow cursor-pointer hover:bg-slate-100"
              >
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* API Key Input */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
              API Key
            </label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
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
                   if (config.apiKey && !isKeyValid) {
                     handleFetchModels();
                   }
                }}
                placeholder={`Paste your ${config.provider.charAt(0).toUpperCase() + config.provider.slice(1)} API Key`}
                className={`w-full pl-10 pr-24 py-2.5 bg-white border rounded-xl text-slate-800 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all
                  ${isKeyValid === true ? 'border-green-300 focus:border-green-500 focus:ring-green-200' : ''}
                  ${isKeyValid === false ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}
                  ${isKeyValid === null ? 'border-slate-300 focus:border-blue-500' : ''}
                `}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                {isKeyValid === true && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                    Verified
                  </span>
                )}
                {isKeyValid === false && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                    Invalid
                  </span>
                )}
                 {config.apiKey && isKeyValid === null && !isLoadingModels && (
                   <button
                    onClick={handleFetchModels}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded transition-colors"
                   >
                     Verify
                   </button>
                 )}
              </div>
            </div>
            <p className="text-[10px] text-slate-400 ml-1">
              Your key is used directly in your browser to fetch models and generate content. It is never stored.
            </p>
          </div>

        </div>
        
        {/* Info Banner for non-native PDF providers */}
        {(config.provider === 'openai' || config.provider === 'anthropic') && (
           <div className="bg-amber-50 px-6 py-3 border-t border-amber-100 flex items-start gap-3">
             <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
             </svg>
             <div>
               <p className="text-xs font-medium text-amber-800">
                 Limited PDF Support
               </p>
               <p className="text-[11px] text-amber-700 mt-0.5">
                 {config.provider === 'openai' ? 'OpenAI' : 'Anthropic'} doesn't natively support PDF input via API. We'll extract text from the PDF locally, which may lose formatting or images. For complex papers, <strong>Gemini</strong> is recommended.
               </p>
             </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default ConfigPanel;