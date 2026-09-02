import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";
import { categoryIcon, getActiveRootCategories } from "@/features/categories/data-access";

export default async function CategoriesPage() {
  const categories = await getActiveRootCategories();

  return (
    <PageShell>
      <main className="platform-page">
        <section className="platform-heading">
          <Link href="/" className="back-link">← Back to discovery</Link>
          <p className="eyebrow">CHATSCOUT DISCOVERY</p>
          <h1>Find communities around what you care about.</h1>
          <p>Choose a main category first, then explore its focused subcategories.</p>
        </section>

        <div className="platform-categories">
          {categories.map((category) => (
            <Link href={`/categories/${category.slug}`} key={category.id}>
              <Icon name={categoryIcon(category.icon_key)} />
              <b>{category.name}</b>
              <span>{category.description ?? "Explore related communities"} <Icon name="arrow" size={14} /></span>
            </Link>
          ))}
        </div>
      </main>
    </PageShell>
  );
}
