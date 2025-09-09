"use client"

import { useState, useEffect } from "react"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Calendar, 
  Target, 
  TrendingUp, 
  Dumbbell,
  Plus,
  Library,
  Clock,
  Award
} from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore()
  const [workoutStats, setWorkoutStats] = useState({
    thisWeek: 0,
    total: 0,
    hoursTrained: 0,
    streak: 0
  })
  const [recentCompletions, setRecentCompletions] = useState<any[]>([])

  useEffect(() => {
    // Load workout library and completed workouts
    const savedWorkouts = JSON.parse(localStorage.getItem('workouts') || '[]')
    const completedWorkouts = JSON.parse(localStorage.getItem('completedWorkouts') || '[]')
    
    // Calculate stats
    const now = new Date()
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
    startOfWeek.setHours(0, 0, 0, 0)
    
    const thisWeekCompletions = completedWorkouts.filter((completion: any) => {
      const completionDate = new Date(completion.completedDate)
      return completionDate >= startOfWeek
    })

    // Calculate streak (consecutive days with workouts)
    const sortedDates = [...new Set(completedWorkouts.map((c: any) => c.completedDate))]
      .sort((a, b) => new Date(b as string).getTime() - new Date(a as string).getTime())
    
    let streak = 0
    const today = new Date().toISOString().split('T')[0]
    let checkDate = today
    
    for (const date of sortedDates) {
      if (date === checkDate) {
        streak++
        const prevDate = new Date(checkDate)
        prevDate.setDate(prevDate.getDate() - 1)
        checkDate = prevDate.toISOString().split('T')[0]
      } else {
        break
      }
    }

    // Estimate hours (assume 45 mins per workout average)
    const hoursTrained = Math.round((completedWorkouts.length * 0.75) * 10) / 10

    setWorkoutStats({
      thisWeek: thisWeekCompletions.length,
      total: completedWorkouts.length,
      hoursTrained,
      streak
    })

    // Get recent completions with workout names
    const recentWithNames = completedWorkouts
      .sort((a: any, b: any) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 5)
      .map((completion: any) => {
        const workout = savedWorkouts.find((w: any) => w.id === completion.workoutId)
        return {
          ...completion,
          workoutName: workout?.title || 'Unknown Workout'
        }
      })
    
    setRecentCompletions(recentWithNames)
  }, [])

  if (!isAuthenticated) {
    return <Login />
  }

  const stats = [
    {
      title: "Workouts This Week",
      value: workoutStats.thisWeek.toString(),
      icon: Target,
      color: "text-primary",
    },
    {
      title: "Total Workouts",
      value: workoutStats.total.toString(), 
      icon: Dumbbell,
      color: "text-secondary",
    },
    {
      title: "Hours Trained",
      value: `${workoutStats.hoursTrained}h`,
      icon: Clock,
      color: "text-rest",
    },
    {
      title: "Streak",
      value: `${workoutStats.streak} days`,
      icon: Award,
      color: "text-success",
    },
  ]

  const quickActions = [
    {
      title: "Add Workout",
      description: "Import or create a new workout",
      href: "/add",
      icon: Plus,
      primary: true,
    },
    {
      title: "Browse Library", 
      description: "View your saved workouts",
      href: "/library",
      icon: Library,
    },
    {
      title: "View Calendar",
      description: "See your workout schedule",
      href: "/calendar", 
      icon: Calendar,
    },
  ]

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 md:pb-8 flex justify-center">
        <div className="w-full max-w-4xl mx-auto px-4 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              Welcome back, {user?.firstName || "there"}!
            </h1>
            <p className="text-text-secondary">
              Ready to crush your fitness goals today?
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <Card key={index} className="hover:shadow-medium transition-shadow duration-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-text-secondary uppercase tracking-wide font-medium">
                          {stat.title}
                        </p>
                        <p className="text-2xl font-bold text-text-primary mt-1">
                          {stat.value}
                        </p>
                      </div>
                      <Icon className={`h-8 w-8 ${stat.color}`} />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon
                return (
                  <Link key={index} href={action.href}>
                    <Card className={`hover:shadow-lg transition-all duration-200 cursor-pointer group ${
                      action.primary ? 'border-primary/30 bg-primary/10 hover:bg-primary/15' : 'hover:border-border/80'
                    }`}>
                      <CardHeader className="pb-4">
                        <div className="flex items-center space-x-3">
                          <div 
                            className={`p-3 rounded-xl transition-colors duration-200 ${
                              action.primary 
                                ? 'bg-primary text-primary-foreground group-hover:bg-primary/90' 
                                : 'bg-surface text-text-secondary group-hover:bg-surface/80'
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-semibold">{action.title}</CardTitle>
                            <CardDescription className="text-sm mt-1">
                              {action.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="text-xl font-semibold text-text-primary mb-4">Recent Activity</h2>
            {recentCompletions.length === 0 ? (
              <Card className="border-0">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="h-8 w-8 text-text-secondary" />
                  </div>
                  <h3 className="text-lg font-medium text-text-primary mb-2">No recent activity</h3>
                  <p className="text-text-secondary mb-6 max-w-md mx-auto">
                    Start by adding your first workout to see your progress here.
                  </p>
                  <Link href="/add">
                    <Button size="lg" className="font-semibold">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Workout
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {recentCompletions.map((completion, index) => (
                  <Card key={completion.id} className="border-0">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Award className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-text-primary">{completion.workoutName}</p>
                            <p className="text-sm text-text-secondary">
                              Completed on {new Date(completion.completedDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-sm text-text-secondary">
                          {index === 0 && new Date(completion.completedDate).toDateString() === new Date().toDateString() 
                            ? 'Today' 
                            : new Date(completion.completedDate).toLocaleDateString()
                          }
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {recentCompletions.length > 0 && (
                  <div className="text-center pt-4">
                    <Link href="/library">
                      <Button variant="outline">
                        <Library className="h-4 w-4 mr-2" />
                        View All Workouts
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <MobileNav />
    </>
  )
}