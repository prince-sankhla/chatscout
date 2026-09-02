import type { Metadata } from "next";
import { GoogleAnalytics } from "@/components/analytics/google";
import "./globals.css";
import "./product-polish.css";
import "./ui-stabilization.css";
import "./launch-readiness.css";
import "./frontend-redesign.css";
import "./rewards-landing.css";
import "./frontend-refinement.css";
import "./hero-final.css";
import "./hero-polish-final.css";
import "./responsive-hardening.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://chatscout-ten.vercel.app";
const rawGoogleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
const googleSiteVerification = rawGoogleSiteVerification?.match(/content=[\"']([^\"']+)[\"']/i)?.[1] ?? rawGoogleSiteVerification;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "ChatScout | Find your next group chat",
  description: "Discover active communities across Instagram, WhatsApp, Telegram and Discord by interest, language, region and community type.",
  ...(googleSiteVerification ? { verification: { google: googleSiteVerification } } : {}),
  openGraph: {
    title: "ChatScout | Find your next group chat",
    description: "Discover active communities across Instagram, WhatsApp, Telegram and Discord by interest, language, region and community type.",
    url: "/",
    siteName: "ChatScout",
    type: "website",
    images: [{ url: "/brand/chatscout-logo.png", width: 1254, height: 1254, alt: "ChatScout" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChatScout | Find your next group chat",
    description: "Discover active communities across Instagram, WhatsApp, Telegram and Discord by interest, language, region and community type.",
    images: ["/brand/chatscout-logo.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
