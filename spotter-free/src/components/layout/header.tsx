"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuthStore } from "@/store"
import { Button } from "@/components/ui/button"
import { 
  Dumbbell, 
  Menu, 
  X, 
  Plus, 
  Library, 
  Calendar, 
  Settings,
  LogOut,
  User
} from "lucide-react"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, logout } = useAuthStore()

  const handleSignOut = () => {
    logout()
  }

  const navigation = [
    { name: "Add Workout", href: "/add", icon: Plus },
    { name: "Library", href: "/library", icon: Library },
    { name: "Calendar", href: "/calendar", icon: Calendar },
    { name: "Settings", href: "/settings", icon: Settings },
  ]

  if (!user) {
    return null
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <Dumbbell className="h-8 w-8 text-primary" />
          <span className="font-bold text-xl text-text-primary">Spotter</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.name} href={item.href}>
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* User Menu */}
        <div className="flex items-center space-x-2">
          <div className="hidden sm:flex items-center space-x-2 text-sm text-text-secondary">
            <User className="h-4 w-4" />
            <span>{user?.firstName || user?.email}</span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="flex items-center space-x-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-surface/95 backdrop-blur-sm">
          <nav className="w-full max-w-4xl mx-auto px-4 py-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start flex items-center space-x-3"
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Button>
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}