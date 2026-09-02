import Link from 'next/link';
import { ReactNode } from 'react';
import styles from './brand.module.css';

export default function BrandLayout({children}:{children:ReactNode}){return <div className={styles.shell}><aside className={styles.sidebar}><Link href="/brand" className={styles.brand}><span>CS</span><div><b>ChatScout</b><small>BRAND WORKSPACE</small></div></Link><nav className={styles.nav}><small>WORKSPACE</small><Link href="/brand">Overview</Link><Link href="/brand/campaigns">Campaigns</Link><Link href="/brand/campaigns/new">Create campaign</Link><Link href="/brand/communities">Discover communities</Link><Link href="/brand/applications">Applications</Link><Link href="/brand/selected">Selected Communities</Link><Link href="/brand/settings">Settings</Link><small>CHATSCOUT</small><Link href="/">Public discovery</Link><Link href="/dashboard/rewards">Community admin rewards</Link></nav></aside><div className={styles.main}>{children}</div></div>}
