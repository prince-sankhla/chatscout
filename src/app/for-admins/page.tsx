import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { PageShell } from "@/components/layout/page-shell";

export const metadata = {
  title: "Community Rewards for Owners | ChatScout",
  description: "List your community, build trust on ChatScout, and unlock relevant brand opportunities when your community becomes eligible.",
  alternates: { canonical: "/for-admins" },
  robots: { index: true, follow: true },
};

const steps = [
  ["users", "List your community", "Create a searchable public presence with the details people need before joining."],
  ["check", "Get verified", "Claim your community and complete the ownership and trust checks available to you."],
  ["shield", "Build community trust", "Keep your listing accurate, healthy and useful so your profile stays credible."],
  ["spark", "Receive relevant opportunities", "Eligible communities may be matched with suitable brand campaigns."],
  ["briefcase", "Complete campaign requirements", "Follow the campaign brief and submit the required deliverables or proof."],
  ["check", "Get your reward approved", "Approved campaign work creates Community Rewards credits in your owner account."],
] as const;

const benefits = [
  ["users", "Get Discovered", "Give your community a public, searchable presence across ChatScout."],
  ["shield", "Build Trust", "Ownership, verification and health signals help people evaluate your listing."],
  ["briefcase", "Brand Opportunities", "Eligible communities may be matched with campaigns that fit their profile."],
  ["spark", "Community Rewards", "Approved campaign work can create reward credits in your ChatScout account."],
] as const;

export default function ForAdminsPage() {
  return <PageShell><main className="page-content reward-landing">
    <section className="reward-hero">
      <div className="reward-hero-copy">
        <p className="eyebrow">COMMUNITY REWARDS</p>
        <h1>Turn your community into an <span>earning opportunity.</span></h1>
        <p className="reward-hero-text">List your community, build trust on ChatScout, and unlock relevant brand opportunities when your community becomes eligible.</p>
        <div className="reward-hero-actions"><Link className="primary-button list-button" href="/submit">List Your Community <Icon name="arrow" size={14}/></Link><a className="reward-secondary" href="#how-it-works">See How It Works</a></div>
        <p className="reward-disclaimer">Eligible communities may receive opportunities. Campaign availability and rewards are not guaranteed.</p>
      </div>
      <div className="reward-hero-panel" aria-hidden="true">
        <div className="reward-hero-panel-top"><span>COMMUNITY REWARDS</span><span className="reward-status"><i/>Owner-ready</span></div>
        <div className="reward-balance">Community profile</div>
        <div className="reward-meter"><span/><span/><span/><span/></div>
        <div className="reward-panel-row"><span>Discoverability</span><strong>Public listing</strong></div>
        <div className="reward-panel-row"><span>Trust</span><strong>Verification based</strong></div>
        <div className="reward-panel-row"><span>Opportunities</span><strong>When eligible</strong></div>
        <div className="reward-panel-empty"><Icon name="spark" size={16}/><div><strong>No campaign matched yet</strong><small>Your real opportunities will appear here when available.</small></div></div>
      </div>
    </section>

    <section className="reward-intro-grid"><div><p className="eyebrow">WHAT IS COMMUNITY REWARDS?</p><h2>A clearer path from community ownership to opportunities.</h2></div><p>ChatScout starts with discovery. Community Rewards is the owner side: a structured way to build a credible community profile, become eligible for relevant campaigns and complete approved work without promising guaranteed income.</p></section>

    <section className="reward-section" id="how-it-works">
      <div className="reward-section-heading"><div><p className="eyebrow">HOW IT WORKS</p><h2>Six steps. One owner workflow.</h2><p>Your community profile does the groundwork. Campaign execution only starts when a real opportunity exists.</p></div></div>
      <div className="reward-steps">{steps.map(([icon,title,copy],index)=><article key={title} className="reward-step"><span className="reward-step-number">0{index+1}</span><span className="reward-step-icon"><Icon name={icon} size={18}/></span><h3>{title}</h3><p>{copy}</p></article>)}</div>
    </section>

    <section className="reward-section">
      <div className="reward-section-heading"><div><p className="eyebrow">WHY LIST YOUR COMMUNITY?</p><h2>Build visibility before you chase opportunities.</h2></div></div>
      <div className="reward-benefits">{benefits.map(([icon,title,copy])=><article key={title}><span className="reward-benefit-icon"><Icon name={icon} size={17}/></span><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div>
    </section>

    <section className="reward-preview-section"><div className="reward-section-heading"><div><p className="eyebrow">OWNER EXPERIENCE</p><h2>A real dashboard, without fake campaign data.</h2><p>When there are no matching campaigns, ChatScout keeps the experience honest instead of filling it with demo numbers or placeholder brands.</p></div></div><div className="reward-dashboard-preview"><aside><span className="preview-brand">ChatScout</span><span className="preview-side-active">Overview</span><span>My Communities</span><span>Rewards</span><span>Notifications</span><span>Profile</span></aside><div className="preview-main"><div className="preview-head"><div><small>COMMUNITY REWARDS</small><h3>Campaign opportunities</h3></div><span className="preview-chip">Real data only</span></div><div className="preview-stats"><span><small>Opportunities</small><b>0</b></span><span><small>Participations</small><b>0</b></span><span><small>Approved rewards</small><b>₹0</b></span></div><div className="preview-empty"><span className="preview-empty-icon"><Icon name="spark" size={17}/></span><div><h4>No campaigns match your communities yet.</h4><p>Keep your community profile complete and verified. New opportunities will appear here when you're eligible.</p><Link href="/dashboard">View My Community</Link></div></div></div></div></section>

    <section className="reward-final-cta"><div><p className="eyebrow">READY TO START?</p><h2>List your community. Let discovery come first.</h2><p>ChatScout is built around community discovery; rewards sit underneath that experience for eligible owners.</p></div><div className="reward-final-actions"><Link className="primary-button list-button" href="/submit">List Your Community</Link><Link className="admin-secondary" href="/dashboard">Open owner dashboard</Link></div></section>
  </main></PageShell>;
}
