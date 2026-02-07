import React, { useState } from 'react';
import { GeneratedContent } from '../types';
import { createNotebookBlob } from '../services/geminiService';

interface ResultViewProps {
  content: GeneratedContent;
  onReset: () => void;
}

const CodeBlock: React.FC<{ source: string }> = ({ source }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(source);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple syntax highlighting for Python
  const highlightPython = (code: string) => {
    const keywords = ['def', 'class', 'if', 'else', 'for', 'while', 'return', 'import', 'from', 'as', 'try', 'except', 'with', 'lambda', 'yield', 'break', 'continue', 'pass', 'raise', 'assert'];
    const builtins = ['print', 'len', 'range', 'enumerate', 'zip', 'map', 'filter', 'sorted', 'reversed', 'sum', 'min', 'max', 'abs', 'any', 'all', 'list', 'dict', 'set', 'str', 'int', 'float', 'bool', 'True', 'False', 'None'];
    
    let highlighted = code;
    
    // Escape HTML-like characters first
    highlighted = highlighted
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    
    // Highlight strings
    highlighted = highlighted.replace(/(['"])(.*?)\1/g, '<span class="text-orange-500">"$2"</span>');
    
    // Highlight comments
    highlighted = highlighted.replace(/(#.*$)/gm, '<span class="text-green-600">$1</span>');
    
    // Highlight keywords
    keywords.forEach(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'g');
      highlighted = highlighted.replace(regex, `<span class="text-blue-600 font-semibold">${kw}</span>`);
    });
    
    // Highlight builtins
    builtins.forEach(builtin => {
      const regex = new RegExp(`\\b${builtin}\\b`, 'g');
      highlighted = highlighted.replace(regex, `<span class="text-purple-600">${builtin}</span>`);
    });
    
    return highlighted;
  };

  return (
    <div className="relative bg-slate-900 rounded-lg overflow-hidden group">
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopy}
          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
            copied
              ? 'bg-green-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 text-sm font-mono text-slate-100 overflow-x-auto max-h-96">
        <code dangerouslySetInnerHTML={{ __html: highlightPython(source) }} />
      </pre>
    </div>
  );
};

const ResultView: React.FC<ResultViewProps> = ({ content, onReset }) => {
  const [expandedCells, setExpandedCells] = useState<Set<number>>(new Set([0, 1]));

  const handleDownload = () => {
    const blob = createNotebookBlob(content.cells);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = content.notebookName || 'toy_implementation.ipynb';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleCell = (idx: number) => {
    const newExpanded = new Set(expandedCells);
    if (newExpanded.has(idx)) {
      newExpanded.delete(idx);
    } else {
      newExpanded.add(idx);
    }
    setExpandedCells(newExpanded);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Success Banner */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full shadow-md">
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-green-900 text-lg">Notebook Generated! 🎉</h3>
              <p className="text-sm text-green-700">Your pedagogical implementation is ready to download.</p>
            </div>
          </div>
          <button
            onClick={handleDownload}
            className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-md flex items-center gap-2 whitespace-nowrap hover:shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download .ipynb
          </button>
        </div>
      </div>

      {/* Execution Guide */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-lg font-bold text-slate-800">📋 Execution Guide</h2>
        </div>
        <div className="p-6 text-slate-700 prose prose-sm max-w-none">
          <div
            className="whitespace-pre-wrap font-medium leading-relaxed"
            style={{ fontFamily: 'inherit' }}
          >
            {content.guide}
          </div>
        </div>
      </div>

      {/* Notebook Preview */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C6.5 6.253 2 10.753 2 16.253s4.5 10 10 10 10-4.5 10-10S17.5 6.253 12 6.253z" />
            </svg>
            <h2 className="text-lg font-bold text-slate-800">📓 Notebook Preview</h2>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-200 px-3 py-1 rounded-full">
            {content.cells.length} cells
          </span>
        </div>

        <div className="max-h-[70vh] overflow-y-auto divide-y divide-slate-100">
          {content.cells.map((cell, idx) => (
            <div
              key={idx}
              className={`transition-all ${
                cell.cell_type === 'code' ? 'bg-slate-50' : 'bg-white'
              }`}
            >
              {/* Cell Header */}
              <button
                onClick={() => toggleCell(idx)}
                className="w-full px-6 py-3 flex items-center justify-between hover:bg-opacity-75 transition-colors text-left"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span
                    className={`text-[10px] uppercase font-black tracking-wider px-2.5 py-1 rounded ${
                      cell.cell_type === 'code'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {cell.cell_type === 'code' ? '{ } Code' : '# Markdown'}
                  </span>
                  {cell.cell_type === 'code' && (
                    <span className="text-xs font-mono text-slate-500">
                      Cell [{idx}]:
                    </span>
                  )}
                  {cell.cell_type === 'markdown' && (
                    <span className="text-xs text-slate-600 font-medium truncate">
                      {cell.source.split('\n')[0].slice(0, 50)}...
                    </span>
                  )}
                </div>
                <svg
                  className={`w-5 h-5 text-slate-400 transition-transform ${
                    expandedCells.has(idx) ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>

              {/* Cell Content */}
              {expandedCells.has(idx) && (
                <div className="px-6 py-4 border-t border-slate-200">
                  {cell.cell_type === 'code' ? (
                    <CodeBlock source={cell.source} />
                  ) : (
                    <div className="prose prose-sm prose-slate max-w-none">
                      <div
                        className="text-slate-700 font-medium"
                        style={{ fontFamily: 'inherit' }}
                      >
                        {cell.source.split('\n').map((line, i) => (
                          <div key={i}>{line}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8 pb-12">
        <button
          onClick={handleDownload}
          className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Notebook
        </button>
        <button
          onClick={onReset}
          className="px-8 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Process Another Paper
        </button>
      </div>
    </div>
  );
};

export default ResultView;
