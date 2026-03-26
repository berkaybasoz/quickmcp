interface WizardProgressProps {
  currentStep: 1 | 2 | 3 | 4;
}

type StepDef = {
  label: string;
  sublabel: string;
};

const STEPS: StepDef[] = [
  { label: 'Data Source',  sublabel: 'Connect data'    },
  { label: 'Template',     sublabel: 'Configure source' },
  { label: 'Preview',      sublabel: 'Validate data'    },
  { label: 'Configure',    sublabel: 'Finalize'         },
];

function indicatorClasses(stepIndex: number, activeStep: number): string {
  const base =
    'flex items-center justify-center w-10 h-10 rounded-lg font-bold transition-all';
  if (stepIndex < activeStep) {
    return `${base} bg-green-500 text-white shadow-lg shadow-green-500/30`;
  }
  if (stepIndex === activeStep) {
    return `${base} bg-blue-600 text-white shadow-lg shadow-blue-500/30`;
  }
  return `${base} bg-slate-100 text-slate-400`;
}

function labelClasses(stepIndex: number, activeStep: number): string {
  if (stepIndex <= activeStep) return 'text-sm font-bold text-slate-900';
  return 'text-sm font-bold text-slate-400';
}

function sublabelClasses(stepIndex: number, activeStep: number): string {
  if (stepIndex <= activeStep) return 'text-xs text-slate-500';
  return 'text-xs text-slate-400';
}

function progressBarClasses(fromStep: number, activeStep: number): string {
  const base = 'h-full transition-all duration-500';
  if (activeStep > fromStep) {
    return `${base} bg-green-500 w-full`;
  }
  return `${base} bg-blue-500 w-0`;
}

export function WizardProgress({ currentStep }: WizardProgressProps) {
  const activeStep = currentStep - 1; // 0-based index

  return (
    <div className="card p-6 mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((step, i) => {
          const isLast = i === STEPS.length - 1;

          return (
            <div key={i} className={isLast ? undefined : 'flex-1'}>
              <div className="flex items-center">
                <div
                  id={`step-${i + 1}-indicator`}
                  className={indicatorClasses(i, activeStep)}
                >
                  {i + 1}
                </div>

                {!isLast && (
                  <div className="flex-1 h-1 bg-slate-100 mx-4 rounded-full overflow-hidden">
                    <div
                      id={`progress-${i + 1}-${i + 2}`}
                      className={progressBarClasses(i, activeStep)}
                    />
                  </div>
                )}
              </div>

              <div className="mt-3">
                <p className={labelClasses(i, activeStep)}>{step.label}</p>
                <p className={sublabelClasses(i, activeStep)}>{step.sublabel}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
