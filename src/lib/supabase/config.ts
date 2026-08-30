const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function requirePublicEnvironment(value: string | undefined, name: string) {
  if (!value) throw new Error(`Missing required Supabase environment variable: ${name}`);
  return value;
}

export function getSupabasePublicConfig() {
  return {
    // Next.js replaces these direct NEXT_PUBLIC_ references in browser bundles.
    url: requirePublicEnvironment(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: requirePublicEnvironment(supabasePublishableKey, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  };
}
