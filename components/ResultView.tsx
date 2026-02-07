import React, { useState } from 'react';
import { GeneratedContent, EnrichedDocument } from '../types';
import { createNotebookBlob } from '../services/geminiService';
import { AnalysisResult, DesignResult } from '../services/orchestratorService';

interface ResultViewProps {
  content: GeneratedContent;
  onReset: () => void;
  analysis?: AnalysisResult | null;
  design?: DesignResult | null;
  enrichedDoc?: EnrichedDocument | null;
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

const ResultView: React.FC<ResultViewProps> = ({ content, onReset, analysis, design, enrichedDoc }) => {
  const [expandedCells, setExpandedCells] = useState<Set<number>>(new Set([0, 1]));
  const [showInsights, setShowInsights] = useState(false);

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

      {/* Paper Insights (shown when multi-step generation was used) */}
      {(analysis || design || enrichedDoc) && (
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
          <button
            onClick={() => setShowInsights(!showInsights)}
            className="w-full px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-blue-50 flex items-center justify-between hover:from-purple-100 hover:to-blue-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h2 className="text-lg font-bold text-slate-800">🧠 Paper Analysis Insights</h2>
            </div>
            <svg className={`w-5 h-5 text-slate-500 transition-transform ${showInsights ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showInsights && (
            <div className="p-6 space-y-6">
              {/* Paper Metadata */}
              {enrichedDoc && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                    <span className="text-blue-500">📄</span> Paper Info
                  </h3>
                  <div className="bg-slate-50 rounded-lg p-4 text-sm">
                    <p><strong>Title:</strong> {enrichedDoc.metadata.title}</p>
                    <p><strong>Domain:</strong> <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{enrichedDoc.metadata.estimatedDomain}</span></p>
                    {enrichedDoc.metadata.abstract && (
                      <p className="mt-2"><strong>Abstract:</strong> {enrichedDoc.metadata.abstract.substring(0, 300)}...</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Analysis Results */}
              {analysis && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                    <span className="text-green-500">🔍</span> Analysis Results
                  </h3>
                  <div className="bg-green-50 rounded-lg p-4 text-sm space-y-2">
                    <p><strong>Intent:</strong> {analysis.intent}</p>
                    <p><strong>Novelty:</strong> {analysis.novelty}</p>
                    <p><strong>Complexity:</strong> <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      analysis.complexity === 'Simple' ? 'bg-green-200 text-green-800' :
                      analysis.complexity === 'Moderate' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-red-200 text-red-800'
                    }`}>{analysis.complexity}</span></p>
                    <p><strong>Core Algorithms:</strong></p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.core_algorithms.map((algo, i) => (
                        <span key={i} className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs">{algo}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Design Results */}
              {design && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                    <span className="text-purple-500">🏗️</span> Toy Design
                  </h3>
                  <div className="bg-purple-50 rounded-lg p-4 text-sm space-y-3">
                    <p><strong>Architecture:</strong> {design.toy_architecture}</p>
                    <p><strong>Expected Behavior:</strong> {design.expected_behavior}</p>
                    {design.simplifications.length > 0 && (
                      <>
                        <p><strong>Simplifications:</strong></p>
                        <div className="space-y-1">
                          {design.simplifications.slice(0, 3).map((s, i) => (
                            <div key={i} className="text-xs bg-white p-2 rounded border border-purple-200">
                              <span className="text-purple-700">{s.original}</span> → <span className="text-green-700">{s.simplified}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
