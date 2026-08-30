import Image from "next/image";
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link className={`brand ${compact ? "brand-compact" : ""}`} href="/" aria-label="ChatScout home"><Image className="brand-logo" src="/brand/chatscout-logo.png" alt="ChatScout" width={1254} height={1254} priority /></Link>;
}
