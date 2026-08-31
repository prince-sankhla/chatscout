"use server";

import { redirect } from "next/navigation";
import { createServerAuthClient } from "@/lib/supabase/auth";

export async function logoutOwner() {
  const supabase = await createServerAuthClient();
  await supabase.auth.signOut();
  redirect("/");
}
