import React, { useEffect, useState } from 'react';

const steps = [
  "Reading research paper...",
  "Extracting core algorithms...",
  "Designing toy components...",
  "Writing synthetic data generators...",
  "Implementing baseline models...",
  "Constructing pedagogical notebook..."
];

const ProcessingState: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-xl mx-auto text-center py-12">
      <div className="relative w-16 h-16 mx-auto mb-6">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-slate-200 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <h3 className="text-xl font-semibold text-slate-900 mb-2">Analyzing Paper</h3>
      <div className="h-8 overflow-hidden relative">
        <p key={currentStep} className="text-slate-500 animate-pulse transition-opacity duration-500">
          {steps[currentStep]}
        </p>
      </div>
      <p className="text-xs text-slate-400 mt-8">
        This process usually takes about 30-60 seconds.
      </p>
    </div>
  );
};

export default ProcessingState;
