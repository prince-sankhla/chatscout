"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="page-content detail-page">
      <section className="form-panel" role="alert">
        <p className="eyebrow">CHATSCOUT</p>
        <h1>Something went wrong.</h1>
        <p>We couldn't load this page right now. Your saved communities stay safe in this browser.</p>
        <div className="submission-success-actions">
          <button type="button" className="primary-button list-button" onClick={() => reset()}>
            Try again
          </button>
          <Link href="/" className="admin-secondary">Back to discovery</Link>
        </div>
      </section>
    </main>
  );
}
