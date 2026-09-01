import Image from "next/image";
import Link from "next/link";
import { CommunityGrid } from "@/components/community/community-grid";
import { SearchForm } from "@/components/discovery/search-form";
import { Icon } from "@/components/ui/icon";
import { Reveal } from "@/components/ui/reveal";
import { getPublishedCommunities, getTrendingPublishedCommunities, searchPublishedCommunities } from "@/features/communities/data-access";
import { toCommunityPresentation } from "@/features/communities/presentation";

const topics = ["AI & ML", "Coding", "JEE", "NEET", "Anime", "Gaming", "Startups", "Memes", "Fitness", "Jaipur"] as const;
const categoryIcons = [["spark", "AI & ML"], ["code", "Coding"], ["graduation", "Education"], ["gamepad", "Gaming"], ["heart", "Anime & Manga"], ["briefcase", "Startups & Jobs"], ["music", "Music"], ["flame", "Memes & Humor"], ["map", "Local Communities"]] as const;

function EmptyCards({ message }: { message: string }) { return <p className="neon-empty">{message}</p>; }

export async function DiscoveryHome({ searchTerm = "" }: { searchTerm?: string }) {
  const [result, trendingResult, newResult] = await Promise.all([
    searchTerm ? searchPublishedCommunities(searchTerm) : getPublishedCommunities({ sort: "newest" }),
    getTrendingPublishedCommunities({}, 8),
    getPublishedCommunities({ sort: "newest" }),
  ]);
  const trending = trendingResult.data ? await Promise.all(trendingResult.data.slice(0, 4).map(toCommunityPresentation)) : [];
  const newCommunities = newResult.data ? await Promise.all(newResult.data.slice(0, 4).map(toCommunityPresentation)) : [];
  const message = result.error ? "Communities are temporarily unavailable. Please try again later." : searchTerm ? "No communities match your search. Try another topic." : "No published communities are available yet.";

  return (
    <main className="neon-page">
      <div className="neon-layout">
        <div className="neon-main">
          <section className="neon-hero">
            <div className="neon-copy">
              <p className="eyebrow">INDIA'S COMMUNITY DISCOVERY PLATFORM</p>
              <h1>Find Your Next<br /><span>Group Chat.</span></h1>
              <p>Discover active Instagram group chats by interest, language, and location.</p>
              <SearchForm query={searchTerm} />
              <div className="neon-hero-actions" aria-label="Primary actions">
                <Link className="hero-action primary" href="/search">Find a Group Chat <Icon name="arrow" size={14} /></Link>
                <Link className="hero-action" href="/submit">List Your Group Chat</Link>
              </div>
              <div className="neon-popular"><span>Explore:</span>{topics.map((topic) => <Link href={`/search?q=${encodeURIComponent(topic)}`} key={topic}>{topic}</Link>)}</div>
            </div>
            <div className="neon-art" aria-hidden="true"><i className="orbit one" /><i className="orbit two" /><Image src="/brand/chatscout-logo.png" alt="" width={1254} height={1254} priority /><span className="art-bubble bubble-a"><Icon name="spark" /></span><span className="art-bubble bubble-b"><Icon name="users" /></span></div>
          </section>

          <Reveal><section className="neon-section"><div className="neon-section-head"><h2><Icon name="flame" />Trending GCs</h2><Link href="/trending">View all <Icon name="arrow" size={14} /></Link></div>{trending.length ? <CommunityGrid communities={trending} /> : <EmptyCards message="Trending communities will appear as people interact with them." />}</section></Reveal>

          <Reveal><section className="neon-section"><div className="neon-section-head"><h2><Icon name="spark" />Freshly Added</h2><Link href="/new">View all <Icon name="arrow" size={14} /></Link></div>{newCommunities.length ? <CommunityGrid communities={newCommunities} /> : <EmptyCards message={message} />}</section></Reveal>

          <section className="launch-trust-strip" aria-label="Trust and freshness signals">
            <div className="launch-trust-item"><span className="launch-signal verified"><Icon name="check" size={12} /> Verified</span><p>ChatScout verification is a platform status; it is separate from whether an invite is currently active.</p></div>
            <div className="launch-trust-item"><span className="launch-signal active"><Icon name="bolt" size={12} /> Active</span><p>Active means the invite was recently checked and appeared reachable at the last health check.</p></div>
            <div className="launch-trust-item"><span className="launch-signal fresh"><Icon name="spark" size={12} /> Fresh</span><p>Fresh shows how recently the community was listed on ChatScout.</p></div>
          </section>

          <Reveal><section className="launch-section"><div className="launch-section-head"><div><p className="eyebrow">START WITH AN INTEREST</p><h2>Popular <span>categories</span></h2><p>Browse focused communities for study, tech, entertainment, lifestyle, local groups, and more.</p></div><Link href="/categories">View all <Icon name="arrow" size={14} /></Link></div><div className="launch-category-grid">{categoryIcons.map(([icon, label]) => <Link className="launch-category-card" href={`/search?q=${encodeURIComponent(label)}`} key={label}><Icon name={icon} size={14} /> {label}</Link>)}</div></section></Reveal>

          <Reveal><section className="launch-section"><div className="launch-section-head"><div><p className="eyebrow">HOW CHATSCOUT WORKS</p><h2>Discover. Preview. <span>Join.</span></h2><p>Get the useful context before you leave ChatScout for Instagram.</p></div></div><div className="launch-how-grid"><article className="launch-how-card"><span className="launch-how-number">1</span><h3>Discover</h3><p>Find communities by interest, language, region, age, member size, and other available filters.</p></article><article className="launch-how-card"><span className="launch-how-number">2</span><h3>Preview</h3><p>See community details, eligibility, verification, activity signals, and listing freshness before joining.</p></article><article className="launch-how-card"><span className="launch-how-number">3</span><h3>Join</h3><p>Open the community page and continue to Instagram through the existing join flow.</p></article></div><div className="launch-owner-flow"><strong>For community owners:</strong> List → Review → Get discovered</div></section></Reveal>

          <Reveal><section className="launch-section"><div className="launch-section-head"><div><p className="eyebrow">MORE COMMUNITIES ARE COMING</p><h2>Instagram today. <span>More next.</span></h2><p>ChatScout starts with Instagram and is designed to expand across the places people already build communities.</p></div></div><div className="launch-platforms"><article className="launch-platform-card live"><strong>Instagram</strong><span>Live</span></article><article className="launch-platform-card"><strong>WhatsApp</strong><span>Coming soon</span></article><article className="launch-platform-card"><strong>Telegram</strong><span>Coming soon</span></article><article className="launch-platform-card"><strong>Discord</strong><span>Coming soon</span></article></div></section></Reveal>

          <Reveal><section className="neon-bottom-cta"><div><b><Icon name="spark" />Have a Group Chat?</b><small>List it on ChatScout and reach people already searching for communities.</small></div><Link href="/submit">List your GC</Link><div><b><Icon name="shield" />Trust-first discovery</b><small>Verification and activity signals stay visible before people join.</small></div><div><b><Icon name="instagram" />Made for India</b><small>Discover communities across interests, campuses, cities, and languages.</small></div></section></Reveal>
        </div>

        <aside className="neon-rail">
          <Reveal><section className="why-card"><h2>Why <span>ChatScout?</span></h2><ul><li><Icon name="rocket" /><span><b>Fast discovery</b><small>Find relevant GCs without digging through random links.</small></span></li><li><Icon name="shield" /><span><b>Trust signals</b><small>Verification, activity, age, and member context stay visible.</small></span></li><li><Icon name="bolt" /><span><b>Fresh listings</b><small>New groups and health updates keep the directory useful.</small></span></li><li><Icon name="heart" /><span><b>All kinds of interests</b><small>Study, tech, entertainment, lifestyle, local, and more.</small></span></li></ul><Link href="/submit">List Your Group Chat</Link><small>Get discovered on ChatScout.</small></section></Reveal>
          <Reveal><section className="newly-card"><div className="neon-section-head"><h2>Quick discovery</h2><Link href="/new">New GCs <Icon name="arrow" size={14} /></Link></div>{newCommunities.slice(0, 2).length ? <CommunityGrid communities={newCommunities.slice(0, 2)} compact /> : <EmptyCards message="New communities will appear here." />}</section></Reveal>
          <Reveal><section className="categories-card"><h2>Explore categories</h2><div>{categoryIcons.map(([icon, label]) => <Link href={`/search?q=${encodeURIComponent(label)}`} key={label}><Icon name={icon} /><span>{label}</span></Link>)}</div><Link className="explore-categories" href="/categories">Explore All Categories <Icon name="arrow" size={15} /></Link></section></Reveal>
        </aside>
      </div>

      <footer className="neon-footer" id="footer"><div className="footer-brand"><Image src="/brand/chatscout-logo.png" alt="ChatScout" width={1254} height={1254} /><p>India&apos;s platform to discover Instagram group chats.</p></div><div><b>Discover</b><span>Home<br />Categories<br />Trending<br />New GCs</span></div><div><b>For communities</b><span>List a GC<br />How it works<br />Safety tips<br />Guidelines</span></div><div><b>Company</b><span>About Us<br />Blog<br />Contact</span></div><div className="copyright">© 2026 ChatScout. All rights reserved.<br /><small>Terms of Use　|　Privacy Policy</small></div></footer>
    </main>
  );
}
