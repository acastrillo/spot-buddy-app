"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface CalendarProps {
  selected?: Date
  onSelect?: (date: Date) => void
  className?: string
}

const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>(
  ({ className, selected, onSelect }, ref) => {
    const [currentMonth, setCurrentMonth] = React.useState(new Date())
    
    const today = new Date()
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)
    const firstDayOfWeek = firstDayOfMonth.getDay()
    const daysInMonth = lastDayOfMonth.getDate()
    
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ]
    
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    
    const days = []
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null)
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    
    const navigateMonth = (direction: 'prev' | 'next') => {
      setCurrentMonth(prev => {
        const newMonth = new Date(prev)
        if (direction === 'prev') {
          newMonth.setMonth(prev.getMonth() - 1)
        } else {
          newMonth.setMonth(prev.getMonth() + 1)
        }
        return newMonth
      })
    }
    
    const handleDayClick = (day: number) => {
      const selectedDate = new Date(year, month, day)
      onSelect?.(selectedDate)
    }
    
    const isToday = (day: number) => {
      return today.getDate() === day && 
             today.getMonth() === month && 
             today.getFullYear() === year
    }
    
    const isSelected = (day: number) => {
      return selected &&
             selected.getDate() === day &&
             selected.getMonth() === month &&
             selected.getFullYear() === year
    }

    return (
      <div ref={ref} className={cn("p-6", className)}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-text-primary">
            {monthNames[month]} {year}
          </h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth('prev')}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth('next')}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Day names */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div
              key={day}
              className="h-8 flex items-center justify-center text-xs font-medium text-text-secondary"
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (!day) {
              return <div key={index} className="h-10" />
            }
            
            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                className={cn(
                  "h-10 w-full rounded-lg text-sm font-medium transition-colors",
                  "hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isToday(day) && "bg-primary text-primary-foreground hover:bg-primary/90",
                  isSelected(day) && !isToday(day) && "bg-primary/20 text-primary",
                  !isToday(day) && !isSelected(day) && "text-text-primary hover:text-text-primary"
                )}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>
    )
  }
)

Calendar.displayName = "Calendar"

export { Calendar }