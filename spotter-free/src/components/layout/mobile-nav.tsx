"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  Plus, 
  Library, 
  Calendar, 
  Home, 
  Settings 
} from "lucide-react"

export function MobileNav() {
  const pathname = usePathname()

  const navigation = [
    { name: "Home", href: "/", icon: Home },
    { name: "Library", href: "/library", icon: Library },
    { name: "Add", href: "/add", icon: Plus },
    { name: "Calendar", href: "/calendar", icon: Calendar },
    { name: "Settings", href: "/settings", icon: Settings },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-sm border-t border-border md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 min-h-touch",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-text-secondary hover:text-text-primary hover:bg-surface"
              )}
            >
              <Icon className={cn(
                "h-5 w-5",
                item.name === "Add" && "bg-primary text-primary-foreground rounded-full p-1 h-6 w-6"
              )} />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}