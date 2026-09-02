import { redirect } from 'next/navigation';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { createServerAuthClient } from '@/lib/supabase/auth';

export default async function BrandLoginPage() {
  const supabase = await createServerAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/brand/onboarding');
  return <main className="page-content form-page"><section className="form-panel submit-login-panel"><p className="eyebrow">BRAND WORKSPACE</p><h1>Reach the communities that matter.</h1><p className="form-intro">Sign in with Google to create a private brand profile and start building campaign opportunities.</p><GoogleSignInButton /></section></main>;
}
