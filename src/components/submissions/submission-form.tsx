/* eslint-disable @next/next/no-img-element -- Browser-only object URLs are used for local previews. */
"use client";

import { useRef, useState } from "react";
import { submitCommunity } from "@/features/submissions/actions";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const imageTypes = ["image/jpeg", "image/png", "image/webp"];
type Preview = { name?: string | null; memberCount?: number | null; imageUrl?: string | null; imagePath?: string | null };

function errorMessage(error?: string) {
  if (error === "required") return "Complete the required listing details.";
  if (error === "url") return "Enter a valid HTTPS Instagram group invite URL.";
  if (error === "members") return "Enter a whole member count of zero or more.";
  if (error === "image") return "Upload a valid JPG, PNG, or WebP image before submitting.";
  if (error === "database") return "We couldn't save your submission right now. Please try again shortly.";
  return null;
}

export function SubmissionForm({ error }: { error?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [imagePath, setImagePath] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);

  function clearImage() {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null); setImagePath(""); setMessage(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function uploadImage(file: File | null) {
    clearImage();
    if (!file) return;
    if (!imageTypes.includes(file.type) || file.size > MAX_IMAGE_BYTES) { setMessage("Choose a JPG, PNG, or WebP image up to 4 MB."); return; }
    setPreviewUrl(URL.createObjectURL(file)); setIsUploading(true);
    const data = new FormData(); data.set("image", file);
    try {
      const response = await fetch("/api/submission-image", { method: "POST", body: data });
      const result = await response.json() as { path?: string; error?: string };
      if (!response.ok || !result.path) { setMessage(result.error ?? "Image upload could not be completed. Try again."); return; }
      setImagePath(result.path); setMessage("Image uploaded and ready to submit.");
    } catch { setMessage("Image upload could not be completed. Try again."); }
    finally { setIsUploading(false); }
  }

  async function fetchPreview(inviteUrl: string) {
    const value = inviteUrl.trim();
    if (!/^https:\/\/(?:www\.)?ig\.me\/j\//i.test(value) || isFetchingPreview) return;
    setIsFetchingPreview(true); setPreviewMessage("Fetching community details...");
    try {
      const response = await fetch("/api/community-preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inviteUrl: value }) });
      const result = await response.json() as Preview & { error?: string };
      if (!response.ok) { setPreviewMessage(result.error ?? "Couldn't fetch community details."); return; }
      const form = document.querySelector(".listing-form") as HTMLFormElement | null;
      const nameInput = form?.elements.namedItem("communityName") as HTMLInputElement | null;
      const memberInput = form?.elements.namedItem("memberCount") as HTMLInputElement | null;
      if (result.name && nameInput) nameInput.value = result.name;
      if (typeof result.memberCount === "number" && memberInput) memberInput.value = String(result.memberCount);
      if (result.imagePath) {
        setImagePath(result.imagePath);
        if (result.imageUrl) setPreviewUrl(result.imageUrl);
        setMessage("Image fetched and saved automatically.");
      } else if (result.imageUrl) {
        setPreviewUrl(result.imageUrl);
        setPreviewMessage("Image found. ChatScout could not save it automatically, so please upload it below.");
      }
      if (result.name || typeof result.memberCount === "number" || result.imagePath) setPreviewMessage("Community details found. Review them before submitting.");
      else setPreviewMessage("Couldn't find community details automatically. Please enter them manually.");
    } catch { setPreviewMessage("Couldn't fetch community details. Please enter them manually."); }
    finally { setIsFetchingPreview(false); }
  }

  function schedulePreviewFetch(value: string) {
    if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
    if (!/^https:\/\/(?:www\.)?ig\.me\/j\//i.test(value.trim())) return;
    fetchTimerRef.current = setTimeout(() => { void fetchPreview(value); }, 650);
  }

  const formError = errorMessage(error);
  return <form action={submitCommunity} className="community-form listing-form">
    <fieldset><legend>Community basics</legend><p>Paste the Instagram invite link and ChatScout will try to fetch the name, member count, and image automatically.</p><label>Community name <b>*</b><input name="communityName" required maxLength={120} /></label><label>Instagram invite URL <b>*</b><input name="inviteUrl" type="url" required placeholder="https://ig.me/j/..." onChange={(event) => schedulePreviewFetch(event.target.value)} onBlur={(event) => fetchPreview(event.target.value)} />{(isFetchingPreview || previewMessage) && <p className="form-message" aria-live="polite">{isFetchingPreview ? "Fetching community details..." : previewMessage}</p>}</label><label>Category <b>*</b><select name="categoryName" required defaultValue=""><option value="" disabled>Select a category</option><option>Coding</option><option>Students</option><option>Anime</option><option>Gaming</option><option>Entrepreneurship</option><option>Fitness</option><option>Art &amp; Design</option></select></label><label>Description <b>*</b><textarea name="description" required maxLength={2000} rows={5} /></label></fieldset>
    <fieldset><legend>Community details</legend><div className="form-row"><label>Language<input name="language" maxLength={80} placeholder="e.g. English" /></label><label>Region<input name="region" maxLength={120} placeholder="e.g. Jaipur" /></label></div><label>Approx. member count<input name="memberCount" type="number" min="0" step="1" /></label></fieldset>
    <fieldset><legend>Community guidelines</legend><p>Optional member details for admin review. These are not independently verified by ChatScout.</p><label>Community rules<textarea name="communityRules" maxLength={2000} rows={3} /></label><div className="form-row"><label>Age restriction<input name="ageRestriction" maxLength={120} placeholder="e.g. 18+" /></label><label>Who can join / eligibility<input name="eligibility" maxLength={500} placeholder="e.g. BCA students" /></label></div><label>Topics, restrictions, or warnings<textarea name="restrictions" maxLength={1000} rows={3} /></label></fieldset>
    <fieldset className="image-fieldset"><legend>Community image <b>*</b></legend><p>Automatic fetch is attempted first; manual upload is the fallback. JPG, PNG, or WebP, up to 4 MB.</p><input ref={inputRef} className="image-picker" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => uploadImage(event.target.files?.[0] ?? null)} />{previewUrl && <div className="image-preview-wrap"><img className="submission-image-preview" src={previewUrl} alt="Community image preview" /><div><b>{imagePath ? "Image ready" : "Preview found — upload manually"}</b><div className="image-actions"><button type="button" onClick={() => inputRef.current?.click()}>Upload / Replace</button><button type="button" onClick={clearImage}>Remove</button></div></div></div>}{(isUploading || message) && <p className={`form-message ${imagePath ? "success" : "error"}`} aria-live="polite">{isUploading ? "Uploading image..." : message}</p>}</fieldset>
    <input type="hidden" name="imagePath" value={imagePath} />{formError && <p className="form-message error" aria-live="polite">{formError}</p>}<button className="primary-button form-submit" type="submit" disabled={isUploading || !imagePath}>{isUploading ? "Working..." : "Submit for review"}</button>
  </form>;
}
