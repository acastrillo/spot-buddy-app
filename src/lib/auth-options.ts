/**
 * Shared NextAuth configuration
 * This file exports the authOptions so API routes can use getServerSession() properly
 */

import { type NextAuthOptions } from "next-auth";
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
if (!AUTH_SECRET) {
  throw new Error("AUTH_SECRET environment variable is required for secure session signing");
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

// Use the Cognito hosted UI domain for authorization (supports identity_provider param)
const cognitoHostedDomain = `https://spotter-auth-1758818590.auth.us-east-1.amazoncognito.com`;

export const authOptions: NextAuthOptions = {
  providers: [
    // Cognito provider with Google federated identity
    {
      id: "cognito",
      name: "Cognito",
      type: "oauth",
      clientId: COGNITO_CLIENT_ID,
      clientSecret: COGNITO_CLIENT_SECRET,
      wellKnown: `${resolvedIssuer}/.well-known/openid-configuration`, // Explicit OIDC discovery endpoint
      authorization: {
        url: `${cognitoHostedDomain}/oauth2/authorize`,
        params: {
          scope: "openid email profile",
          response_type: "code",
          identity_provider: "Google",
        },
      },
      token: {
        url: `${cognitoHostedDomain}/oauth2/token`,
      },
      userinfo: {
        url: `${cognitoHostedDomain}/oauth2/userInfo`, // Use hosted domain, not cognito-idp
      },
      checks: ["state", "nonce"], // Required for Cognito with federated Google OAuth
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name ?? profile.email,
          image: profile.picture,
        };
      },
    },
  ],
  secret: AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Refresh token every 24 hours of activity (sliding session)
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60, // Must match session.maxAge - fixes incognito mode issues
        domain: process.env.NODE_ENV === "production"
          ? ".cannashieldct.com"  // Allows spotter.cannashieldct.com and future subdomains
          : undefined,  // localhost doesn't need domain
      },
    },
    csrfToken: {
      name: `__Host-next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: { signIn: "/auth/login" },
  debug: true, // Enable debug logs to diagnose OAuth issues
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

      // Monitor JWT cookie size (browser limit is 4096 bytes)
      const tokenSize = JSON.stringify(token).length;
      if (tokenSize > 3500) {  // Warning threshold (leave buffer for encoding overhead)
        console.warn(`[Auth] JWT token size: ${tokenSize} bytes - approaching 4096 limit`);
      }
      // Log size in development for monitoring
      if (process.env.NODE_ENV === "development") {
        console.log(`[Auth] JWT token size: ${tokenSize} bytes`);
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
