import "server-only";
import { redirect } from "next/navigation";
import { createServerAuthClient } from "@/lib/supabase/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function getCurrentBrand() {
  const auth = await createServerAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;
  const db = createAdminSupabaseClient() as any;
  const { data } = await db.from("brand_profiles").select("*").eq("user_id", user.id).maybeSingle();
  return data ? { user, profile: data } : null;
}

export async function requireBrand() {
  const brand = await getCurrentBrand();
  if (!brand) redirect("/brand/onboarding");
  return brand;
}
