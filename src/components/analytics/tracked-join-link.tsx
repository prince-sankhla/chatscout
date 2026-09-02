"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackGAEvent } from "@/components/analytics/google";

type Props = {
  href: string;
  communityId: string;
  platform: string;
  className?: string;
  children: ReactNode;
};

export function TrackedJoinLink({ href, communityId, platform, className, children }: Props) {
  function handleClick() {
    trackGAEvent("join_community", {
      community_id: communityId,
      platform,
    });
  }

  return <Link href={href} className={className} onClick={handleClick}>{children}</Link>;
}
