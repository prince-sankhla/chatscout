type IconName = "search" | "home" | "grid" | "trend" | "bookmark" | "menu" | "bell" | "moon" | "arrow" | "users" | "spark" | "instagram" | "close" | "shield" | "rocket" | "bolt" | "heart" | "briefcase" | "graduation" | "gamepad" | "flame" | "music" | "map" | "code" | "share" | "flag" | "globe" | "check";

const paths: Record<IconName, React.ReactNode> = {
  search: <><circle cx="11" cy="11" r="6" /><path d="m20 20-4.2-4.2" /></>,
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" /><path d="M9 21v-6h6v6" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  trend: <><path d="M3 17 9 11l4 4 8-9" /><path d="M15 6h6v6" /></>,
  bookmark: <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  moon: <path d="M20 15.3A8 8 0 0 1 8.7 4 8 8 0 1 0 20 15.3Z" />,
  arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
  spark: <path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8Z" />,
  instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r=".8" fill="currentColor" /></>,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  shield: <path d="M12 3 20 7v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7Z" />,
  rocket: <><path d="M14 4c3.5-2 5.5-1 6-1 .2.5 1 2.5-1 6l-6 6-5-5Z" /><path d="m13 15-3 3M9 13l-3 1 1-3M13 19l-1 3-2-2" /><circle cx="16" cy="8" r="1" /></>,
  bolt: <path d="m13 2-9 12h7l-1 8 9-12h-7Z" />,
  heart: <path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.9-8.4a5.5 5.5 0 0 0-.1-7.8Z" />,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
  graduation: <><path d="m2 9 10-5 10 5-10 5Z" /><path d="M6 11v5c3 3 9 3 12 0v-5" /><path d="M22 9v6" /></>,
  gamepad: <><path d="M6 9h12a4 4 0 0 1 3.8 5l-1.1 4a2.5 2.5 0 0 1-4.3 1l-1.4-1.5h-6L7.6 19a2.5 2.5 0 0 1-4.3-1l-1.1-4A4 4 0 0 1 6 9Z" /><path d="M7 13v4M5 15h4M16 14h.1M19 16h.1" /></>,
  flame: <path d="M12 22c4 0 7-2.6 7-6.6 0-3-2-5.8-5-8.4.2 2.5-1 4-2.3 5.1C10.7 9.8 8.7 8.5 9 5 5.8 8.3 5 11.5 5 15.4 5 19.4 8 22 12 22Z" />,
  music: <><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></>,
  map: <><path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3Z" /><path d="M9 3v15M15 6v15" /></>,
  code: <><path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" /></>,
  share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" /></>,
  flag: <path d="M5 21V4m0 1c4-3 6 3 14 0v10c-8 3-10-3-14 0" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  check: <path d="m5 12 4 4L19 6" />,
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg aria-hidden="true" className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
