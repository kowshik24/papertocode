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
    highlighted = highlighted.replace(/(['"])(.*?)\1/g, '<span class="text-claude-orange">"$2"</span>');
    
    // Highlight comments
    highlighted = highlighted.replace(/(#.*$)/gm, '<span class="text-claude-success">$1</span>');
    
    // Highlight keywords
    keywords.forEach(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'g');
      highlighted = highlighted.replace(regex, `<span class="text-claude-info font-semibold">${kw}</span>`);
    });
    
    // Highlight builtins
    builtins.forEach(builtin => {
      const regex = new RegExp(`\\b${builtin}\\b`, 'g');
      highlighted = highlighted.replace(regex, `<span class="text-purple-400">${builtin}</span>`);
    });
    
    return highlighted;
  };

  return (
    <div className="relative terminal group">
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopy}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            copied
              ? 'bg-claude-success text-white'
              : 'bg-claude-dark-bg-alt text-claude-dark-text-secondary hover:bg-claude-dark-border'
          }`}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="text-sm text-claude-dark-text overflow-x-auto max-h-96 scrollbar-thin">
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
      <div className="card bg-claude-success/5 border-claude-success/20 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-claude-success/10 rounded-2xl border border-claude-success/20">
              <svg className="w-7 h-7 text-claude-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-claude-text text-lg">Notebook Generated!</h3>
              <p className="text-sm text-claude-text-secondary mt-0.5">Your pedagogical implementation is ready to download.</p>
            </div>
          </div>
          <button
            onClick={handleDownload}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
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
        <div className="card overflow-hidden">
          <button
            onClick={() => setShowInsights(!showInsights)}
            className="w-full px-6 py-4 border-b border-claude-border bg-claude-bg flex items-center justify-between hover:bg-claude-bg-alt transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-claude-orange text-lg">✽</span>
              <h2 className="text-lg font-semibold text-claude-text">Paper Analysis Insights</h2>
            </div>
            <svg className={`w-5 h-5 text-claude-text-secondary transition-transform ${showInsights ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showInsights && (
            <div className="p-6 space-y-6">
              {/* Paper Metadata */}
              {enrichedDoc && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-claude-text flex items-center gap-2">
                    <span className="text-claude-info">✽</span> Paper Info
                  </h3>
                  <div className="bg-claude-bg rounded-xl p-4 text-sm border border-claude-border">
                    <p className="text-claude-text"><strong>Title:</strong> {enrichedDoc.metadata.title}</p>
                    <p className="mt-2 text-claude-text"><strong>Domain:</strong> <span className="px-2.5 py-1 bg-claude-info/10 text-claude-info rounded-lg text-xs font-medium">{enrichedDoc.metadata.estimatedDomain}</span></p>
                    {enrichedDoc.metadata.abstract && (
                      <p className="mt-3 text-claude-text-secondary"><strong className="text-claude-text">Abstract:</strong> {enrichedDoc.metadata.abstract.substring(0, 300)}...</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Analysis Results */}
              {analysis && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-claude-text flex items-center gap-2">
                    <span className="text-claude-success">✽</span> Analysis Results
                  </h3>
                  <div className="bg-claude-success/5 rounded-xl p-4 text-sm space-y-2 border border-claude-success/20">
                    <p className="text-claude-text"><strong>Intent:</strong> {analysis.intent}</p>
                    <p className="text-claude-text"><strong>Novelty:</strong> {analysis.novelty}</p>
                    <p className="text-claude-text"><strong>Complexity:</strong> <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                      analysis.complexity === 'Simple' ? 'bg-claude-success/10 text-claude-success' :
                      analysis.complexity === 'Moderate' ? 'bg-claude-warning/10 text-claude-warning' :
                      'bg-claude-error/10 text-claude-error'
                    }`}>{analysis.complexity}</span></p>
                    <p className="text-claude-text mt-3"><strong>Core Algorithms:</strong></p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {analysis.core_algorithms.map((algo, i) => (
                        <span key={i} className="px-2.5 py-1 bg-claude-success/10 text-claude-success rounded-lg text-xs font-medium">{algo}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Design Results */}
              {design && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-claude-text flex items-center gap-2">
                    <span className="text-claude-orange">✽</span> Toy Design
                  </h3>
                  <div className="bg-claude-orange/5 rounded-xl p-4 text-sm space-y-3 border border-claude-orange/20">
                    <p className="text-claude-text"><strong>Architecture:</strong> {design.toy_architecture}</p>
                    <p className="text-claude-text"><strong>Expected Behavior:</strong> {design.expected_behavior}</p>
                    {design.simplifications.length > 0 && (
                      <>
                        <p className="text-claude-text"><strong>Simplifications:</strong></p>
                        <div className="space-y-2 mt-2">
                          {design.simplifications.slice(0, 3).map((s, i) => (
                            <div key={i} className="text-xs bg-claude-bg-alt p-3 rounded-lg border border-claude-border">
                              <span className="text-claude-orange font-medium">{s.original}</span> → <span className="text-claude-success font-medium">{s.simplified}</span>
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
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-claude-border bg-claude-bg flex items-center gap-3">
          <span className="text-claude-info">✽</span>
          <h2 className="text-lg font-semibold text-claude-text">Execution Guide</h2>
        </div>
        <div className="p-6 text-claude-text-secondary prose prose-sm max-w-none">
          <div
            className="whitespace-pre-wrap font-medium leading-relaxed"
            style={{ fontFamily: 'inherit' }}
          >
            {content.guide}
          </div>
        </div>
      </div>

      {/* Notebook Preview */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-claude-border bg-claude-bg flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="text-claude-orange">✽</span>
            <h2 className="text-lg font-semibold text-claude-text">Notebook Preview</h2>
          </div>
          <span className="text-xs font-mono font-medium text-claude-text-secondary bg-claude-border px-3 py-1.5 rounded-lg">
            {content.cells.length} cells
          </span>
        </div>

        <div className="max-h-[70vh] overflow-y-auto divide-y divide-claude-border scrollbar-thin">
          {content.cells.map((cell, idx) => (
            <div
              key={idx}
              className={`transition-all ${
                cell.cell_type === 'code' ? 'bg-claude-bg' : 'bg-claude-bg-alt'
              }`}
            >
              {/* Cell Header */}
              <button
                onClick={() => toggleCell(idx)}
                className="w-full px-6 py-3 flex items-center justify-between hover:bg-opacity-75 transition-colors text-left"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span
                    className={`text-[10px] uppercase font-semibold tracking-wider px-2.5 py-1 rounded-lg ${
                      cell.cell_type === 'code'
                        ? 'bg-claude-info/10 text-claude-info'
                        : 'bg-claude-warning/10 text-claude-warning'
                    }`}
                  >
                    {cell.cell_type === 'code' ? '{ } Code' : '# Markdown'}
                  </span>
                  {cell.cell_type === 'code' && (
                    <span className="text-xs font-mono text-claude-text-tertiary">
                      Cell [{idx}]:
                    </span>
                  )}
                  {cell.cell_type === 'markdown' && (
                    <span className="text-xs text-claude-text-secondary font-medium truncate">
                      {cell.source.split('\n')[0].slice(0, 50)}...
                    </span>
                  )}
                </div>
                <svg
                  className={`w-5 h-5 text-claude-text-tertiary transition-transform ${
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
                <div className="px-6 py-4 border-t border-claude-border">
                  {cell.cell_type === 'code' ? (
                    <CodeBlock source={cell.source} />
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <div
                        className="text-claude-text-secondary font-medium"
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
          className="btn-primary flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Notebook
        </button>
        <button
          onClick={onReset}
          className="btn-outline flex items-center justify-center gap-2"
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
