import Link from 'next/link';

export function AnalyticsView({ campaign, links, backHref }: { campaign: any; links: any[]; backHref: string }) {
  return <main className="page-content">
    <header className="owner-header">
      <div><Link href={backHref} className="back-link">← Back</Link><p className="eyebrow">ATTRIBUTION</p><h1>{campaign.title}</h1><p>Measured reach and click activity from accepted community campaign links. No conversion number is shown unless conversion tracking is actually configured.</p></div>
    </header>
    <section className="section"><div className="grid">
      {links.map((row:any) => {
        const conversionCount = Number(row.conversion_count ?? 0);
        const clickCount = Number(row.click_count ?? 0);
        const allocatedBudget = Number(row.allocated_budget ?? 0);
        const cpc = clickCount > 0 && allocatedBudget > 0 ? allocatedBudget / clickCount : null;
        return <article className="card" key={row.id}><div className="cardBody">
          <div className="cardTop"><span className="badge">{row.community?.name ?? 'Community'}</span><span className="badge">/{row.short_code}</span></div>
          <div className="grid" style={{marginTop:16}}>
            <div><p className="eyebrow">REACH</p><h3>{row.community?.member_count == null ? 'Unavailable' : Number(row.community.member_count).toLocaleString('en-IN')}</h3></div>
            <div><p className="eyebrow">CLICKS</p><h3>{clickCount.toLocaleString('en-IN')}</h3></div>
            <div><p className="eyebrow">UNIQUE CLICKS</p><h3>{Number(row.unique_click_count ?? 0).toLocaleString('en-IN')}</h3></div>
            <div><p className="eyebrow">CONVERSIONS</p><h3>{conversionCount > 0 ? conversionCount.toLocaleString('en-IN') : 'Conversion tracking not set up'}</h3></div>
            <div><p className="eyebrow">CPC</p><h3>{cpc == null ? 'Not enough data.' : `₹${cpc.toFixed(2)}`}</h3></div>
            <div><p className="eyebrow">ALLOCATED BUDGET</p><h3>{allocatedBudget > 0 ? `₹${allocatedBudget.toLocaleString('en-IN')}` : 'Not allocated'}</h3></div>
          </div>
          <p className="meta" style={{marginTop:14}}>Share link: <strong>{`/c/${row.short_code}`}</strong></p>
        </div></article>;
      })}
    </div></section>
    {!links.length && <div className="empty"><h3>No accepted campaign links yet.</h3><p>Links are created automatically when a matched community accepts an invitation.</p></div>}
  </main>;
}
