/**
 * Deployment-configured admin allowlist. Keep these user IDs server-only.
 */
function configuredUserIds(value: string | undefined) {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
}

export function isAuthorizedAdmin(userId: string): boolean {
  return configuredUserIds(process.env.SUPABASE_ADMIN_USER_IDS).includes(userId);
}

/** Controller has platform-wide authority above regular moderators. */
export function isControllerUser(userId: string): boolean {
  const controllers = configuredUserIds(process.env.SUPABASE_CONTROLLER_USER_IDS);
  if (controllers.includes(userId)) return true;

  // Safe V1 fallback: when no dedicated controller allowlist exists,
  // the first configured admin remains the controller so the existing
  // deployment does not unexpectedly lose its highest-privilege user.
  const admins = configuredUserIds(process.env.SUPABASE_ADMIN_USER_IDS);
  return !controllers.length && admins[0] === userId;
}

export type AdminRole = "controller" | "admin";

export function getAdminRole(userId: string): AdminRole {
  return isControllerUser(userId) ? "controller" : "admin";
}
