import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";

const categoryGroups = [
  {
    title: "Education",
    items: [["graduation", "College & University"], ["graduation", "JEE & NEET"], ["graduation", "Competitive Exams"], ["graduation", "Study Groups"], ["code", "BCA / MCA"], ["briefcase", "Career & Jobs"]],
  },
  {
    title: "Technology",
    items: [["spark", "AI & ML"], ["code", "Coding"], ["code", "Web Development"], ["shield", "Cybersecurity"], ["briefcase", "Startups & Entrepreneurship"], ["bolt", "Cloud & DevOps"]],
  },
  {
    title: "Entertainment",
    items: [["heart", "Anime & Manga"], ["gamepad", "Gaming"], ["music", "Music"], ["spark", "Memes & Humor"], ["flame", "Movies & OTT"], ["trend", "Sports"]],
  },
  {
    title: "Lifestyle & Interests",
    items: [["heart", "Fitness"], ["heart", "Health & Wellness"], ["spark", "Fashion & Beauty"], ["map", "Travel"], ["spark", "Photography"], ["music", "Books & Writing"]],
  },
  {
    title: "Business & Finance",
    items: [["briefcase", "Finance & Investing"], ["spark", "Crypto & Web3"], ["briefcase", "Creators"], ["briefcase", "Freelance"], ["briefcase", "Business"], ["spark", "Networking"]],
  },
  {
    title: "Local & Social",
    items: [["map", "Jaipur"], ["map", "Delhi NCR"], ["map", "Mumbai"], ["map", "Bengaluru"], ["users", "Social & Community"], ["globe", "India-wide"]],
  },
] as const;

export default function CategoriesPage() {
  return (
    <PageShell>
      <main className="platform-page">
        <section className="platform-heading">
          <Link href="/" className="back-link">← Back to discovery</Link>
          <p className="eyebrow">CHATSCOUT DISCOVERY</p>
          <h1>Find communities around what you care about.</h1>
          <p>Browse group chats across education, technology, entertainment, lifestyle, business, and local interests.</p>
        </section>

        <div className="platform-category-groups">
          {categoryGroups.map((group) => (
            <section className="category-group" key={group.title}>
              <div className="section-heading">
                <h2>{group.title}</h2>
              </div>
              <div className="platform-categories">
                {group.items.map(([icon, label]) => (
                  <Link href={`/search?q=${encodeURIComponent(label)}`} key={label}>
                    <Icon name={icon} />
                    <b>{label}</b>
                    <span>Explore communities <Icon name="arrow" size={14} /></span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </PageShell>
  );
}
