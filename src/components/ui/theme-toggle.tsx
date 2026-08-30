"use client";

import { useState } from "react";
import { Icon } from "./icon";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  return <button className="icon-button" type="button" aria-label="Toggle color theme" onClick={() => { const next = !dark; document.documentElement.dataset.theme = next ? "dark" : "light"; setDark(next); }}><Icon name="moon" size={18} /></button>;
}
