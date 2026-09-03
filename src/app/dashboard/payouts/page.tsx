"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function PayoutsPage() {
  const [communityId, setCommunityId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function startOnboarding(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setMessage('');
    try {
      const response = await fetch('/api/payouts/onboard', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ communityId, name, phone: phone || undefined }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Unable to start payout onboarding.');
      setMessage(data.nextStep ?? `Razorpay linked account created: ${data.linkedAccountId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to start payout onboarding.');
    } finally { setLoading(false); }
  }

  return <main className="page-content"><section className="form-panel"><Link href="/dashboard/rewards" className="back-link">← Community Rewards</Link><p className="eyebrow">VYNLO PAYOUTS</p><h1>Set up community campaign payouts</h1><p className="form-intro">Payout onboarding uses Razorpay Route in Test Mode. Vynlo does not collect or store bank account details or build its own KYC flow.</p><div className="form-stack"><label>Claimed community ID<input value={communityId} onChange={e=>setCommunityId(e.target.value)} placeholder="Paste community UUID" required /></label><label>Admin / account name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your legal or payout name" required /></label><label>Phone (optional)<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91..." /></label><button className="primary-button" type="button" disabled={loading} onClick={()=>void startOnboarding({preventDefault(){}} as React.FormEvent<HTMLFormElement>)}>{loading?'Starting…':'Start Razorpay onboarding'}</button></div>{message&&<p className="form-message success" style={{marginTop:16}}>{message}</p>}<p className="form-intro" style={{marginTop:20}}>Production payouts remain disabled until Razorpay compliance/KYC is confirmed and you explicitly approve switching Vynlo to live keys.</p></section></main>;
}
