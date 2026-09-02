import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_key: string | null;
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
  parent: { id: string; name: string; slug: string } | null;
};

export async function getActiveRootCategories(): Promise<CategoryNode[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id,name,slug,description,icon_key,parent_id,display_order,is_active")
    .eq("is_active", true)
    .is("parent_id", null)
    .order("display_order", { ascending: true });
  if (error) return [];
  return (data ?? []).map((row) => ({ ...row, parent: null }));
}

export async function getActiveChildren(parentId: string): Promise<CategoryNode[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id,name,slug,description,icon_key,parent_id,display_order,is_active")
    .eq("is_active", true)
    .eq("parent_id", parentId)
    .order("display_order", { ascending: true });
  if (error) return [];
  return (data ?? []).map((row) => ({ ...row, parent: null }));
}

export async function getActiveCategoryBySlug(slug: string): Promise<CategoryNode | null> {
  const supabase = createServerSupabaseClient();
  const { data: row, error } = await supabase
    .from("categories")
    .select("id,name,slug,description,icon_key,parent_id,display_order,is_active")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !row) return null;
  let parent: CategoryNode["parent"] = null;
  if (row.parent_id) {
    const { data: parentRow } = await supabase
      .from("categories")
      .select("id,name,slug")
      .eq("id", row.parent_id)
      .eq("is_active", true)
      .maybeSingle();
    if (parentRow) parent = parentRow;
  }
  return { ...row, parent };
}

export async function hasActiveChildren(categoryId: string): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  const { count, error } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .eq("parent_id", categoryId);
  return !error && (count ?? 0) > 0;
}

export function categoryIcon(iconKey: string | null) {
  return iconKey ?? "spark";
}
