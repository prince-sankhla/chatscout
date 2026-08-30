import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";

const categories = [["code", "Coding"], ["graduation", "Education"], ["gamepad", "Gaming"], ["heart", "Anime"], ["briefcase", "Business"], ["map", "Jaipur"], ["music", "Music"], ["spark", "Memes"]] as const;
export default function CategoriesPage() { return <PageShell><main className="platform-page"><section className="platform-heading"><Link href="/" className="back-link">← Back to discovery</Link><p className="eyebrow">CHATSCOUT DISCOVERY</p><h1>Browse categories</h1><p>Explore Instagram group chats by interest.</p></section><div className="platform-categories">{categories.map(([icon, label]) => <Link href={`/search?q=${label}`} key={label}><Icon name={icon} /><b>{label}</b><span>Explore communities <Icon name="arrow" size={14} /></span></Link>)}</div></main></PageShell>; }
