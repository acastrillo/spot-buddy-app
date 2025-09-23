import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

const authOptions = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const allowedEmail = process.env.APP_ALLOWED_EMAIL || "alejo@cannashieldct.com"
        const allowedPassword = process.env.APP_ALLOWED_PASSWORD || "AeroAttyValley2025"

        if (
          credentials.email === allowedEmail &&
          credentials.password === allowedPassword
        ) {
          return {
            id: "user-alejo",
            email: allowedEmail,
            name: "Alejo",
            firstName: "Alejo",
            lastName: null,
          } as any
        }

        return null
      },
    }),
  ],
  session: { strategy: "jwt" as const },
  pages: { signIn: "/auth/login" },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = (user as any).id
        token.firstName = (user as any).firstName
        token.lastName = (user as any).lastName
      }
      return token
    },
    async session({ session, token }: any) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id,
          firstName: token.firstName,
          lastName: token.lastName,
        },
      }
    },
  },
}

const handler = NextAuth(authOptions as any)
export { handler as GET, handler as POST }
