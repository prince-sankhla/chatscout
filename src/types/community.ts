export type Community = {
  slug: string;
  name: string;
  category: string;
  location: string;
  membersLabel: string;
  description: string;
  accent: "violet" | "blue" | "pink" | "orange" | "teal";
  initials: string;
  tags: string[];
  isDemo: boolean;
  imageUrl?: string | null;
  listingAgeLabel: string;
  healthLabel: string;
  verificationStatus: "unverified" | "verified" | "needs_review" | "broken";
};
