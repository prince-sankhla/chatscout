import { NextResponse, type NextRequest } from "next/server";
import { createServerAuthClient } from "@/lib/supabase/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { COMMUNITY_IMAGE_BUCKET } from "@/lib/supabase/community-images";

// Keep uploads within Vercel's request body ceiling with multipart overhead.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const imageTypes = {
  "image/jpeg": { extension: "jpg", signature: [0xff, 0xd8, 0xff] },
  "image/png": { extension: "png", signature: [0x89, 0x50, 0x4e, 0x47] },
  "image/webp": { extension: "webp", signature: [0x52, 0x49, 0x46, 0x46] },
} as const;

function hasValidImageSignature(bytes: Uint8Array, type: keyof typeof imageTypes) {
  const signature = imageTypes[type].signature;
  if (!signature.every((value, index) => bytes[index] === value)) return false;
  return type !== "image/webp" || String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}

export async function POST(request: NextRequest) {
  const supabase = await createServerAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to upload an image." }, { status: 401 });

  const formData = await request.formData();
  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0 || image.size > MAX_IMAGE_BYTES || !(image.type in imageTypes)) {
    return NextResponse.json({ error: "Choose a JPG, PNG, or WebP image up to 4 MB." }, { status: 400 });
  }

  const bytes = new Uint8Array(await image.arrayBuffer());
  const type = image.type as keyof typeof imageTypes;
  if (!hasValidImageSignature(bytes, type)) return NextResponse.json({ error: "The selected file is not a valid image." }, { status: 400 });

  const path = `submissions/${user.id}/${crypto.randomUUID()}.${imageTypes[type].extension}`;
  const admin = createAdminSupabaseClient();
  const { error } = await admin.storage.from(COMMUNITY_IMAGE_BUCKET).upload(path, bytes, {
    contentType: image.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) return NextResponse.json({ error: "Image upload could not be completed. Please try a smaller image." }, { status: 503 });
  return NextResponse.json({ path });
}
