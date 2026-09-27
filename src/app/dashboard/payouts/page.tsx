"use client";

import { useState } from "react";
import Link from "next/link";

type Message = { kind: "success" | "error"; text: string } | null;

export default function PayoutsPage() {
  const [communityId, setCommunityId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<Message>(null);
  const [loading, setLoading] = useState(false);

  async function startOnboarding(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/payouts/onboard", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ communityId, name, phone: phone || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to start payout onboarding.");
      setMessage({
        kind: "success",
        text: data.nextStep ?? ("Razorpay linked account created: " + data.linkedAccountId),
      });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Unable to start payout onboarding.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-content">
      <section className="form-panel">
        <Link href="/dashboard/rewards" className="back-link">← Community Rewards</Link>
        <p className="eyebrow">COMMUNITY REWARDS PAYOUTS</p>
        <h1>Set up campaign payouts</h1>
        <p className="form-intro">Payout onboarding currently uses Razorpay Route in Test Mode. ChatScout does not collect or store bank-account details or build its own KYC flow.</p>
        <form className="form-stack" onSubmit={startOnboarding}>
          <label>Claimed community ID<input value={communityId} onChange={(e) => setCommunityId(e.target.value)} placeholder="Paste community UUID" required /></label>
          <label>Admin / account name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your legal or payout name" required /></label>
          <label>Phone (optional)<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91..." /></label>
          <button className="primary-button" type="submit" disabled={loading}>{loading ? "Starting…" : "Start Razorpay onboarding"}</button>
        </form>
        {message && <p className={"form-message " + message.kind} style={{ marginTop: 16 }} aria-live="polite">{message.text}</p>}
        <p className="form-intro" style={{ marginTop: 20 }}>Production payouts remain disabled until Razorpay compliance/KYC is confirmed and live credentials are explicitly enabled.</p>
      </section>
    </main>
  );
}
