import Link from "next/link";
import { ControllerShell } from "@/components/admin/controller-shell";
import { requireAdminUser } from "@/lib/supabase/auth";
import { getAnalyticsDashboardData, type AnalyticsRange } from "@/features/analytics/data-access";
import styles from "./analytics.module.css";

type Props = { searchParams: Promise<{ range?: string }> };
const ranges: { value: AnalyticsRange; label: string }[] = [[1, "24h"], [7, "7d"], [30, "30d"], [90, "90d"]];

function safeRange(value?: string): AnalyticsRange { return value === "1" || value === "30" || value === "90" ? Number(value) as AnalyticsRange : 7; }
function number(value: number) { return new Intl.NumberFormat("en-IN").format(value); }

export default async function AnalyticsPage({ searchParams }: Props) {
  await requireAdminUser();
  const range = safeRange((await searchParams).range);
  const data = await getAnalyticsDashboardData(range);
  const maxTrend = Math.max(1, ...data.trend.map((item) => Math.max(item.views, item.joins)));
  const maxSource = Math.max(1, ...data.sources.map((item) => item.count));
  return <ControllerShell active="analytics" title="Growth analytics" description="Measure demand, discovery, and join conversion from the existing event stream.">
    <div className={styles.page}>
      <div className={styles.rangeBar} aria-label="Analytics time range">
        <span style={{ opacity: .55, fontSize: 12 }}>Range</span>
        {ranges.map(([value, label]) => <Link key={value} href={`/admin/analytics?range=${value}`} data-active={value === range}>{label}</Link>)}
      </div>
      <section className={styles.metrics}>
        {[['Community views', number(data.overview.views), 'detail visits'], ['Join clicks', number(data.overview.joins), 'CTA attempts'], ['Join conversion', `${data.overview.conversion}%`, 'joins / views'], ['Searches', number(data.overview.searches), 'queries'], ['Category views', number(data.overview.categoryViews), 'category discovery'], ['Unique sessions', number(data.overview.sessions), 'anonymous sessions']].map(([label,value,note]) => <article className={styles.metric} key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}
      </section>
      <div className={styles.grid}>
        <section className={styles.card}><header className={styles.cardHead}><h2>Views → joins trend</h2><p>{range === 1 ? 'Hourly activity' : `Daily activity for the last ${range} days`}</p></header>{data.trend.length ? <div className={styles.trend}>{data.trend.slice(-Math.min(14, data.trend.length)).map((item) => <div className={styles.trendCol} key={item.label}><div className={styles.trendBar} title={`Views ${item.views}`} style={{ height: `${Math.max(3, item.views / maxTrend * 100)}%` }} /><div className={styles.trendBarJoin} title={`Joins ${item.joins}`} style={{ height: `${Math.max(3, item.joins / maxTrend * 100)}%` }} /><span className={styles.trendLabel}>{item.label}</span></div>)}</div> : <p className={styles.empty}>No event data in this range yet.</p>}</section>
        <section className={styles.card}><header className={styles.cardHead}><h2>Traffic sources</h2><p>Derived from UTM source or referrer host.</p></header>{data.sources.length ? <table className={styles.table}><thead><tr><th>Source</th><th>Events</th></tr></thead><tbody>{data.sources.map((item) => <tr key={item.source}><td><div style={{ display:'grid', gap:5 }}><span>{item.source}</span><div className={styles.barTrack}><div className={styles.bar} style={{ width:`${item.count/maxSource*100}%` }} /></div></div></td><td>{number(item.count)}</td></tr>)}</tbody></table> : <p className={styles.empty}>Source data will appear as visitors arrive.</p>}</section>
        <section className={styles.card}><header className={styles.cardHead}><h2>Top communities</h2><p>Performance in the selected range.</p></header>{data.communities.length ? <table className={styles.table}><thead><tr><th>Community</th><th>Views</th><th>Joins</th><th>CVR</th></tr></thead><tbody>{data.communities.map((item) => <tr key={item.id}><td>{item.name}</td><td>{number(item.views)}</td><td>{number(item.joins)}</td><td>{item.conversion}%</td></tr>)}</tbody></table> : <p className={styles.empty}>No community activity yet.</p>}</section>
        <section className={styles.card}><header className={styles.cardHead}><h2>Top searches</h2><p>Actual search queries, normalized for casing.</p></header>{data.searches.length ? <table className={styles.table}><thead><tr><th>Query</th><th>Count</th></tr></thead><tbody>{data.searches.map((item) => <tr key={item.query}><td>{item.query}</td><td>{number(item.count)}</td></tr>)}</tbody></table> : <p className={styles.empty}>No searches recorded yet.</p>}</section>
        <section className={styles.card}><header className={styles.cardHead}><h2>Top categories</h2><p>Discovery demand and mapped community joins.</p></header>{data.categories.length ? <table className={styles.table}><thead><tr><th>Category</th><th>Views</th><th>Joins</th></tr></thead><tbody>{data.categories.map((item) => <tr key={item.id}><td>{item.name}</td><td>{number(item.views)}</td><td>{number(item.joins)}</td></tr>)}</tbody></table> : <p className={styles.empty}>No category activity recorded yet.</p>}</section>
        <section className={styles.card}><header className={styles.cardHead}><h2>Interpretation</h2><p>What this dashboard is designed to answer.</p></header><div className={styles.empty}><strong>Demand:</strong> search and category activity show what visitors want.<br/><br/><strong>Attention:</strong> community views show which listings attract discovery.<br/><br/><strong>Conversion:</strong> join clicks divided by views show which listings turn attention into action.<br/><br/><strong>Acquisition:</strong> source/referrer metadata helps compare traffic channels without collecting personal data.</div></section>
    </div>
  </ControllerShell>;
}
