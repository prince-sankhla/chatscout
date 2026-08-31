/* eslint-disable @next/next/no-img-element -- Browser-only object URLs are used for local previews. */
"use client";

import { useRef, useState } from "react";
import { submitCommunity } from "@/features/submissions/actions";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const imageTypes = ["image/jpeg", "image/png", "image/webp"];
const LANGUAGES = [
  "English", "Hindi", "Hinglish", "Bengali", "Gujarati", "Marathi", "Tamil", "Telugu", "Kannada", "Malayalam", "Punjabi", "Urdu", "Odia", "Assamese", "Nepali", "Konkani", "Sanskrit", "Sindhi", "Kashmiri", "Maithili", "Bhojpuri", "Rajasthani", "Other / Multilingual",
];
const CATEGORIES = [
  "College & University", "JEE & NEET", "Competitive Exams", "Study Groups", "BCA / MCA", "Career & Jobs",
  "AI & ML", "Coding", "Web Development", "Cybersecurity", "Startups & Entrepreneurship", "Cloud & DevOps",
  "Gaming", "Anime & Manga", "Music", "Memes & Humor", "Movies & OTT", "Sports",
  "Fitness", "Health & Wellness", "Fashion & Beauty", "Travel", "Photography", "Books & Writing",
  "Finance & Investing", "Crypto & Web3", "Creators", "Freelance", "Networking", "Local Communities", "India-wide",
];
const AGE_OPTIONS = ["No restriction", "13+", "16+", "18+", "21+"];
const ELIGIBILITY_OPTIONS = [
  "Everyone can join",
  "College students",
  "BCA / MCA students",
  "Engineering students",
  "Working professionals",
  "Girls only",
  "Boys only",
  "Girls & boys",
  "Creators only",
  "Founders / entrepreneurs",
  "Beginners welcome",
  "Invite-only / approved members",
  "Other",
];
const DESCRIPTION_TEMPLATES = [
  "A friendly community to connect, chat, learn, and share ideas with like-minded people.",
  "An active group for students and enthusiasts to discuss topics, share resources, and meet new people.",
  "A community for people interested in this topic. Join discussions, share useful content, and connect with others.",
];
const RULE_TEMPLATES = [
  "Be respectful to everyone. No spam, harassment, hate speech, or unrelated promotions.",
  "Keep conversations relevant, respect other members, and avoid spam or unsolicited promotions.",
  "Follow the group topic, be respectful, and do not share abusive, illegal, or unwanted promotional content.",
];
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
  const [communityName, setCommunityName] = useState("");
  const [memberCount, setMemberCount] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [communityRules, setCommunityRules] = useState("");
  const [eligibility, setEligibility] = useState("");
  const [ageRestriction, setAgeRestriction] = useState("No restriction");

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
    setIsFetchingPreview(true); setPreviewMessage("Fetching community details..."); setMessage(null);
    try {
      const response = await fetch("/api/community-preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inviteUrl: value }) });
      const result = await response.json() as Preview & { error?: string };
      if (!response.ok) { setPreviewMessage(result.error ?? "Couldn't fetch community details."); return; }
      if (result.name) setCommunityName(result.name);
      if (typeof result.memberCount === "number") setMemberCount(String(result.memberCount));
      if (result.imagePath) {
        setImagePath(result.imagePath);
        if (result.imageUrl) setPreviewUrl(result.imageUrl);
        setMessage("Image fetched and saved automatically.");
      } else if (result.imageUrl) {
        setPreviewUrl(result.imageUrl);
        setPreviewMessage("Image found. Upload fallback is required to save it.");
      }
      if (result.name || typeof result.memberCount === "number" || result.imagePath) setPreviewMessage("Community details found. Review them before submitting.");
      else setPreviewMessage("Couldn't find community details automatically. Please enter them manually.");
    } catch { setPreviewMessage("Couldn't fetch community details. Please enter them manually."); }
    finally { setIsFetchingPreview(false); }
  }

  function schedulePreviewFetch(value: string) {
    if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
    if (!/^https:\/\/(?:www\.)?ig\.me\/j\//i.test(value.trim())) return;
    fetchTimerRef.current = setTimeout(() => { void fetchPreview(value); }, 500);
  }

  const formError = errorMessage(error);
  return <form action={submitCommunity} className="community-form listing-form">
    <fieldset>
      <legend>Instagram community</legend>
      <p>Paste the invite link first. ChatScout will automatically try to find the group name, member count, and image.</p>
      <label>Instagram invite URL <b>*</b><input name="inviteUrl" type="url" required placeholder="https://ig.me/j/..." autoFocus onChange={(event) => schedulePreviewFetch(event.target.value)} onBlur={(event) => void fetchPreview(event.target.value)} /></label>
      {(isFetchingPreview || previewMessage) && <p className="form-message" aria-live="polite">{isFetchingPreview ? "Fetching community details..." : previewMessage}</p>}
      {(previewUrl || communityName || memberCount) && <div className="community-auto-preview" aria-live="polite">
        {previewUrl && <img className="submission-image-preview" src={previewUrl} alt="Fetched community preview" />}
        <div className="community-auto-preview-copy">
          <span className="eyebrow">AUTO-DETECTED</span>
          <strong>{communityName || "Community name not found"}</strong>
          {memberCount && <span>{memberCount} members</span>}
          {previewUrl && <small>{imagePath ? "Image saved to ChatScout." : "Image preview found; upload manually to save it."}</small>}
        </div>
      </div>}
    </fieldset>

    <fieldset><legend>Community basics</legend><p>Most of the important details can be selected for you. Review the auto-detected name and member count, then add the details that describe your community.</p><label>Community name <b>*</b><input name="communityName" required maxLength={120} value={communityName} onChange={(event) => setCommunityName(event.target.value)} placeholder="Your group name" /></label><label>Category <b>*</b><select name="categoryName" required defaultValue=""><option value="" disabled>Select a category</option>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label><label>Description <b>*</b><textarea name="description" required maxLength={2000} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Tell people what they will find inside this community..." /><span className="field-hint">Need a starting point? Choose a suggested description.</span><select aria-label="Suggested description" defaultValue="" onChange={(event) => { if (event.target.value) { setDescription(event.target.value); event.currentTarget.value = ""; } }}><option value="">Choose a suggested description</option>{DESCRIPTION_TEMPLATES.map((template, index) => <option key={template} value={template}>Suggestion {index + 1}</option>)}</select></label></fieldset>

    <fieldset><legend>Community details</legend><p>Choose the closest match. You can use multilingual for communities that mix languages.</p><div className="form-row"><label>Language <b>*</b><select name="language" required defaultValue=""><option value="" disabled>Select a language</option>{LANGUAGES.map((language) => <option key={language}>{language}</option>)}</select></label><label>Region<input name="region" maxLength={120} placeholder="e.g. Jaipur, Rajasthan" /></label></div><label>Approx. member count<input name="memberCount" type="number" min="0" step="1" value={memberCount} onChange={(event) => setMemberCount(event.target.value)} placeholder="Auto-detected when available" /></label></fieldset>

    <fieldset><legend>Community guidelines</legend><p>Use clear options so members know what to expect before they join. These details remain subject to admin review.</p><label>Community rules<textarea name="communityRules" maxLength={2000} rows={3} value={communityRules} onChange={(event) => setCommunityRules(event.target.value)} placeholder="e.g. Be respectful, no spam, stay on topic." /><select aria-label="Suggested community rules" defaultValue="" onChange={(event) => { if (event.target.value) { setCommunityRules(event.target.value); event.currentTarget.value = ""; } }}><option value="">Choose a suggested rules template</option>{RULE_TEMPLATES.map((template, index) => <option key={template} value={template}>Template {index + 1}</option>)}</select></label><div className="form-row"><label>Age restriction <select name="ageRestriction" value={ageRestriction} onChange={(event) => setAgeRestriction(event.target.value)}>{AGE_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label><label>Who can join / eligibility <select name="eligibility" required value={eligibility} onChange={(event) => setEligibility(event.target.value)}><option value="" disabled>Select who can join</option>{ELIGIBILITY_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label></div><label>Topics, restrictions, or warnings<textarea name="restrictions" maxLength={1000} rows={3} placeholder="Optional: spoiler rules, no promotion, study-only, etc." /></label></fieldset>

    <fieldset className="image-fieldset"><legend>Community image <b>*</b></legend><p>Automatic fetch is attempted first. If Instagram doesn't expose a saveable image, upload one manually. JPG, PNG, or WebP, up to 4 MB.</p><input ref={inputRef} className="image-picker" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => uploadImage(event.target.files?.[0] ?? null)} />{previewUrl && <div className="image-preview-wrap"><img className="submission-image-preview" src={previewUrl} alt="Community image preview" /><div><b>{imagePath ? "Image ready" : "Preview found — upload manually"}</b><div className="image-actions"><button type="button" onClick={() => inputRef.current?.click()}>Upload / Replace</button><button type="button" onClick={clearImage}>Remove</button></div></div></div>}{(isUploading || message) && <p className={`form-message ${imagePath ? "success" : "error"}`} aria-live="polite">{isUploading ? "Uploading image..." : message}</p>}</fieldset>

    <input type="hidden" name="imagePath" value={imagePath} />{formError && <p className="form-message error" aria-live="polite">{formError}</p>}<button className="primary-button form-submit" type="submit" disabled={isUploading || !imagePath}>{isUploading ? "Working..." : "Submit for review"}</button>
  </form>;
}
