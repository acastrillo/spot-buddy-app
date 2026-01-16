import type { DynamoDBUser } from "@/lib/dynamodb";

export type Role = "user" | "admin" | "support";
export type Permission =
  | "admin:reset-quotas"
  | "admin:view-analytics"
  | "admin:manage-quotas"
  | "admin:manage-users"
  | "admin:view-logs"
  | "admin:manage-settings";

// Whitelist of admin emails - only these users can access admin panel
const ADMIN_EMAILS = ["acastrillo87@gmail.com"];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  user: [],
  support: ["admin:reset-quotas", "admin:view-logs"],
  admin: [
    "admin:reset-quotas",
    "admin:view-analytics",
    "admin:manage-quotas",
    "admin:manage-users",
    "admin:view-logs",
    "admin:manage-settings",
  ],
};

function normalizeRole(role: string): Role | null {
  if (role === "admin" || role === "support" || role === "user") {
    return role;
  }
  return null;
}

export function getUserRoles(user: DynamoDBUser): Role[] {
  // Check if user is in the admin whitelist - this overrides all other checks
  if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return ["admin"];
  }

  const roles =
    user.roles
      ?.map(normalizeRole)
      .filter((role): role is Role => role !== null) || [];

  if (roles.length > 0) {
    return roles;
  }

  if (user.isAdmin) {
    return ["admin"];
  }

  return ["user"];
}

export function hasRole(user: DynamoDBUser, role: Role): boolean {
  return getUserRoles(user).includes(role);
}

export function hasPermission(user: DynamoDBUser, permission: Permission): boolean {
  return getUserRoles(user).some((role) => ROLE_PERMISSIONS[role]?.includes(permission));
}

export function isAdmin(user: DynamoDBUser): boolean {
  return user.email ? ADMIN_EMAILS.includes(user.email.toLowerCase()) : false;
}
