import "server-only";

export function getSupabaseSecretKey() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("Missing required Supabase server configuration.");
  return key;
}
