import { loginAdmin } from "@/features/auth/actions";

type LoginPageProps = { searchParams: Promise<{ error?: string }> };

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const errorMessage = error === "unauthorized" ? "This account is not authorized for admin access." : error === "session" ? "Your admin session could not be verified. Please sign in again." : error ? "Unable to sign in with those credentials." : null;
  return <main className="auth-page"><section className="form-panel auth-panel"><p className="eyebrow">CHATSCOUT ADMIN</p><h1>Sign in to review communities.</h1><form action={loginAdmin} className="community-form"><label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label>{errorMessage && <p className="form-message error" aria-live="polite">{errorMessage}</p>}<button className="primary-button form-submit" type="submit">Sign in</button></form></section></main>;
}
