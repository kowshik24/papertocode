import React from 'react';
import { GeneratedContent } from '../types';
import { createNotebookBlob } from '../services/geminiService';

interface ResultViewProps {
  content: GeneratedContent;
  onReset: () => void;
}

const ResultView: React.FC<ResultViewProps> = ({ content, onReset }) => {
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

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Header / Success Message */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-full text-green-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-green-900">Implementation Ready</h3>
            <p className="text-sm text-green-700">Your pedagogical notebook has been generated.</p>
          </div>
        </div>
        <button
          onClick={handleDownload}
          className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download .ipynb
        </button>
      </div>

      {/* Execution Guide */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Execution Guide</h2>
        </div>
        <div className="p-6 prose prose-slate max-w-none text-slate-600 leading-relaxed">
          <div className="whitespace-pre-wrap">{content.guide}</div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-800">Notebook Preview</h2>
          <span className="text-xs font-mono text-slate-500 bg-slate-200 px-2 py-1 rounded">
            {content.cells.length} cells
          </span>
        </div>
        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto scrollbar-thin">
          {content.cells.map((cell, idx) => (
            <div key={idx} className={`p-6 ${cell.cell_type === 'code' ? 'bg-slate-50' : 'bg-white'}`}>
              <div className="flex items-center gap-2 mb-2">
                 <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                   cell.cell_type === 'code' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                 }`}>
                   {cell.cell_type}
                 </span>
                 {cell.cell_type === 'code' && (
                   <span className="text-xs font-mono text-slate-400">In [{idx}]:</span>
                 )}
              </div>
              <pre className={`text-sm font-mono overflow-x-auto whitespace-pre-wrap ${
                cell.cell_type === 'code' ? 'text-slate-800' : 'text-slate-600 font-sans'
              }`}>
                {cell.source}
              </pre>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center pt-8 pb-12">
        <button
          onClick={onReset}
          className="text-slate-500 hover:text-slate-800 font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Process another paper
        </button>
      </div>
    </div>
  );
};

export default ResultView;
