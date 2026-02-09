import React, { useRef, useState } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
  const [dragActive, setDragActive] = useState(false);
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

  return (
    <div
      className={`relative p-10 w-full max-w-2xl mx-auto border-2 border-dashed rounded-2xl transition-all duration-300 ease-in-out ${
        dragActive
          ? "border-claude-orange bg-claude-orange/5"
          : "border-claude-border bg-claude-bg-alt hover:border-claude-text-tertiary hover:bg-claude-bg"
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
      />
      
      <div className="flex flex-col items-center justify-center text-center space-y-5">
        <div className="p-4 bg-claude-bg rounded-2xl border border-claude-border shadow-soft">
          <svg className="w-8 h-8 text-claude-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-claude-text">Upload Research Paper</h3>
          <p className="text-claude-text-secondary mt-1.5 text-sm">Drag & drop your PDF here, or click to browse</p>
        </div>
        <button
          type="button"
          onClick={onButtonClick}
          disabled={disabled}
          className="px-5 py-2.5 text-sm font-medium text-claude-orange bg-claude-orange/10 rounded-xl hover:bg-claude-orange/20 transition-colors focus:outline-none focus:ring-2 focus:ring-claude-orange focus:ring-offset-2 border border-claude-orange/20"
        >
          Select PDF
        </button>
        <p className="text-xs text-claude-text-tertiary">PDFs up to 10MB recommended</p>
      </div>
    </div>
  );
};

export default FileUpload;
