"use client";

/* eslint-disable @next/next/no-img-element -- Admin previews use short-lived Supabase signed URLs and local object URLs. */

import { useState, type ChangeEvent } from "react";
import { updateCommunity } from "@/features/moderation/actions";
import type { AdminCommunityItem } from "@/features/moderation/data-access";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const imageTypes = ["image/jpeg", "image/png", "image/webp"];

type CommunityEditFormProps = {
  community: AdminCommunityItem;
};

export function CommunityEditForm({ community }: CommunityEditFormProps) {
  const [imagePath, setImagePath] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(community.imageUrl);
  const [uploadState, setUploadState] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const image = event.target.files?.[0];
    setUploadState(null);
    setImagePath("");
    if (!image) return;
    if (!imageTypes.includes(image.type) || image.size > MAX_IMAGE_BYTES) {
      setPreviewUrl(community.imageUrl);
      setUploadState("Choose a JPG, PNG, or WebP image up to 4 MB.");
      return;
    }

    setIsUploading(true);
    setPreviewUrl(URL.createObjectURL(image));
    const data = new FormData();
    data.set("image", image);
    const response = await fetch("/api/submission-image", { method: "POST", body: data });
    const result = await response.json() as { path?: string; error?: string };
    setIsUploading(false);
    if (!response.ok || !result.path) {
      setImagePath("");
      setUploadState(result.error ?? "Image upload could not be completed.");
      return;
    }
    setImagePath(result.path);
    setUploadState("Image ready.");
  }

  return (
    <form action={updateCommunity} className="admin-edit-form">
      <input type="hidden" name="communityId" value={community.id} />
      <input type="hidden" name="imagePath" value={imagePath} />
      <div className="form-row">
        <label>Name<input name="name" required maxLength={120} defaultValue={community.name} /></label>
        <label>Category<input name="category" required maxLength={80} defaultValue={community.category ?? ""} /></label>
      </div>
      <label>Description<textarea name="description" required minLength={20} maxLength={2000} rows={4} defaultValue={community.description} /></label>
      <div className="form-row">
        <label>Language<input name="language" maxLength={80} defaultValue={community.language ?? ""} /></label>
        <label>Region<input name="region" maxLength={120} defaultValue={community.region ?? ""} /></label>
      </div>
      <label>Member count<input name="memberCount" type="number" min={0} max={10000000} defaultValue={community.member_count ?? ""} /></label>
      <label>Community rules<textarea name="communityRules" maxLength={2000} rows={3} defaultValue={community.community_rules ?? ""} /></label>
      <div className="form-row">
        <label>Age restriction<input name="ageRestriction" maxLength={120} defaultValue={community.age_restriction ?? ""} /></label>
        <label>Eligibility<input name="eligibility" maxLength={500} defaultValue={community.eligibility ?? ""} /></label>
      </div>
      <label>Restrictions<textarea name="restrictions" maxLength={1000} rows={3} defaultValue={community.restrictions ?? ""} /></label>
      <div className="admin-image-editor">
        {previewUrl && <img src={previewUrl} alt={`${community.name} preview`} />}
        <label>Replace image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} /></label>
        <label className="admin-checkbox"><input name="removeImage" type="checkbox" disabled={Boolean(imagePath)} /> Remove current image</label>
        {uploadState && <p className={`form-message ${imagePath ? "success" : "error"}`}>{uploadState}</p>}
      </div>
      <label>Change note<textarea name="reviewNotes" maxLength={2000} rows={2} /></label>
      <button className="primary-button form-submit" disabled={isUploading} type="submit">{isUploading ? "Uploading..." : "Save changes"}</button>
    </form>
  );
}
