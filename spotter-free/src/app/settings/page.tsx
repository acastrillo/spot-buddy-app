"use client"

import { useState } from "react"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  User, 
  Shield, 
  Bell, 
  Smartphone, 
  Download, 
  Trash2,
  ChevronRight,
  HelpCircle,
  Heart
} from "lucide-react"

export default function SettingsPage() {
  const { isAuthenticated, user } = useAuthStore()
  const [firstName, setFirstName] = useState(user?.firstName || "test")
  const [lastName, setLastName] = useState(user?.lastName || "test")
  const [email, setEmail] = useState(user?.email || "test@test.com")

  if (!isAuthenticated) {
    return <Login />
  }

  const settingsSections = [
    {
      title: "Account",
      items: [
        {
          icon: User,
          title: "Profile Information",
          subtitle: "Update your personal details",
          action: "chevron"
        },
        {
          icon: Shield,
          title: "Password & Security",
          subtitle: "Change password and security settings",
          action: "chevron"
        }
      ]
    },
    {
      title: "Preferences", 
      items: [
        {
          icon: Bell,
          title: "Notifications",
          subtitle: "Manage workout reminders and updates",
          action: "chevron"
        },
        {
          icon: Smartphone,
          title: "App Settings",
          subtitle: "Customize your app experience",
          action: "chevron"
        }
      ]
    },
    {
      title: "Data",
      items: [
        {
          icon: Download,
          title: "Export Data",
          subtitle: "Download your workout data",
          action: "chevron"
        },
        {
          icon: Trash2,
          title: "Delete Account",
          subtitle: "Permanently remove your account",
          action: "chevron",
          destructive: true
        }
      ]
    },
    {
      title: "Support",
      items: [
        {
          icon: HelpCircle,
          title: "Help & FAQ",
          subtitle: "Get help and find answers",
          action: "chevron"
        }
      ]
    }
  ]

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 md:pb-8 flex justify-center">
        <div className="w-full max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              Settings
            </h1>
            <p className="text-text-secondary">
              Manage your account and app preferences
            </p>
          </div>

          <div className="space-y-8">
            {/* Profile Section */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Profile</CardTitle>
                <p className="text-sm text-text-secondary">Your personal information</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      First Name
                    </label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Last Name
                    </label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Email
                  </label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                  />
                  <p className="text-xs text-text-secondary mt-2">
                    Contact support to change your email address
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button className="px-6">
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Settings Sections */}
            {settingsSections.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                <h2 className="text-lg font-semibold text-text-primary mb-4">
                  {section.title}
                </h2>
                <Card>
                  <CardContent className="p-0">
                    {section.items.map((item, itemIndex) => {
                      const Icon = item.icon
                      return (
                        <button
                          key={itemIndex}
                          className={`w-full flex items-center justify-between p-4 text-left hover:bg-surface/50 transition-colors duration-200 ${
                            itemIndex !== section.items.length - 1 ? 'border-b border-border' : ''
                          } ${itemIndex === 0 ? 'rounded-t-xl' : ''} ${
                            itemIndex === section.items.length - 1 ? 'rounded-b-xl' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${
                              item.destructive ? 'bg-destructive/10' : 'bg-surface'
                            }`}>
                              <Icon className={`h-4 w-4 ${
                                item.destructive ? 'text-destructive' : 'text-text-secondary'
                              }`} />
                            </div>
                            <div>
                              <h3 className={`font-medium ${
                                item.destructive ? 'text-destructive' : 'text-text-primary'
                              }`}>
                                {item.title}
                              </h3>
                              <p className="text-sm text-text-secondary">
                                {item.subtitle}
                              </p>
                            </div>
                          </div>
                          {item.action === "chevron" && (
                            <ChevronRight className="h-4 w-4 text-text-secondary" />
                          )}
                        </button>
                      )
                    })}
                  </CardContent>
                </Card>
              </div>
            ))}

            {/* App Info */}
            <div className="text-center py-8">
              <div className="flex items-center justify-center space-x-2 text-text-secondary mb-2">
                <span className="font-semibold">Spotter</span>
              </div>
              <p className="text-sm text-text-secondary mb-1">Version 1.0.0 (Beta)</p>
              <div className="flex items-center justify-center space-x-1 text-xs text-text-secondary">
                <span>Made with</span>
                <Heart className="h-3 w-3 text-destructive fill-current" />
                <span>for fitness enthusiasts</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      <MobileNav />
    </>
  )
}