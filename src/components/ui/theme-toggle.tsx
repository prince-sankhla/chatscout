"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icon";

const THEME_KEY = "chatscout-theme";

function getStoredTheme(): "dark" | "light" | null {
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    return stored === "dark" || stored === "light" ? stored : null;
  } catch {
    return null;
  }
}

function applyTheme(theme: "dark" | "light") {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore storage failures; the theme still applies for this session.
  }
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = getStoredTheme();
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const theme = stored ?? preferred;
    applyTheme(theme);
    setDark(theme === "dark");
    setReady(true);
  }, []);

  function toggle() {
    const next = dark ? "light" : "dark";
    applyTheme(next);
    setDark(next === "dark");
  }

  return (
    <button
      className="icon-button"
      type="button"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={dark}
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={toggle}
      disabled={!ready}
    >
      <Icon name={dark ? "sun" : "moon"} size={18} />
    </button>
  );
}
