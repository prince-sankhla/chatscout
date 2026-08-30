/**
 * Deployment-configured allowlist for the small V1 admin surface.
 *
 * Keep this value server-only. It contains Supabase Auth user IDs, separated
 * by commas, and is intentionally not a general-purpose role system.
 */
export function isAuthorizedAdmin(userId: string): boolean {
  const allowedUserIds = process.env.SUPABASE_ADMIN_USER_IDS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return allowedUserIds?.includes(userId) ?? false;
}
