import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://chatscout-ten.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin/", "/dashboard/", "/auth/", "/join/", "/report/", "/api/"] }],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
