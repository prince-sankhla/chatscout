/* eslint-disable @next/next/no-img-element -- Browser-only object URLs are used for the local upload preview. */
"use client";

import { useState } from "react";
import { submitCommunity } from "@/features/submissions/actions";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function submissionErrorMessage(error?: string) {
  if (error === "required") return "Complete the community name, invite URL, description, and category.";
  if (error === "url") return "Enter a valid HTTPS Instagram group invite URL.";
  if (error === "members") return "Enter a whole member count of zero or more.";
  if (error === "image") return "The uploaded image could not be verified. Please upload it again or submit without an image.";
  if (error === "database") return "We couldn’t save your submission right now. Please try again shortly.";
  return null;
}

export function SubmissionForm({ error }: { error?: string }) {
  const [imagePath, setImagePath] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageMessage, setImageMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const errorMessage = submissionErrorMessage(error);

  async function uploadImage(file: File | null) {
    setImagePath("");
    setImageMessage(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      setImageMessage("Choose a JPG, PNG, or WebP image up to 5 MB.");
      return;
    }

    setIsUploading(true);
    const data = new FormData();
    data.set("image", file);
    try {
      const response = await fetch("/api/submission-image", { method: "POST", body: data });
      const result = await response.json() as { path?: string; error?: string };
      if (!response.ok || !result.path) {
        setImageMessage(result.error ?? "Image upload is temporarily unavailable.");
        return;
      }
      setImagePath(result.path);
      setImageMessage("Image ready to submit.");
    } catch {
      setImageMessage("Image upload is temporarily unavailable.");
    } finally {
      setIsUploading(false);
    }
  }

  return <form action={submitCommunity} className="community-form">
    <label>Community name<input name="communityName" required maxLength={120} /></label>
    <label>Instagram invite URL<input name="inviteUrl" type="url" required placeholder="https://ig.me/j/..." /></label>
    <label>Description<textarea name="description" required maxLength={2000} rows={5} /></label>
    <label>Category<select name="categoryName" required defaultValue=""><option value="" disabled>Select a category</option><option>Coding</option><option>Students</option><option>Anime</option><option>Gaming</option><option>Entrepreneurship</option><option>Fitness</option><option>Art &amp; Design</option></select></label>
    <div className="form-row"><label>Language<input name="language" maxLength={80} placeholder="e.g. English" /></label><label>Region<input name="region" maxLength={120} placeholder="e.g. Jaipur" /></label></div>
    <div className="form-row"><label>Approx. member count<input name="memberCount" type="number" min="0" step="1" /></label><label>Contact (optional)<input name="contact" maxLength={200} /></label></div>
    <label>Community image <span className="field-optional">(optional)</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => uploadImage(event.target.files?.[0] ?? null)} /></label>
    {previewUrl && <img className="submission-image-preview" src={previewUrl} alt="Selected community image preview" />}
    {(isUploading || imageMessage) && <p className={`form-message ${isUploading ? "" : imagePath ? "success" : "error"}`} aria-live="polite">{isUploading ? "Uploading image…" : imageMessage}</p>}
    <input type="hidden" name="imagePath" value={imagePath} />
    {errorMessage && <p className="form-message error" aria-live="polite">{errorMessage}</p>}
    <button className="primary-button form-submit" type="submit" disabled={isUploading}>{isUploading ? "Uploading image…" : "Submit for review"}</button>
  </form>;
}
