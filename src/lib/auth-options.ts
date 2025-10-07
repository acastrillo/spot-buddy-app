/**
 * Shared NextAuth configuration
 * This file exports the authOptions so API routes can use getServerSession() properly
 */

import { type NextAuthOptions } from "next-auth";
import CognitoProvider from "next-auth/providers/cognito";
import { dynamoDBUsers } from "@/lib/dynamodb";

type CognitoProfile = {
  sub?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
};

const {
  COGNITO_CLIENT_ID,
  COGNITO_CLIENT_SECRET,
  COGNITO_ISSUER_URL,
  COGNITO_USER_POOL_ID,
  AWS_REGION,
  AUTH_SECRET,
} = process.env;

if (!COGNITO_CLIENT_ID || !COGNITO_CLIENT_SECRET) {
  throw new Error("COGNITO_CLIENT_ID and COGNITO_CLIENT_SECRET must be set");
}

const resolvedIssuer =
  COGNITO_ISSUER_URL ||
  (AWS_REGION && COGNITO_USER_POOL_ID
    ? `https://cognito-idp.${AWS_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`
    : undefined);

if (!resolvedIssuer) {
  throw new Error(
    "Set COGNITO_ISSUER_URL explicitly or provide AWS_REGION and COGNITO_USER_POOL_ID",
  );
}

export const authOptions: NextAuthOptions = {
  providers: [
    CognitoProvider({
      clientId: COGNITO_CLIENT_ID,
      clientSecret: COGNITO_CLIENT_SECRET,
      issuer: resolvedIssuer,
      // Remove checks restriction - let NextAuth handle OAuth checks properly
      // This fixes "nonce mismatch" error with Google federated identity
    }),
  ],
  secret: AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: { signIn: "/auth/login" },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const cognitoProfile = profile as CognitoProfile;
        token.id = cognitoProfile.sub ?? account.providerAccountId;
        token.email = cognitoProfile.email ?? token.email;
        token.firstName =
          cognitoProfile.given_name ??
          cognitoProfile.name ??
          (typeof token.firstName === "string" ? token.firstName : null);
        token.lastName = cognitoProfile.family_name ?? token.lastName;

        // Sync user to DynamoDB on first login
        if (token.id && token.email) {
          try {
            await dynamoDBUsers.upsert({
              id: token.id as string,
              email: token.email as string,
              firstName: token.firstName as string | null,
              lastName: token.lastName as string | null,
            });
          } catch (error) {
            console.error("Failed to sync user to DynamoDB:", error);
            // Don't fail auth if DynamoDB sync fails
          }
        }
      }

      // Fetch subscription tier from DynamoDB on every token refresh
      if (token.id) {
        try {
          const dbUser = await dynamoDBUsers.get(token.id as string);
          if (dbUser) {
            token.subscriptionTier = dbUser.subscriptionTier;
            token.subscriptionStatus = dbUser.subscriptionStatus;
            token.ocrQuotaUsed = dbUser.ocrQuotaUsed;
            token.ocrQuotaLimit = dbUser.ocrQuotaLimit;
          }
        } catch (error) {
          console.error("Failed to fetch user from DynamoDB:", error);
          // Continue with existing token data
        }
      }

      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: typeof token.id === "string" ? token.id : "",
          email: (token.email as string | undefined) ?? session.user?.email ?? "",
          firstName: (token.firstName as string | undefined) ?? null,
          lastName: (token.lastName as string | undefined) ?? null,
          subscriptionTier: (token.subscriptionTier as string | undefined) ?? "free",
          subscriptionStatus: (token.subscriptionStatus as string | undefined) ?? "active",
          ocrQuotaUsed: (token.ocrQuotaUsed as number | undefined) ?? 0,
          ocrQuotaLimit: (token.ocrQuotaLimit as number | undefined) ?? 2,
        },
      };
    },
  },
};
