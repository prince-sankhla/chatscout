import Link from "next/link";

export function Footer() {
  return (
    <footer className="neon-footer">
      <div className="footer-brand">
        <p>Community discovery across the platforms people already use.</p>
      </div>
      <div>
        <b>Discover</b>
        <span>
          <Link href="/">Home</Link><br />
          <Link href="/categories">Categories</Link><br />
          <Link href="/trending">Trending</Link><br />
          <Link href="/new">New Communities</Link>
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
          <Link href="/submit">List a GC</Link><br />
          <Link href="/for-admins">Community Rewards</Link><br />
          <Link href="/categories">Guides &amp; discovery</Link>
        </span>
      </div>
      <div className="copyright">
        © 2026 ChatScout. All rights reserved.
        <br />
        <small>Terms of Use　|　Privacy Policy</small>
      </div>
    </footer>
  );
}
