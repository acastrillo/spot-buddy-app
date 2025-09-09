"use client"

import { useState } from "react"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { 
  Plus, 
  Dumbbell, 
  Clock, 
  TrendingUp, 
  CalendarDays,
  Target
} from "lucide-react"

export default function CalendarPage() {
  const { isAuthenticated } = useAuthStore()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  if (!isAuthenticated) {
    return <Login />
  }

  const thisMonthStats = [
    {
      icon: Dumbbell,
      label: "Workouts",
      value: "0",
      color: "text-primary"
    },
    {
      icon: Clock,
      label: "Hours", 
      value: "0h",
      color: "text-rest"
    },
    {
      icon: TrendingUp,
      label: "Streak",
      value: "0 days",
      color: "text-success"
    }
  ]

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 md:pb-8 flex justify-center">
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
          {/* Header Section */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">
                Workout Calendar
              </h1>
              <p className="text-text-secondary">
                Track your fitness journey
              </p>
            </div>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Schedule Workout</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Calendar */}
            <div className="lg:col-span-2">
              <Card className="h-fit">
                <Calendar 
                  selected={selectedDate} 
                  onSelect={setSelectedDate}
                />
              </Card>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* This Month Stats */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">This Month</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {thisMonthStats.map((stat, index) => {
                    const Icon = stat.icon
                    return (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Icon className={`h-4 w-4 ${stat.color}`} />
                          <span className="text-text-secondary text-sm">{stat.label}</span>
                        </div>
                        <span className="font-semibold text-text-primary">{stat.value}</span>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              {/* Upcoming Workouts */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Upcoming</CardTitle>
                  <p className="text-text-secondary text-sm">Your scheduled workouts</p>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center mx-auto mb-3">
                      <CalendarDays className="h-6 w-6 text-text-secondary" />
                    </div>
                    <p className="text-text-primary font-medium mb-2">No workouts scheduled</p>
                    <Button variant="outline" size="sm">
                      Schedule One
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Goal */}
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="mb-4">
                    <h3 className="font-semibold text-text-primary mb-1">Weekly Goal</h3>
                    <p className="text-sm text-text-secondary">Stay consistent with your training</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">Progress</span>
                      <span className="font-medium text-text-primary">0/3 workouts</span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-surface rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full w-0 transition-all duration-300"></div>
                    </div>
                    
                    <p className="text-xs text-text-secondary">
                      Keep going! You're on track to reach your weekly goal.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <MobileNav />
    </>
  )
}