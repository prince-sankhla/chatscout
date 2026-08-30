import { loginAdmin } from "@/features/auth/actions";

type LoginPageProps = { searchParams: Promise<{ error?: string }> };

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  return <main className="auth-page"><section className="form-panel auth-panel"><p className="eyebrow">CHATSCOUT ADMIN</p><h1>Sign in to review communities.</h1><form action={loginAdmin} className="community-form"><label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label>{error && <p className="form-message error">Unable to sign in with those credentials.</p>}<button className="primary-button form-submit" type="submit">Sign in</button></form></section></main>;
}
