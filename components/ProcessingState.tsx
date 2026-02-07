import React, { useEffect, useState } from 'react';

interface MultiStepProgress {
  currentStep: number;
  totalSteps: number;
  stepName: string;
  message: string;
}

interface ProcessingStateProps {
  progress?: MultiStepProgress | null;
}

const animatedSteps = [
  { icon: '📄', text: 'Reading research paper...' },
  { icon: '🔍', text: 'Extracting core algorithms...' },
  { icon: '🏗️', text: 'Designing toy components...' },
  { icon: '📊', text: 'Writing data generators...' },
  { icon: '🤖', text: 'Implementing baseline models...' },
  { icon: '📚', text: 'Constructing pedagogical notebook...' },
  { icon: '✨', text: 'Adding visualizations & explanations...' }
];

const multiStepStages = [
  { icon: '📄', name: 'Preparation', text: 'Extracting text and metadata...' },
  { icon: '🔍', name: 'Analysis', text: 'Analyzing paper structure...' },
  { icon: '🏗️', name: 'Design', text: 'Designing toy architecture...' },
  { icon: '💻', name: 'Code Generation', text: 'Generating notebook code...' }
];

const ProcessingState: React.FC<ProcessingStateProps> = ({ progress }) => {
  const [animatedStep, setAnimatedStep] = useState(0);

  useEffect(() => {
    if (!progress) {
      const interval = setInterval(() => {
        setAnimatedStep((prev) => (prev + 1) % animatedSteps.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [progress]);

  // Use multi-step progress if available
  const isMultiStep = progress !== null && progress !== undefined;
  const currentStepIndex = isMultiStep ? progress.currentStep : animatedStep;
  const steps = isMultiStep ? multiStepStages : animatedSteps;
  const currentMessage = isMultiStep ? progress.message : animatedSteps[animatedStep].text;
  const stepName = isMultiStep ? progress.stepName : `Step ${animatedStep + 1}`;

  return (
    <div className="w-full max-w-2xl mx-auto py-16">
      {/* Large Animated Spinner */}
      <div className="flex justify-center mb-12">
        <div className="relative w-24 h-24">
          {/* Outer rotating ring */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 border-r-blue-500 animate-spin"></div>
          {/* Middle pulsing ring */}
          <div className="absolute inset-2 rounded-full border-2 border-blue-200 animate-pulse"></div>
          {/* Inner static icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl">{steps[Math.min(currentStepIndex, steps.length - 1)]?.icon || '⚙️'}</span>
          </div>
        </div>
      </div>

      {/* Main Status Text */}
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-slate-900 mb-3">
          {isMultiStep ? `Step ${progress.currentStep + 1}: ${stepName}` : 'Processing Paper'}
        </h3>
        <div className="h-10 flex items-center justify-center">
          <p 
            key={currentStepIndex}
            className="text-lg text-slate-600 font-medium animate-fade-in-out transition-opacity duration-500"
          >
            {currentMessage}
          </p>
        </div>
      </div>

      {/* Progress Indicator - Visual Steps */}
      <div className="mb-10">
        <div className="flex items-center justify-between gap-1 px-2">
          {steps.map((step, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
                  index < currentStepIndex
                    ? 'bg-green-500 text-white scale-100'
                    : index === currentStepIndex
                    ? 'bg-blue-600 text-white scale-110 shadow-lg'
                    : 'bg-slate-200 text-slate-600 scale-100'
                }`}
              >
                {index < currentStepIndex ? '✓' : index + 1}
              </div>
              {isMultiStep && (
                <span className={`text-xs font-medium ${
                  index === currentStepIndex ? 'text-blue-600' : 'text-slate-500'
                }`}>
                  {step.name}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Timeline of Steps */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
        <div className="space-y-4 max-h-48 overflow-y-auto">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                index === currentStepIndex
                  ? 'bg-blue-50 border border-blue-200'
                  : index < currentStepIndex
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-slate-50 border border-slate-200'
              }`}
            >
              <div className={`text-xl ${index <= currentStepIndex ? 'animate-bounce' : ''}`}>
                {step.icon}
              </div>
              <div className="flex-1">
                <p
                  className={`font-medium ${
                    index === currentStepIndex
                      ? 'text-blue-900 font-semibold'
                      : index < currentStepIndex
                      ? 'text-green-900 line-through opacity-60'
                      : 'text-slate-600'
                  }`}
                >
                  {isMultiStep ? step.name : step.text}
                </p>
                {isMultiStep && (
                  <p className="text-sm text-slate-500">{step.text}</p>
                )}
              </div>
              {index < currentStepIndex && (
                <div className="text-green-600 font-bold">✓</div>
              )}
              {index === currentStepIndex && (
                <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-blue-200 animate-spin"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Timing Info */}
      <div className="text-center space-y-2">
        <p className="text-sm text-slate-600 font-medium">
          {isMultiStep 
            ? `Step ${progress.currentStep + 1} of ${progress.totalSteps + 1}` 
            : `Step ${currentStepIndex + 1} of ${steps.length}`}
        </p>
        <p className="text-xs text-slate-500">
          {isMultiStep 
            ? '⏱️ Multi-step generation may take 1-3 minutes for best results'
            : '⏱️ This usually takes 30-90 seconds with a good API connection'}
        </p>
        <div className="mt-4">
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300 ease-out"
              style={{ 
                width: isMultiStep 
                  ? `${((progress.currentStep + 1) / (progress.totalSteps + 1)) * 100}%`
                  : `${((currentStepIndex + 1) / steps.length) * 100}%`
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingState;
