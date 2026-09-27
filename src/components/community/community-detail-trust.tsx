import styles from "./community-detail-trust.module.css";

type Props = {
  memberCount: number | null;
  language: string | null;
  region: string | null;
  ageRestriction: string | null;
  eligibility: string | null;
  rules: string | null;
  restrictions: string | null;
  verificationStatus: string;
  healthLabel: string;
  healthStatus: "unknown" | "healthy" | "needs_recheck" | "inactive";
  lastVerifiedAt: string | null;
};

function label(value: string | null, fallback: string) {
  return value?.trim() || fallback;
}

export function CommunityDetailTrust({
  memberCount,
  language,
  region,
  ageRestriction,
  eligibility,
  rules,
  restrictions,
  verificationStatus,
  healthLabel,
  healthStatus,
  lastVerifiedAt,
}: Props) {
  const verified = verificationStatus === "verified";
  const verifiedDate = lastVerifiedAt
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(lastVerifiedAt))
    : null;

  return (
    <section className={styles.wrap} aria-label="Community information">
      <div className={styles.factGrid}>
        <article className={styles.fact}>
          <span>Community size</span>
          <strong>{memberCount === null ? "Not available" : memberCount.toLocaleString("en-IN")}</strong>
          <small>members</small>
        </article>
        <article className={styles.fact}>
          <span>Language</span>
          <strong>{label(language, "Not specified")}</strong>
          <small>primary language</small>
        </article>
        <article className={styles.fact}>
          <span>Region</span>
          <strong>{label(region, "India-wide")}</strong>
          <small>community reach</small>
        </article>
        <article className={styles.fact}>
          <span>Access</span>
          <strong>{label(ageRestriction, "No restriction")}</strong>
          <small>age / access policy</small>
        </article>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <span className={styles.kicker}>TRUST SIGNAL</span>
              <h2>Join with confidence</h2>
            </div>
            <span className={verified ? styles.statusGood : styles.statusNeutral}>
              {verified ? "Verified" : verificationStatus.replace("_", " ")}
            </span>
          </div>
          <p className={styles.lead}>{healthLabel}</p>
          <div className={styles.checks}>
            {healthStatus === "healthy" && <span><i>✓</i> Invite link checked recently</span>}
            {healthStatus === "needs_recheck" && <span><i>!</i> Invite link needs a recheck</span>}
            {healthStatus === "inactive" && <span><i>!</i> Invite link is currently unavailable</span>}
            {verified && <span><i>✓</i> Community verification completed</span>}
            <span><i>✓</i> Published on ChatScout</span>
            {verifiedDate && <span><i>✓</i> Last verified {verifiedDate}</span>}
          </div>
        </article>

        <article className={styles.card}>
          <span className={styles.kicker}>BEFORE YOU JOIN</span>
          <h2>Know what to expect</h2>
          <dl className={styles.details}>
            <div><dt>Who can join</dt><dd>{label(eligibility, "Not specified by the community")}</dd></div>
            <div><dt>Community rules</dt><dd>{label(rules, "No rules provided")}</dd></div>
            <div><dt>Topics & restrictions</dt><dd>{label(restrictions, "None specified")}</dd></div>
          </dl>
        </article>
      </div>
    </section>
  );
}
