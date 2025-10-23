import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";

// Force Node runtime so NextAuth can parse urlencoded POST bodies for CSRF checks.
export const runtime = "nodejs";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
