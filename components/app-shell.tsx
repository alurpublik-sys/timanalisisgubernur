import Image from 'next/image'
import Link from 'next/link'
import { ANWAR_HAFID_PHOTO } from '@/lib/branding'

const menu = [
  ['Dashboard', '/dashboard'],
  ['Kunjungan OPD', '/kunjungan'],
  ['Isu Strategis', '/isu-strategis'],
  ['Policy Brief', '/policy-brief'],
  ['Media Monitor', '/media-monitor'],
  ['Agenda & Tugas', '/agenda'],
  ['Tim Analisis', '/tim-analisis'],
  ['Pengaturan', '/pengaturan'],
] as const

function Brand() {
  return (
    <div className="brand">
      <div className="brand-portrait-wrap">
        <Image src={ANWAR_HAFID_PHOTO} alt="Anwar Hafid" width={62} height={62} className="brand-portrait" priority unoptimized />
      </div>
      <div className="brand-copy">
        <strong>Anwar Hafid</strong>
        <span>Strategic Center</span>
      </div>
    </div>
  )
}

function Navigation({ active }: { active: string }) {
  return (
    <nav>
      {menu.map(([label, href]) => (
        <Link key={href} href={href} className={active === href ? 'active' : ''}>
          <span>{label}</span>
          {href === '/pengaturan' ? <small className="nav-lock">PIN</small> : null}
        </Link>
      ))}
    </nav>
  )
}

export function AppShell({ active, title, children }: { active: string; title: string; children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar desktop-sidebar">
        <Brand />
        <div className="sidebar-kicker">Command Center</div>
        <Navigation active={active} />
        <div className="sidebar-foot">
          <span>AH Center</span>
          <small>Analisis · Monitoring · Kebijakan</small>
        </div>
      </aside>

      <div className="mobile-shell-header">
        <Brand />
        <details className="mobile-menu">
          <summary aria-label="Buka navigasi">Menu</summary>
          <div className="mobile-menu-panel">
            <Navigation active={active} />
            <div className="mobile-menu-note">Pengaturan dilindungi PIN administrator.</div>
          </div>
        </details>
      </div>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">ANWAR HAFID STRATEGIC CENTER</p>
            <h1>{title}</h1>
          </div>
          <div className="topbar-badge"><span className="online-dot" /> Sistem Aktif</div>
        </header>
        {children}
      </main>
    </div>
  )
}
