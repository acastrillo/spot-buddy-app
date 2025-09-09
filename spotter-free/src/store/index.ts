import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      login: async (email: string, password: string) => {
        // Simple mock authentication - any email/password works
        if (email && password) {
          const user: User = {
            id: '1',
            email,
            firstName: email.split('@')[0] || 'User',
            lastName: 'Demo',
          }
          
          set({ isAuthenticated: true, user })
          return true
        }
        return false
      },
      logout: () => set({ isAuthenticated: false, user: null }),
    }),
    {
      name: 'spotter-auth',
    }
  )
)