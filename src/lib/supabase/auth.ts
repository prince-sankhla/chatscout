import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Database } from "@/types/database";
import { isAuthorizedAdmin } from "./admin-authorization";
import { getSupabasePublicConfig } from "./config";

export async function createServerAuthClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabasePublicConfig();
  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot mutate cookies; the proxy refreshes sessions.
        }
      },
    },
  });
}

export async function requireAdminUser() {
  const supabase = await createServerAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAuthorizedAdmin(user.id)) redirect("/admin/login");
  return user;
}
