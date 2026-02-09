import React, { useRef, useState } from 'react';
import { fetchPaperFromUrl, FetchResult } from '../utils/urlFetcher';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

type UploadMode = 'file' | 'url';

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
  const [dragActive, setDragActive] = useState(false);
  const [mode, setMode] = useState<UploadMode>('file');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndUpload(e.target.files[0]);
    }
  };

  const validateAndUpload = (file: File) => {
    if (file.type !== 'application/pdf') {
      alert("Please upload a valid PDF file.");
      return;
    }
    onFileSelect(file);
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || disabled) return;
    
    setIsLoading(true);
    setUrlError(null);
    
    try {
      const result: FetchResult = await fetchPaperFromUrl(url.trim());
      if (result.success && result.file) {
        onFileSelect(result.file);
        setUrl('');
      } else {
        setUrlError(result.error || 'Failed to fetch paper');
      }
    } catch (err: any) {
      setUrlError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Mode Tabs */}
      <div className="flex mb-4 bg-claude-bg dark:bg-claude-dark-bg rounded-xl p-1 border border-claude-border dark:border-claude-dark-border">
        <button
          type="button"
          onClick={() => setMode('file')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-all ${
            mode === 'file'
              ? 'bg-claude-bg-alt dark:bg-claude-dark-bg-alt text-claude-text dark:text-claude-dark-text shadow-soft'
              : 'text-claude-text-secondary dark:text-claude-dark-text-secondary hover:text-claude-text dark:hover:text-claude-dark-text'
          }`}
          aria-pressed={mode === 'file'}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Upload File
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-all ${
            mode === 'url'
              ? 'bg-claude-bg-alt dark:bg-claude-dark-bg-alt text-claude-text dark:text-claude-dark-text shadow-soft'
              : 'text-claude-text-secondary dark:text-claude-dark-text-secondary hover:text-claude-text dark:hover:text-claude-dark-text'
          }`}
          aria-pressed={mode === 'url'}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Import from URL
          </span>
        </button>
      </div>

      {mode === 'file' ? (
        <div
          className={`relative p-10 w-full border-2 border-dashed rounded-2xl transition-all duration-300 ease-in-out ${
            dragActive
              ? "border-claude-orange bg-claude-orange/5"
              : "border-claude-border dark:border-claude-dark-border bg-claude-bg-alt dark:bg-claude-dark-bg-alt hover:border-claude-text-tertiary dark:hover:border-claude-dark-text-tertiary hover:bg-claude-bg dark:hover:bg-claude-dark-bg"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          onDragEnter={disabled ? undefined : handleDrag}
          onDragLeave={disabled ? undefined : handleDrag}
          onDragOver={disabled ? undefined : handleDrag}
          onDrop={disabled ? undefined : handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="application/pdf"
            onChange={handleChange}
            disabled={disabled}
            aria-label="Upload PDF file"
          />
          
          <div className="flex flex-col items-center justify-center text-center space-y-5">
            <div className="p-4 bg-claude-bg dark:bg-claude-dark-bg rounded-2xl border border-claude-border dark:border-claude-dark-border shadow-soft">
              <svg className="w-8 h-8 text-claude-text-secondary dark:text-claude-dark-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-claude-text dark:text-claude-dark-text">Upload Research Paper</h3>
              <p className="text-claude-text-secondary dark:text-claude-dark-text-secondary mt-1.5 text-sm">Drag & drop your PDF here, or click to browse</p>
            </div>
            <button
              type="button"
              onClick={onButtonClick}
              disabled={disabled}
              className="px-5 py-2.5 text-sm font-medium text-claude-orange bg-claude-orange/10 rounded-xl hover:bg-claude-orange/20 transition-colors focus:outline-none focus:ring-2 focus:ring-claude-orange focus:ring-offset-2 border border-claude-orange/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Select PDF
            </button>
            <p className="text-xs text-claude-text-tertiary dark:text-claude-dark-text-tertiary">PDFs up to 10MB recommended</p>
          </div>
        </div>
      ) : (
        <div className={`p-8 w-full border-2 border-dashed rounded-2xl border-claude-border dark:border-claude-dark-border bg-claude-bg-alt dark:bg-claude-dark-bg-alt ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
          <form onSubmit={handleUrlSubmit} className="space-y-5">
            <div className="text-center space-y-2">
              <div className="p-4 bg-claude-bg dark:bg-claude-dark-bg rounded-2xl border border-claude-border dark:border-claude-dark-border shadow-soft inline-block mx-auto">
                <svg className="w-8 h-8 text-claude-text-secondary dark:text-claude-dark-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-claude-text dark:text-claude-dark-text">Import from URL</h3>
              <p className="text-claude-text-secondary dark:text-claude-dark-text-secondary text-sm">Paste an arXiv, OpenReview, or direct PDF link</p>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="paper-url" className="sr-only">Paper URL</label>
              <input
                id="paper-url"
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setUrlError(null); }}
                placeholder="https://arxiv.org/abs/2301.00001"
                disabled={disabled || isLoading}
                className="w-full px-4 py-3 rounded-xl border border-claude-border dark:border-claude-dark-border bg-claude-bg dark:bg-claude-dark-bg text-claude-text dark:text-claude-dark-text placeholder:text-claude-text-tertiary dark:placeholder:text-claude-dark-text-tertiary focus:outline-none focus:ring-2 focus:ring-claude-orange focus:border-transparent transition-all disabled:opacity-50"
              />
              {urlError && (
                <p className="text-sm text-claude-error flex items-center gap-1" role="alert">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {urlError}
                </p>
              )}
            </div>
            
            <button
              type="submit"
              disabled={disabled || isLoading || !url.trim()}
              className="w-full px-5 py-3 text-sm font-medium text-white bg-claude-orange rounded-xl hover:bg-claude-orange-dark transition-colors focus:outline-none focus:ring-2 focus:ring-claude-orange focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Fetching Paper...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Fetch Paper
                </>
              )}
            </button>
            
            <div className="text-center">
              <p className="text-xs text-claude-text-tertiary dark:text-claude-dark-text-tertiary">
                Supports arXiv, OpenReview, and direct PDF URLs
              </p>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
