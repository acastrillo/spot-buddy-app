"use client"

import { useState, useEffect } from "react"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Activity,
  TrendingUp,
  Calendar,
  Plus,
  LineChart as LineChartIcon
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface BodyMetric {
  date: string
  weight?: number
  bodyFatPercentage?: number
  muscleMass?: number
  chest?: number
  waist?: number
  hips?: number
  thighs?: number
  arms?: number
  calves?: number
  shoulders?: number
  neck?: number
  unit: "metric" | "imperial"
  notes?: string
}

export default function BodyMetricsPage() {
  const { isAuthenticated, user } = useAuthStore()
  const [metrics, setMetrics] = useState<BodyMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)

  // Form state
  const [formData, setFormData] = useState<Partial<BodyMetric>>({
    date: new Date().toISOString().split('T')[0],
    unit: "imperial",
  })

  useEffect(() => {
    if (user?.id) {
      loadMetrics()
    }
  }, [user?.id])

  const loadMetrics = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/body-metrics')
      if (response.ok) {
        const { metrics: data } = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Error loading body metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      const response = await fetch('/api/body-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await loadMetrics()
        setShowAddForm(false)
        setFormData({
          date: new Date().toISOString().split('T')[0],
          unit: "imperial",
        })
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to save body metrics')
      }
    } catch (error) {
      console.error('Error saving body metrics:', error)
      alert('Failed to save body metrics')
    }
  }

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (!isAuthenticated) {
    return <Login />
  }

  // Calculate stats
  const latestMetric = metrics[0]
  const oldestMetric = metrics[metrics.length - 1]
  const weightChange = latestMetric && oldestMetric
    ? (latestMetric.weight || 0) - (oldestMetric.weight || 0)
    : 0

  // Prepare chart data
  const weightChartData = metrics
    .slice(0, 30) // Last 30 entries
    .reverse()
    .map(m => ({
      date: new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weight: m.weight || 0,
    }))

  const bodyFatChartData = metrics
    .slice(0, 30)
    .reverse()
    .filter(m => m.bodyFatPercentage)
    .map(m => ({
      date: new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      bodyFat: m.bodyFatPercentage || 0,
    }))

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 md:pb-8 flex justify-center">
        <div className="w-full max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">
                Body Metrics
              </h1>
              <p className="text-text-secondary">
                Track your weight, measurements, and body composition
              </p>
            </div>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Current Weight</p>
                    <p className="text-2xl font-bold text-text-primary">
                      {latestMetric?.weight ? `${latestMetric.weight} ${latestMetric.unit === 'metric' ? 'kg' : 'lbs'}` : 'N/A'}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Weight Change</p>
                    <p className={`text-2xl font-bold ${weightChange > 0 ? 'text-secondary' : weightChange < 0 ? 'text-success' : 'text-text-primary'}`}>
                      {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} {latestMetric?.unit === 'metric' ? 'kg' : 'lbs'}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-secondary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Body Fat</p>
                    <p className="text-2xl font-bold text-text-primary">
                      {latestMetric?.bodyFatPercentage ? `${latestMetric.bodyFatPercentage}%` : 'N/A'}
                    </p>
                  </div>
                  <LineChartIcon className="h-8 w-8 text-rest" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Add Entry Form */}
          {showAddForm && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Add Body Metrics</CardTitle>
                <CardDescription>Record your measurements for today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => updateFormData('date', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="unit">Unit</Label>
                    <select
                      id="unit"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={formData.unit}
                      onChange={(e) => updateFormData('unit', e.target.value as "metric" | "imperial")}
                    >
                      <option value="imperial">Imperial (lbs, inches)</option>
                      <option value="metric">Metric (kg, cm)</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="weight">Weight ({formData.unit === 'metric' ? 'kg' : 'lbs'})</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      value={formData.weight || ''}
                      onChange={(e) => updateFormData('weight', parseFloat(e.target.value) || null)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="bodyFat">Body Fat %</Label>
                    <Input
                      id="bodyFat"
                      type="number"
                      step="0.1"
                      value={formData.bodyFatPercentage || ''}
                      onChange={(e) => updateFormData('bodyFatPercentage', parseFloat(e.target.value) || null)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="chest">Chest ({formData.unit === 'metric' ? 'cm' : 'in'})</Label>
                    <Input
                      id="chest"
                      type="number"
                      step="0.1"
                      value={formData.chest || ''}
                      onChange={(e) => updateFormData('chest', parseFloat(e.target.value) || null)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="waist">Waist ({formData.unit === 'metric' ? 'cm' : 'in'})</Label>
                    <Input
                      id="waist"
                      type="number"
                      step="0.1"
                      value={formData.waist || ''}
                      onChange={(e) => updateFormData('waist', parseFloat(e.target.value) || null)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="arms">Arms ({formData.unit === 'metric' ? 'cm' : 'in'})</Label>
                    <Input
                      id="arms"
                      type="number"
                      step="0.1"
                      value={formData.arms || ''}
                      onChange={(e) => updateFormData('arms', parseFloat(e.target.value) || null)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="thighs">Thighs ({formData.unit === 'metric' ? 'cm' : 'in'})</Label>
                    <Input
                      id="thighs"
                      type="number"
                      step="0.1"
                      value={formData.thighs || ''}
                      onChange={(e) => updateFormData('thighs', parseFloat(e.target.value) || null)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Input
                      id="notes"
                      value={formData.notes || ''}
                      onChange={(e) => updateFormData('notes', e.target.value)}
                      placeholder="How are you feeling today?"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    Save Metrics
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts */}
          <Tabs {...({ defaultValue: "weight" } as any)} className="mb-8">
            <TabsList>
              <TabsTrigger value="weight">Weight</TabsTrigger>
              <TabsTrigger value="bodyfat">Body Fat</TabsTrigger>
            </TabsList>

            <TabsContent value="weight">
              <Card>
                <CardHeader>
                  <CardTitle>Weight Progress</CardTitle>
                  <CardDescription>Last 30 entries</CardDescription>
                </CardHeader>
                <CardContent>
                  {weightChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={weightChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                        <XAxis dataKey="date" stroke="#888" />
                        <YAxis stroke="#888" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                          labelStyle={{ color: '#fff' }}
                        />
                        <Line type="monotone" dataKey="weight" stroke="#00d4ff" strokeWidth={2} dot={{ fill: '#00d4ff' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-text-secondary">
                      No weight data yet. Add your first entry to see progress!
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bodyfat">
              <Card>
                <CardHeader>
                  <CardTitle>Body Fat Progress</CardTitle>
                  <CardDescription>Last 30 entries</CardDescription>
                </CardHeader>
                <CardContent>
                  {bodyFatChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={bodyFatChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                        <XAxis dataKey="date" stroke="#888" />
                        <YAxis stroke="#888" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                          labelStyle={{ color: '#fff' }}
                        />
                        <Line type="monotone" dataKey="bodyFat" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-text-secondary">
                      No body fat data yet. Add your first entry to see progress!
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* History */}
          <Card>
            <CardHeader>
              <CardTitle>Measurement History</CardTitle>
              <CardDescription>Your recorded body metrics over time</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-text-secondary">Loading...</div>
              ) : metrics.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-text-secondary mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-text-primary mb-2">No metrics yet</h3>
                  <p className="text-text-secondary mb-6">
                    Start tracking your body measurements to see progress over time
                  </p>
                  <Button onClick={() => setShowAddForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Entry
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {metrics.slice(0, 10).map((metric) => (
                    <div key={metric.date} className="border border-border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-text-primary">
                            {new Date(metric.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </h4>
                          {metric.notes && (
                            <p className="text-sm text-text-secondary mt-1">{metric.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {metric.weight && (
                          <div>
                            <p className="text-xs text-text-secondary">Weight</p>
                            <p className="text-sm font-medium text-text-primary">
                              {metric.weight} {metric.unit === 'metric' ? 'kg' : 'lbs'}
                            </p>
                          </div>
                        )}
                        {metric.bodyFatPercentage && (
                          <div>
                            <p className="text-xs text-text-secondary">Body Fat</p>
                            <p className="text-sm font-medium text-text-primary">{metric.bodyFatPercentage}%</p>
                          </div>
                        )}
                        {metric.chest && (
                          <div>
                            <p className="text-xs text-text-secondary">Chest</p>
                            <p className="text-sm font-medium text-text-primary">
                              {metric.chest} {metric.unit === 'metric' ? 'cm' : 'in'}
                            </p>
                          </div>
                        )}
                        {metric.waist && (
                          <div>
                            <p className="text-xs text-text-secondary">Waist</p>
                            <p className="text-sm font-medium text-text-primary">
                              {metric.waist} {metric.unit === 'metric' ? 'cm' : 'in'}
                            </p>
                          </div>
                        )}
                        {metric.arms && (
                          <div>
                            <p className="text-xs text-text-secondary">Arms</p>
                            <p className="text-sm font-medium text-text-primary">
                              {metric.arms} {metric.unit === 'metric' ? 'cm' : 'in'}
                            </p>
                          </div>
                        )}
                        {metric.thighs && (
                          <div>
                            <p className="text-xs text-text-secondary">Thighs</p>
                            <p className="text-sm font-medium text-text-primary">
                              {metric.thighs} {metric.unit === 'metric' ? 'cm' : 'in'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <MobileNav />
    </>
  )
}
