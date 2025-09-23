"use client"

import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react'

interface User {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
}

export const useAuthStore = (): AuthState => {
  const { data: session, status } = useSession()

  const user: User | null = session?.user?.email
    ? {
        id: (session.user as any).id || '',
        email: session.user.email as string,
        firstName: (session.user as any).firstName ?? null,
        lastName: (session.user as any).lastName ?? null,
      }
    : null

  return {
    isAuthenticated: status === 'authenticated',
    user,
    login: async (email: string, password: string) => {
      const res = await nextAuthSignIn('credentials', {
        email,
        password,
        redirect: false,
      })
      return !res?.error
    },
    logout: async () => {
      await nextAuthSignOut({ redirect: false })
    },
  }
}
