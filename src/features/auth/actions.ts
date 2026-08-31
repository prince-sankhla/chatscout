"use server";

import { redirect } from "next/navigation";
import { createServerAuthClient } from "@/lib/supabase/auth";
import { isAuthorizedAdmin } from "@/lib/supabase/admin-authorization";

export async function loginAdmin(formData: FormData) {
  const email = typeof formData.get("email") === "string" ? String(formData.get("email")).trim() : "";
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
  if (!email || !password) redirect("/admin/login?error=invalid");
  const supabase = await createServerAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) redirect("/admin/login?error=credentials");
  if (!isAuthorizedAdmin(data.user.id)) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=unauthorized");
  }
  redirect("/admin");
}

export async function logoutAdmin() {
  const supabase = await createServerAuthClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
