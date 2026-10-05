import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";
import styles from "./faq.module.css";

export const metadata: Metadata = {
  title: "FAQ | ChatScout",
  description:
    "Answers about ChatScout community discovery, community owner listings, trust signals, and the future brand marketing platform.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "ChatScout FAQ",
    description:
      "Learn how ChatScout helps people discover communities and how community owners and brands can use the platform.",
    url: "/faq",
    type: "website",
  },
};

const faqs = [
  {
    question: "What is ChatScout?",
    answer:
      "ChatScout is a community discovery platform that helps people find relevant group chats and communities across Instagram, WhatsApp, Telegram and Discord. The public directory is the discovery layer; community-owner and business tools are the monetization layers built around that inventory.",
  },
  {
    question: "Which platforms can I discover on ChatScout?",
    answer:
      "ChatScout is designed for discovery across Instagram, WhatsApp, Telegram and Discord. Each listing points back to the original platform where the community is hosted.",
  },
  {
    question: "How do I find a community?",
    answer:
      "Search by topic and browse by platform, category, language, region, age and size where those listing details are available. Open a community page to review its available details and trust signals before continuing to the original platform.",
  },
  {
    question: "Does ChatScout own or operate the communities listed here?",
    answer:
      "No. ChatScout is a discovery directory. The communities and invite links are hosted on third-party platforms, and those platforms control the underlying community experience and access.",
  },
  {
    question: "What do ChatScout's health and trust signals mean?",
    answer:
      "They are freshness and quality signals used to make discovery safer and more useful. A checked invite means the link was reachable when it was checked; it does not guarantee chat activity, community behavior, membership quality or future availability.",
  },
  {
    question: "Can I list my own community on ChatScout?",
    answer:
      "Yes. Community owners can submit a listing so their community can be reviewed and considered for the public directory. Accurate names, descriptions, categories, invite links and other useful details make a listing more helpful to visitors.",
  },
  {
    question: "Can a community owner claim or update a listing?",
    answer:
      "Yes. ChatScout's owner workflow is designed to let community owners establish ownership where applicable and keep their public listing accurate. Availability of specific owner controls can depend on the listing and product rollout.",
  },
  {
    question: "Can community owners pay for better visibility?",
    answer:
      "ChatScout's owner model includes paid visibility options such as featured placement and promoted listings as the owner platform matures. These are intended to complement, not replace, the quality-based public directory.",
  },
  {
    question: "How will brands and businesses use ChatScout?",
    answer:
      "The planned business layer lets brands, creators, apps, colleges, gaming companies and event teams reach relevant community audiences through targeted community marketing opportunities—for example, finding India-based gaming communities for a campaign.",
  },
  {
    question: "How does ChatScout make money?",
    answer:
      "The public directory is designed to stay free for people looking for communities. Long-term revenue comes from optional B2B products such as featured placements, sponsored listings, community campaigns and brand-side targeting tools.",
  },
  {
    question: "Does a listing guarantee that a community is active, safe or still available?",
    answer:
      "No. Community information and third-party invite links can change. ChatScout uses quality and health checks, but no directory signal can guarantee community activity, behavior, moderation or continued availability.",
  },
  {
    question: "How can I report a problem with a community listing?",
    answer:
      "Use the report flow available from the relevant community page to flag a listing or trust-and-safety concern. ChatScout can then review the information and take appropriate directory action.",
  },
] as const;

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: { "@type": "Answer", text: answer },
  })),
};

function FaqItem({
  question,
  answer,
  defaultOpen = false,
}: {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}) {
  return (
    <details className="faq-item" open={defaultOpen}>
      <summary>
        <span>{question}</span>
        <span className={styles.toggle} aria-hidden="true">+</span>
      </summary>
      <div className="faq-answer">
        <p>{answer}</p>
      </div>
    </details>
  );
}

export default function FaqPage() {
  return (
    <PageShell>
      <main className={"page-content " + styles.page}>
        <Link href="/" className="back-link">
          ← Back to discovery
        </Link>

        <section className={styles.hero}>
          <div>
            <p className="eyebrow">CHATSCOUT FAQ</p>
            <h1>Everything about how ChatScout works.</h1>
            <p>
              From discovering group chats to listing a community—and the
              owner and business products being built around the directory.
            </p>
          </div>
          <div className={styles.heroMark} aria-hidden="true">
            <Icon name="spark" size={30} />
            <span>DISCOVER</span>
            <span>LIST</span>
            <span>GROW</span>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="faq-directory">
          <div className={styles.sectionHeading}>
            <div>
              <p className="eyebrow">PUBLIC DIRECTORY</p>
              <h2 id="faq-directory">For people looking for communities</h2>
            </div>
          </div>
          <div className={styles.list}>
            {faqs.slice(0, 5).map((faq, index) => (
              <FaqItem key={faq.question} {...faq} defaultOpen={index === 0} />
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="faq-owners">
          <div className={styles.sectionHeading}>
            <div>
              <p className="eyebrow">COMMUNITY OWNERS</p>
              <h2 id="faq-owners">For people who run a community</h2>
            </div>
            <Link className={styles.sectionLink} href="/for-admins">
              Owner tools <Icon name="arrow" size={14} />
            </Link>
          </div>
          <div className={styles.list}>
            {faqs.slice(5, 8).map((faq) => (
              <FaqItem key={faq.question} {...faq} />
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="faq-business">
          <div className="faq-section-heading">
            <div>
              <p className="eyebrow">BRANDS & BUSINESSES</p>
              <h2 id="faq-business">The business side of ChatScout</h2>
            </div>
          </div>
          <div className="faq-list">
            {faqs.slice(8).map((faq) => (
              <FaqItem key={faq.question} {...faq} />
            ))}
          </div>
        </section>

        <section className={styles.bottomCta}>
          <div>
            <p className="eyebrow">READY TO USE CHATSCOUT?</p>
            <h2>Find your next community.</h2>
            <p>
              Browse the directory or add your own community to the discovery
              network.
            </p>
          </div>
          <div className="neon-hero-actions">
            <Link className="hero-action primary" href="/search">
              Explore communities <Icon name="arrow" size={14} />
            </Link>
            <Link className="hero-action" href="/submit">
              List your community
            </Link>
          </div>
        </section>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </main>
    </PageShell>
  );
}
