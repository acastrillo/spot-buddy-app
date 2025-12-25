"use client"

import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Scale, Ruler, TrendingUp } from "lucide-react"
import Link from "next/link"

export default function StatsPage() {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Login />
  }

  const statsCategories = [
    {
      title: "Body Weight",
      description: "Track your weight over time",
      icon: Scale,
      href: "/body-weight",
      color: "text-primary"
    },
    {
      title: "Body Measurements",
      description: "Track body fat % and measurements",
      icon: Ruler,
      href: "/stats/metrics",
      color: "text-secondary"
    },
    {
      title: "Personal Records",
      description: "Track your PRs and strength gains",
      icon: TrendingUp,
      href: "/stats/prs",
      color: "text-rest"
    }
  ]

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 md:pb-4">
        <div className="w-full max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Stats & Progress
          </h1>
          <p className="text-text-secondary mb-8">
            Track your fitness journey with detailed metrics
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {statsCategories.map((category) => {
              const Icon = category.icon
              return (
                <Link key={category.href} href={category.href}>
                  <div className="group p-6 rounded-xl border border-border bg-surface hover:bg-surface-elevated hover:shadow-lg transition-all duration-200 cursor-pointer h-full">
                    <Icon className={`h-12 w-12 ${category.color} mb-4 group-hover:scale-110 transition-transform`} />
                    <h3 className="text-xl font-semibold text-text-primary mb-2">
                      {category.title}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      {category.description}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </main>
      <MobileNav />
    </>
  )
}
