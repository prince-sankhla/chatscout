import type { Metadata } from "next";
import "./globals.css";
import "./product-polish.css";
import "./ui-stabilization.css";
import "./launch-readiness.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://chatscout-ten.vercel.app"),
  title: "ChatScout | Find your next group chat",
  description: "Discover active Instagram group chats in India by interest, language, region and community type.",
  openGraph: {
    title: "ChatScout | Find your next group chat",
    description: "Discover active Instagram group chats in India by interest, language, region and community type.",
    url: "/",
    siteName: "ChatScout",
    type: "website",
    images: [{ url: "/brand/chatscout-logo.png", width: 1254, height: 1254, alt: "ChatScout" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChatScout | Find your next group chat",
    description: "Discover active Instagram group chats in India by interest, language, region and community type.",
    images: ["/brand/chatscout-logo.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
