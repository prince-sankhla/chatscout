import "server-only";

import { createAdminSupabaseClient } from "./admin";

export const COMMUNITY_IMAGE_BUCKET = "community-images";
const IMAGE_PATH_PATTERN = /^submissions\/([0-9a-f-]{36})\/([0-9a-f-]{36})\.(jpg|png|webp|avif)$/i;
const MIN_USABLE_IMAGE_BYTES = 4_000;

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
  const match = path.match(IMAGE_PATH_PATTERN);
  if (!match) return null;

  const supabase = createAdminSupabaseClient();
  const folder = `submissions/${match[1]}`;
  const filename = `${match[2]}.${match[3]}`;
  const { data: objects } = await supabase.storage.from(COMMUNITY_IMAGE_BUCKET).list(folder, {
    search: filename,
  });
  const object = objects?.find((item) => item.name === filename);
  const size = Number(object?.metadata?.size ?? object?.metadata?.contentLength ?? 0);

  // Some Instagram renders return a tiny generic Meta/Instagram placeholder.
  // Do not publish that as the community image; presentation can fall back to
  // the live invite resolver and obtain the actual group image instead.
  if (size > 0 && size < MIN_USABLE_IMAGE_BYTES) return null;

  const { data, error } = await supabase.storage.from(COMMUNITY_IMAGE_BUCKET).createSignedUrl(path, 60 * 60);
  return error ? null : data.signedUrl;
}
