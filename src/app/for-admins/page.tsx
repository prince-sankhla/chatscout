import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "For Community Owners | List Your GC | ChatScout",
  description: "List your community on ChatScout, get discovered by people looking for group chats, and prepare for future community monetization opportunities.",
  alternates: { canonical: "/for-admins" },
  robots: { index: true, follow: true },
};

const steps = ["List your community", "Verify ownership", "Build trust and history", "Get matched with relevant opportunities", "Complete eligible campaigns", "Receive community rewards"];
export default function ForAdminsPage() { return <PageShell><main className="page-content form-page"><section className="form-panel owner-landing"><p className="eyebrow">FOR COMMUNITY OWNERS</p><h1>List your community. Get discovered.</h1><p className="form-intro">ChatScout helps community owners create a trusted public listing so people can discover their group. Eligible communities may also unlock future brand and monetization opportunities.</p><div className="owner-value-grid"><article><b>More discoverability</b><span>Give your community a searchable public presence across ChatScout.</span></article><article><b>Verified presence</b><span>Ownership review helps keep listings trustworthy.</span></article><article><b>Future opportunities</b><span>Eligible communities may be considered for relevant brand campaigns.</span></article><article><b>Community Rewards</b><span>Future campaign participation may create reward opportunities.</span></article></div><div className="owner-steps"><h2>How it works</h2>{steps.map((step,index)=><div key={step}><strong>{index+1}</strong><span>{step}</span></div>)}</div><p className="form-note">Campaigns, campaign execution and payouts are not available yet. No earnings or campaign placement are guaranteed.</p><div className="submission-success-actions"><Link className="primary-button list-button" href="/submit">List Your GC</Link><Link className="admin-secondary" href="/dashboard">Open owner dashboard</Link></div></section></main></PageShell>; }
