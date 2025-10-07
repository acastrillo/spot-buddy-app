"use client"

import { useEffect, useState } from "react"
import { Trophy, X, Sparkles } from "lucide-react"
import { Button } from "./button"
import { Card, CardContent } from "./card"

interface PRCelebrationProps {
  exerciseName: string
  weight: number
  reps: number
  unit?: 'lbs' | 'kg'
  estimatedOneRepMax?: number
  onClose: () => void
}

export function PRCelebration({
  exerciseName,
  weight,
  reps,
  unit = 'lbs',
  estimatedOneRepMax,
  onClose,
}: PRCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation
    setTimeout(() => setIsVisible(true), 100)
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300) // Wait for fade out animation
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleClose}
    >
      <Card
        className={`w-full max-w-md transform transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <CardContent className="relative p-8 text-center">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-text-secondary hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Celebration animation */}
          <div className="mb-6 relative">
            <div className="inline-block animate-bounce">
              <Trophy className="h-20 w-20 text-primary mx-auto" />
            </div>
            <Sparkles className="h-6 w-6 text-yellow-400 absolute top-0 left-1/2 -translate-x-12 animate-pulse" />
            <Sparkles className="h-6 w-6 text-yellow-400 absolute top-0 right-1/2 translate-x-12 animate-pulse delay-100" />
          </div>

          {/* PR Title */}
          <h2 className="text-3xl font-bold text-text-primary mb-2">
            New PR! 🎉
          </h2>

          {/* Exercise name */}
          <p className="text-lg text-text-secondary mb-6">
            {exerciseName}
          </p>

          {/* PR details */}
          <div className="bg-surface rounded-lg p-6 mb-6">
            <div className="text-4xl font-bold text-primary mb-2">
              {Math.round(weight)} {unit} × {reps}
            </div>
            {estimatedOneRepMax && reps > 1 && (
              <div className="text-sm text-text-secondary">
                Est. 1RM: {Math.round(estimatedOneRepMax)} {unit}
              </div>
            )}
          </div>

          {/* Motivational text */}
          <p className="text-text-secondary mb-6">
            {getRandomMotivationalQuote()}
          </p>

          {/* Close button */}
          <Button onClick={handleClose} className="w-full">
            Awesome! 💪
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function getRandomMotivationalQuote(): string {
  const quotes = [
    "Crushing it! Keep pushing!",
    "Beast mode activated!",
    "You're getting stronger every day!",
    "That's what I'm talking about!",
    "Gains on gains!",
    "Unstoppable!",
    "Absolutely crushing it!",
    "New levels unlocked!",
    "You're a machine!",
    "Progress in action!",
  ]
  return quotes[Math.floor(Math.random() * quotes.length)]
}
