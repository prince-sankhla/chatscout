function requirePublicEnvironment(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required Supabase environment variable: ${name}`);
  return value;
}

export function getSupabasePublicConfig() {
  return {
    url: requirePublicEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: requirePublicEnvironment("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  };
}

export function getSupabaseSecretKey() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("Missing required Supabase server configuration.");
  return key;
}
