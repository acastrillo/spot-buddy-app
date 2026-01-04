import type { DynamoDBUser } from "@/lib/dynamodb";

export type Role = "user" | "admin" | "support";
export type Permission = "admin:reset-quotas";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  user: [],
  support: ["admin:reset-quotas"],
  admin: ["admin:reset-quotas"],
};

function normalizeRole(role: string): Role | null {
  if (role === "admin" || role === "support" || role === "user") {
    return role;
  }
  return null;
}

export function getUserRoles(user: DynamoDBUser): Role[] {
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
