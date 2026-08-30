import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const inputFlag = args.indexOf("--input");
const inputPath = resolve(process.cwd(), inputFlag >= 0 ? args[inputFlag + 1] : "supabase/seed/dev-communities.json");
const isDevelopmentImport = args.includes("--development");
const isProductionImport = args.includes("--production") && args.includes("--confirm-unpublished");

if (!isDevelopmentImport && !isProductionImport) {
  throw new Error("Refusing import. Use --development, or --production --confirm-unpublished. Imports always create drafts.");
}

function loadLocalEnvironment() {
  return readFile(resolve(process.cwd(), ".env.local"), "utf8")
    .then((contents) => {
      for (const line of contents.split(/\r?\n/)) {
        const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
        if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
      }
    })
    .catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
}

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function isInstagramUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && (host === "instagram.com" || host.endsWith(".instagram.com") || host === "ig.me");
  } catch {
    return false;
  }
}

function text(value, maximum) {
  return typeof value === "string" && value.trim() && value.trim().length <= maximum ? value.trim() : null;
}

function validateDataset(dataset) {
  const errors = [];
  if (!dataset || !Array.isArray(dataset.categories) || !Array.isArray(dataset.communities)) return ["Dataset must include categories and communities arrays."];
  const categories = new Map();
  for (const [index, category] of dataset.categories.entries()) {
    const name = text(category.name, 80);
    const slug = text(category.slug, 80);
    if (!name || !slug || slug !== slugify(slug)) errors.push(`categories[${index}] needs a name and slug.`);
    else if (categories.has(slug)) errors.push(`categories[${index}] duplicates category slug '${slug}'.`);
    else categories.set(slug, { name, slug, description: text(category.description, 2_000), sortOrder: Number.isInteger(category.sortOrder) && category.sortOrder >= 0 ? category.sortOrder : 0 });
  }
  const communities = [];
  const seenSlugs = new Set();
  for (const [index, community] of dataset.communities.entries()) {
    const name = text(community.name, 120);
    const description = text(community.description, 2_000);
    const categorySlug = text(community.categorySlug, 80);
    const inviteUrl = text(community.inviteUrl, 1_000);
    const slug = name ? slugify(name) : "";
    if (!name || !description || !categorySlug || !inviteUrl || !isInstagramUrl(inviteUrl)) errors.push(`communities[${index}] has missing or invalid required fields.`);
    else if (!categories.has(categorySlug)) errors.push(`communities[${index}] references unknown category '${categorySlug}'.`);
    else if (!slug || seenSlugs.has(slug)) errors.push(`communities[${index}] has a duplicate or invalid stable slug.`);
    else if (community.memberCount != null && (!Number.isInteger(community.memberCount) || community.memberCount < 0)) errors.push(`communities[${index}] has an invalid memberCount.`);
    else { seenSlugs.add(slug); communities.push({ name, slug, description, categorySlug, inviteUrl, language: text(community.language, 80), region: text(community.region, 120), memberCount: community.memberCount ?? null }); }
  }
  return { errors, categories, communities };
}

await loadLocalEnvironment();
const rawDataset = JSON.parse(await readFile(inputPath, "utf8"));
if (isDevelopmentImport && rawDataset.dataset?.environment !== "development") throw new Error("--development only accepts a dataset marked development.");
if (isDevelopmentImport && process.env.CHATSCOUT_IMPORT_ENV !== "development") throw new Error("Refusing development fixtures without CHATSCOUT_IMPORT_ENV=development.");
if (isProductionImport && process.env.CHATSCOUT_IMPORT_ENV !== "production") throw new Error("Refusing a production import without CHATSCOUT_IMPORT_ENV=production.");
const validated = validateDataset(rawDataset);
if (Array.isArray(validated)) throw new Error(validated.join("\n"));
if (validated.errors.length) throw new Error(`Import validation failed:\n${validated.errors.join("\n")}`);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error("Missing server-side Supabase configuration.");
const { createClient } = await import("@supabase/supabase-js");
const supabase = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });

for (const category of validated.categories.values()) {
  const { error } = await supabase.from("categories").upsert({ name: category.name, slug: category.slug, description: category.description, sort_order: category.sortOrder, is_active: true }, { onConflict: "slug" });
  if (error) throw new Error(`Could not import category '${category.slug}'.`);
}

let imported = 0;
for (const community of validated.communities) {
  const { data: category, error: categoryError } = await supabase.from("categories").select("id").eq("slug", community.categorySlug).single();
  if (categoryError || !category) throw new Error(`Could not resolve category '${community.categorySlug}'.`);
  const values = { name: community.name, slug: community.slug, invite_url: community.inviteUrl, description: community.description, language: community.language, region: community.region, member_count: community.memberCount, status: "draft", published_at: null };
  const { data: existingByInvite, error: existingError } = await supabase.from("communities").select("id").eq("invite_url", community.inviteUrl).maybeSingle();
  if (existingError) throw new Error(`Could not check '${community.slug}' for duplicates.`);
  const { data: saved, error: saveError } = existingByInvite
    ? await supabase.from("communities").update(values).eq("id", existingByInvite.id).select("id").single()
    : await supabase.from("communities").upsert(values, { onConflict: "slug" }).select("id").single();
  if (saveError || !saved) throw new Error(`Could not import '${community.slug}'.`);
  const { error: relationError } = await supabase.from("community_categories").upsert({ community_id: saved.id, category_id: category.id }, { onConflict: "community_id,category_id" });
  if (relationError) throw new Error(`Could not categorize '${community.slug}'.`);
  imported += 1;
}

console.log(`Imported ${imported} draft communities from ${inputPath}. No community was published.`);
