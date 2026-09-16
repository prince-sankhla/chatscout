"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const IMAGES = [
  "/images/homepage-chats/ChatGPT Image Sep 16, 2026, 08_04_58 PM.png",
  "/images/homepage-chats/ChatGPT Image Sep 16, 2026, 08_05_07 PM.png",
  "/images/homepage-chats/ChatGPT Image Sep 16, 2026, 08_05_14 PM.png",
  "/images/homepage-chats/ChatGPT Image Sep 16, 2026, 08_05_21 PM.png",
  "/images/homepage-chats/ChatGPT Image Sep 16, 2026, 08_05_42 PM.png",
  "/images/homepage-chats/ChatGPT Image Sep 16, 2026, 08_05_51 PM.png",
  "/images/homepage-chats/ChatGPT Image Sep 16, 2026, 08_06_00 PM.png",
  "/images/homepage-chats/ChatGPT Image Sep 16, 2026, 08_08_10 PM.png",
] as const;

export function HomepageChatCarousel() {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % IMAGES.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="homepage-chat-showcase" aria-label="Community chat preview" aria-live="off">
      <div className={`homepage-chat-frame${loaded ? " is-loaded" : ""}`}>
        {IMAGES.map((src, imageIndex) => (
          <Image
            key={src}
            src={src}
            alt={`ChatScout community chat preview ${imageIndex + 1}`}
            fill
            priority={imageIndex === 0}
            sizes="(max-width: 900px) 42vw, 420px"
            className={`homepage-chat-image${index === imageIndex ? " is-active" : ""}`}
            onLoad={() => imageIndex === 0 && setLoaded(true)}
          />
        ))}
        <div className="homepage-chat-glow" aria-hidden="true" />
      </div>
      <div className="homepage-chat-dots" aria-hidden="true">
        {IMAGES.map((src, dotIndex) => (
          <span key={src} className={dotIndex === index ? "is-active" : ""} />
        ))}
      </div>
    </div>
  );
}
