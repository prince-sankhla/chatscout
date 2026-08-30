"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function GoogleSignInButton() {
  const [failed, setFailed] = useState(false);

  async function signInWithGoogle() {
    setFailed(false);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setFailed(true);
  }

  return <><button className="primary-button google-sign-in" type="button" onClick={signInWithGoogle}><span aria-hidden="true">G</span>Continue with Google</button>{failed && <p className="form-message error">Unable to start Google sign-in. Please try again.</p>}</>;
}
