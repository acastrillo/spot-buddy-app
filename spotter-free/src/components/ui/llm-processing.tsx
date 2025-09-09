import { useState, useEffect } from "react"
import { Brain, Zap, Target, CheckCircle } from "lucide-react"
import { LoadingSpinner } from "./loading-spinner"

interface LLMProcessingProps {
  isVisible: boolean
}

export function LLMProcessing({ isVisible }: LLMProcessingProps) {
  const [currentStep, setCurrentStep] = useState(0)
  
  const steps = [
    { icon: Brain, text: "Analyzing workout content...", duration: 1000 },
    { icon: Zap, text: "Identifying exercises and patterns...", duration: 1500 },
    { icon: Target, text: "Structuring workout format...", duration: 1200 },
    { icon: CheckCircle, text: "Generating summary and breakdown...", duration: 800 }
  ]

  useEffect(() => {
    if (!isVisible) {
      setCurrentStep(0)
      return
    }

    const intervals: NodeJS.Timeout[] = []
    let totalDelay = 0

    steps.forEach((step, index) => {
      const timeout = setTimeout(() => {
        setCurrentStep(index)
      }, totalDelay)
      
      intervals.push(timeout)
      totalDelay += step.duration
    })

    return () => {
      intervals.forEach(clearTimeout)
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg p-8 max-w-md w-full mx-4 shadow-xl border border-border">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Brain className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            AI Processing Workout
          </h3>
          <p className="text-sm text-text-secondary">
            Using advanced language models to parse your workout
          </p>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = currentStep === index
            const isComplete = currentStep > index

            return (
              <div 
                key={index}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-300 ${
                  isActive 
                    ? 'bg-primary/10 border border-primary/20' 
                    : isComplete 
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-background border border-border'
                }`}
              >
                <div className={`flex-shrink-0 ${isActive ? 'animate-pulse' : ''}`}>
                  {isActive ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Icon className={`h-4 w-4 ${
                      isComplete ? 'text-green-500' : 
                      isActive ? 'text-primary' : 'text-text-secondary'
                    }`} />
                  )}
                </div>
                <span className={`text-sm ${
                  isActive ? 'text-primary font-medium' :
                  isComplete ? 'text-green-500' : 'text-text-secondary'
                }`}>
                  {step.text}
                </span>
              </div>
            )
          })}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-text-secondary">
            This usually takes 5-15 seconds depending on workout complexity
          </p>
        </div>
      </div>
    </div>
  )
}