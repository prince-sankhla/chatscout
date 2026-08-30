import "server-only";

import { createAdminSupabaseClient } from "./admin";

export const COMMUNITY_IMAGE_BUCKET = "community-images";
const IMAGE_PATH_PATTERN = /^submissions\/([0-9a-f-]{36})\/([0-9a-f-]{36})\.(jpg|png|webp)$/i;

export function isSubmissionImagePath(path: string, userId: string) {
  const match = path.match(IMAGE_PATH_PATTERN);
  return Boolean(match && match[1] === userId);
}

export async function storedSubmissionImageExists(path: string) {
  const match = path.match(IMAGE_PATH_PATTERN);
  if (!match) return false;
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.storage.from(COMMUNITY_IMAGE_BUCKET).list(`submissions/${match[1]}`, { search: `${match[2]}.${match[3]}` });
  return !error && data.some((item) => item.name === `${match[2]}.${match[3]}`);
}

export async function removeCommunityImage(path: string | null) {
  if (!path || !IMAGE_PATH_PATTERN.test(path)) return;
  const supabase = createAdminSupabaseClient();
  await supabase.storage.from(COMMUNITY_IMAGE_BUCKET).remove([path]);
}

export async function getPublishedCommunityImageUrl(path: string | null) {
  if (!path || !IMAGE_PATH_PATTERN.test(path)) return null;
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.storage.from(COMMUNITY_IMAGE_BUCKET).createSignedUrl(path, 60 * 60);
  return error ? null : data.signedUrl;
}
