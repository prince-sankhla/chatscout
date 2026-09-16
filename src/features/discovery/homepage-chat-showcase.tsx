"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const CHAT_IMAGES = [
  "/images/homepage-chats/01-instagram-iit.png",
  "/images/homepage-chats/02-instagram-hostel.png",
  "/images/homepage-chats/03-instagram-creators.png",
  "/images/homepage-chats/04-instagram-dil-ke-dost.png",
  "/images/homepage-chats/05-whatsapp-hostel.png",
  "/images/homepage-chats/06-whatsapp-gym.png",
  "/images/homepage-chats/07-telegram-global.png",
  "/images/homepage-chats/08-discord-code.png",
];

export function HomepageChatShowcase() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % CHAT_IMAGES.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="homepage-chat-showcase" aria-label="Community chat previews">
      <div className="homepage-chat-glow" aria-hidden="true" />
      <div className="homepage-chat-frame">
        {CHAT_IMAGES.map((src, index) => (
          <Image
            key={src}
            src={src}
            alt="Community chat preview"
            fill
            priority={index === 0}
            sizes="(max-width: 900px) 48vw, 420px"
            className={`homepage-chat-image${index === active ? " is-active" : ""}`}
          />
        ))}
      </div>
      <div className="homepage-chat-dots" aria-hidden="true">
        {CHAT_IMAGES.map((src, index) => (
          <span key={src} className={index === active ? "is-active" : ""} />
        ))}
      </div>
    </div>
  );
}
