import Link from "next/link";

export function Footer() {
  return (
    <footer className="neon-footer">
      <div className="footer-brand">
        <b>ChatScout</b>
        <p>Discover communities across the platforms people already use.</p>
      </div>
      <div>
        <b>Discover</b>
        <span>
          <Link href="/">Home</Link><br />
          <Link href="/search">Search</Link><br />
          <Link href="/categories">Categories</Link><br />
          <Link href="/trending">Trending</Link><br />
          <Link href="/new">New Communities</Link><br />
          <Link href="/faq">FAQ</Link>
        </span>
      </div>
      <div>
        <b>Platforms</b>
        <span>
          <Link href="/search?platform=instagram">Instagram</Link><br />
          <Link href="/search?platform=whatsapp">WhatsApp</Link><br />
          <Link href="/search?platform=telegram">Telegram</Link><br />
          <Link href="/search?platform=discord">Discord</Link>
        </span>
      </div>
      <div>
        <b>For communities</b>
        <span>
          <Link href="/submit">List a community</Link><br />
          <Link href="/for-admins">For community owners</Link><br />
          <Link href="/categories">Explore categories</Link>
        </span>
      </div>
      <div className="copyright">
        © 2026 ChatScout. All rights reserved.
        <br />
        <small><Link href="/terms">Terms of Use</Link>　|　<Link href="/privacy">Privacy Policy</Link></small>
      </div>
    </footer>
  );
}
