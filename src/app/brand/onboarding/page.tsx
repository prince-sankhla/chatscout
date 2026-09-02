import { redirect } from 'next/navigation';
import { getCurrentBrand } from '@/lib/brand/authorization';
import { createServerAuthClient } from '@/lib/supabase/auth';
import { saveBrandProfile } from '@/features/brand/actions';

export default async function BrandOnboardingPage() {
  const auth = await createServerAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect('/brand/login');
  const existing = await getCurrentBrand();
  if (existing) redirect('/brand');
  return <main className="page-content"><section className="form-panel"><p className="eyebrow">BRAND ONBOARDING</p><h1>Tell us about your company.</h1><p className="form-intro">Your brand profile is private to your workspace. Verification is reviewed separately and is never auto-granted.</p><form action={saveBrandProfile} className="form-grid"><label>Company name<input required name="companyName" placeholder="Your company"/></label><label>Contact name<input name="contactName" placeholder="Your name"/></label><label>Contact email<input name="contactEmail" type="email" defaultValue={user.email ?? ''}/></label><label>Industry<input name="industry" placeholder="Gaming, EdTech, D2C..."/></label><label>Website<input name="website" type="url" placeholder="https://"/></label><label>Logo URL<input name="logoUrl" type="url" placeholder="https://..."/></label><label className="full">Company description<textarea required name="description" rows={5} placeholder="What does your company do?"/></label><div className="form-actions full"><a className="admin-secondary" href="/">Cancel</a><button className="primary-button" type="submit">Create brand profile</button></div></form></section></main>;
}
