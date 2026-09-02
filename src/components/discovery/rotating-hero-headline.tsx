"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  <>Find Your Next<br />Group Chat.</>,
  <>List Your Group.<br />Get Rewarded.</>,
  <>Discover Communities.<br />Unlock Rewards.</>,
  <>Find Communities.<br />Unlock Opportunities.</>,
];

export function RotatingHeroHeadline() {
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener?.("change", sync);
    return () => media.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setInterval(() => {
      setIndex((value) => (value + 1) % MESSAGES.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [reducedMotion]);

  return (
    <span className={`hero-headline-rotator ${reducedMotion ? "is-reduced" : ""}`} aria-live="polite" aria-atomic="true">
      <span key={index} className="hero-headline-line">{MESSAGES[index]}</span>
    </span>
  );
}
