/**
 * Shared NextAuth configuration
 * Exposes multiple providers (Google, Facebook, Email) without routing through Cognito
 */

import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { type NextAuthOptions } from "next-auth";
import { dynamoDBUsers } from "@/lib/dynamodb";

type GoogleProfile = {
  sub?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
};

type FacebookProfile = {
  id?: string;
  email?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  picture?: { data?: { url?: string } };
};

const {
  AUTH_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  FACEBOOK_CLIENT_ID,
  FACEBOOK_CLIENT_SECRET,
  EMAIL_SERVER_HOST,
  EMAIL_SERVER_PORT,
  EMAIL_SERVER_USER,
  EMAIL_SERVER_PASSWORD,
  EMAIL_SERVER_SECURE,
  EMAIL_FROM,
} = process.env;

// Check which providers are configured
const hasGoogle = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
const hasFacebook = !!(FACEBOOK_CLIENT_ID && FACEBOOK_CLIENT_SECRET);
const hasEmail = !!(EMAIL_SERVER_HOST && EMAIL_SERVER_PORT && EMAIL_SERVER_USER && EMAIL_SERVER_PASSWORD && EMAIL_FROM);

// Only validate at runtime (not during build)
const isRuntime = typeof window !== "undefined" || process.env.NODE_ENV === "production";
if (isRuntime && !AUTH_SECRET) {
  console.error("AUTH_SECRET environment variable is required for secure session signing");
}
if (isRuntime && !hasGoogle && !hasFacebook && !hasEmail) {
  console.error("At least one auth provider must be configured (Google, Facebook, or Email)");
}

const emailPort = Number(EMAIL_SERVER_PORT);
const emailSecure = EMAIL_SERVER_SECURE === "true" || emailPort === 465;

// Build providers array based on what's configured
const providers = [];

if (hasGoogle && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true, // Allow existing users to link Google account
      authorization: { params: { prompt: "consent", access_type: "offline", response_type: "code" } },
      profile(profile) {
        const googleProfile = profile as GoogleProfile;
        return {
          id: googleProfile.sub ?? "",
          email: googleProfile.email ?? "",
          name: googleProfile.name ?? googleProfile.email ?? "",
          firstName: googleProfile.given_name ?? null,
          lastName: googleProfile.family_name ?? null,
          image: googleProfile.picture,
        };
      },
    })
  );
}

if (hasFacebook && FACEBOOK_CLIENT_ID && FACEBOOK_CLIENT_SECRET) {
  providers.push(
    FacebookProvider({
      clientId: FACEBOOK_CLIENT_ID,
      clientSecret: FACEBOOK_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true, // Allow existing users to link Facebook account
      profile(profile) {
        const fbProfile = profile as FacebookProfile;
        return {
          id: fbProfile.id ?? "",
          email: fbProfile.email ?? "",
          name: fbProfile.name ?? fbProfile.email ?? "",
          firstName: fbProfile.first_name ?? null,
          lastName: fbProfile.last_name ?? null,
          image: fbProfile.picture?.data?.url,
        };
      },
    })
  );
}

if (hasEmail && EMAIL_SERVER_HOST && EMAIL_FROM) {
  providers.push(
    EmailProvider({
      server: {
        host: EMAIL_SERVER_HOST,
        port: emailPort,
        auth: {
          user: EMAIL_SERVER_USER,
          pass: EMAIL_SERVER_PASSWORD,
        },
        secure: emailSecure,
      },
      from: EMAIL_FROM,
    })
  );
}

// Development-only credentials provider for local testing
if (process.env.NODE_ENV === "development") {
  providers.push(
    CredentialsProvider({
      id: "dev-credentials",
      name: "Dev Login",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "test@example.com" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        const email = credentials.email;
        const firstName = "Test";
        const lastName = "User";
        const fixedDevUserId = process.env.DEV_LOGIN_USER_ID || "893f3213-a410-4250-8c8e-ed86dcc3a4da";

        // Check if user already exists in DynamoDB (to keep consistent ID across logins)
        let existingUser = null;
        try {
          existingUser = await dynamoDBUsers.getByEmail(email);
          if (!existingUser) {
            console.warn(
              `[Dev Login] No existing user found for ${email}. Creating new user with fixed ID: ${fixedDevUserId}. ` +
              `If you expected an existing user, check DynamoDB GSI (EmailIndex), AWS credentials, and region.`
            );
          }
        } catch (error) {
          console.error("Failed to check existing user:", error);
        }

        // Use existing ID or fixed dev ID (prevents new UUIDs during dev)
        const userId = existingUser?.id || fixedDevUserId;

        // Create/update user in DynamoDB
        try {
          await dynamoDBUsers.upsert({
            id: userId,
            email,
            firstName: existingUser?.firstName || firstName,
            lastName: existingUser?.lastName || lastName,
          });
        } catch (error) {
          console.error("Failed to create/update dev user in DynamoDB:", error);
        }

        return {
          id: userId,
          email,
          name: `${existingUser?.firstName || firstName} ${existingUser?.lastName || lastName}`,
          firstName: existingUser?.firstName || firstName,
          lastName: existingUser?.lastName || lastName,
        };
      },
    })
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
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
      // Note: Cannot use __Host- prefix when using domain attribute (cookies don't match on sign-out)
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: process.env.NODE_ENV === "production"
          ? ".cannashieldct.com"  // Must match session token domain
          : undefined,
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: process.env.NODE_ENV === "production"
          ? ".cannashieldct.com"
          : undefined,
      },
    },
  },
  pages: { signIn: "/auth/login" },
  debug: process.env.AUTH_DEBUG === "true", // Only enable debug logs when AUTH_DEBUG=true
  callbacks: {
    async jwt({ token, account, profile, user }) {
      const isInitialSignIn = !!user;
      const provider = account?.provider || (token.provider as string | undefined) || 'unknown';

      if (isInitialSignIn) {
        console.log(`[Auth:JWT] Initial sign-in via ${provider} for user ${user.id}`);
      }

      // Persist provider info for auditing
      if (account?.provider) {
        token.provider = account.provider;
      }

      // Track email changes for debugging
      const previousEmail = token.email as string | undefined;

      // On initial sign-in, user will be defined (from Prisma adapter). Capture base identity.
      if (user) {
        token.id = user.id;
        // Only update email if we have a real value from the provider (not null/empty)
        if (user.email && user.email.trim()) {
          token.email = user.email;
          if (previousEmail && previousEmail !== user.email) {
            console.warn(`[Auth:JWT] Email changed for user ${user.id}: ${previousEmail} → ${user.email}`);
          }
        }
        token.firstName = (user as { firstName?: string | null }).firstName ?? token.firstName ?? null;
        token.lastName = (user as { lastName?: string | null }).lastName ?? token.lastName ?? null;
      }

      // Supplement names from OAuth profile if available
      if (account && profile) {
        if (account.provider === "google") {
          const googleProfile = profile as GoogleProfile;
          token.firstName = googleProfile.given_name ?? token.firstName ?? null;
          token.lastName = googleProfile.family_name ?? token.lastName ?? null;
          // Only update email if Google provides a real value (never overwrite with placeholder)
          if (googleProfile.email && googleProfile.email.trim()) {
            if (previousEmail && previousEmail !== googleProfile.email) {
              console.warn(`[Auth:JWT] Google email differs from token: ${previousEmail} → ${googleProfile.email}`);
            }
            token.email = googleProfile.email;
          } else if (googleProfile.email === null || googleProfile.email === "") {
            console.warn(`[Auth:JWT] Google returned empty email - keeping existing: ${previousEmail}`);
          }
          token.name = googleProfile.name ?? token.name;
          token.image = googleProfile.picture ?? token.image;
        } else if (account.provider === "facebook") {
          const fbProfile = profile as FacebookProfile;
          token.firstName = fbProfile.first_name ?? token.firstName ?? null;
          token.lastName = fbProfile.last_name ?? token.lastName ?? null;
          // Only update email if Facebook provides a real value (never overwrite with placeholder)
          if (fbProfile.email && fbProfile.email.trim()) {
            if (previousEmail && previousEmail !== fbProfile.email) {
              console.warn(`[Auth:JWT] Facebook email differs from token: ${previousEmail} → ${fbProfile.email}`);
            }
            token.email = fbProfile.email;
          } else if (fbProfile.email === null || fbProfile.email === "") {
            console.warn(`[Auth:JWT] Facebook returned empty email - keeping existing: ${previousEmail}`);
          }
          token.name = fbProfile.name ?? token.name;
          token.image = fbProfile.picture?.data?.url ?? token.image;
        }
      }

      // Sync user to DynamoDB on first login or when email is present
      if (token.id && token.email) {
        try {
          await dynamoDBUsers.upsert({
            id: token.id as string,
            email: token.email as string,
            firstName: (token.firstName as string | null) ?? null,
            lastName: (token.lastName as string | null) ?? null,
          });
          if (isInitialSignIn) {
            console.log(`[Auth:JWT] ✓ User ${token.id} synced to DynamoDB (${token.email})`);
          }
        } catch (error) {
          console.error(`[Auth:JWT] ✗ Failed to sync user ${token.id} to DynamoDB:`, error);
          // Don't fail auth if DynamoDB sync fails
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

            if (process.env.NODE_ENV === "development") {
              console.log(`[Auth:JWT] User ${token.id} tier: ${dbUser.subscriptionTier}/${dbUser.subscriptionStatus}`);
            }
          } else {
            console.warn(
              `[Auth:JWT] Token refresh: user ${token.id} (${token.email}) not found in DynamoDB. ` +
              `This may indicate a sync issue or deleted user. Continuing with cached token data.`
            );
          }
        } catch (error) {
          console.error(`[Auth:JWT] Failed to fetch user ${token.id} from DynamoDB:`, error);
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
          provider: (token.provider as string | undefined) ?? undefined,
        },
      };
    },
  },
};
