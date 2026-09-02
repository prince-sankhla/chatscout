import { ActiveMobileNav } from "./active-nav";
import { createServerAuthClient } from "@/lib/supabase/auth";

export async function MobileNav() {
  const supabase = await createServerAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  return <nav className="mobile-nav" aria-label="Mobile navigation"><ActiveMobileNav authenticated={Boolean(user)} /></nav>;
}
