'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const menu = [
  { label: 'Dashboard', href: '/dashboard', glyph: 'DB' },
  { label: 'Kunjungan OPD', href: '/kunjungan', glyph: 'OP' },
  { label: 'Renstra OPD', href: '/renstra-opd', glyph: 'RS' },
  { label: 'Media Monitor', href: '/media-monitor', glyph: 'MM' },
  { label: '9 BERANI', href: '/berani', glyph: '9B' },
  { label: 'Temuan OPD', href: '/temuan-opd', glyph: 'TO' },
  { label: 'Referensi Konten', href: '/referensi-konten', glyph: 'RK' },
  { label: 'Tim Analisis', href: '/tim-analisis', glyph: 'TA' },
  { label: 'Pengaturan', href: '/pengaturan', glyph: 'PG' },
] as const
function activeRoute(pathname: string) {
  const match=[...menu].sort((a,b)=>b.href.length-a.href.length).find((item)=>pathname===item.href||pathname.startsWith(`${item.href}/`))
  return match?.href||'/dashboard'
}
function titleForPath(pathname: string) {
  if(pathname === '/dashboard') return 'Dashboard Strategis'
  if(pathname.startsWith('/kunjungan/')) return 'Detail Kunjungan'
  if(pathname.startsWith('/renstra-opd/')) return 'Renstra OPD'
  if(pathname.startsWith('/berani/')) return '9 BERANI'
  return menu.find((item)=>item.href===activeRoute(pathname))?.label||'Dashboard Strategis'
}

function Brand() {
  return (
    <div className="brand strategic-brand">
      <div className="brand-portrait-wrap brand-icon-wrap">
        <Image src="/tim-analisis-logo.png" alt="" width={62} height={62} sizes="62px" className="brand-portrait brand-app-icon" priority />
      </div>
      <div className="brand-copy">
        <strong className="brand-title">
          <span>Tim Analisis dan</span>
          <span>Komunikasi Strategis</span>
        </strong>
        <span className="brand-subtitle">(Independen)</span>
      </div>
    </div>
  )
}

function Navigation({ active, onNavigate, onIntent }: { active: string; onNavigate: (href: string) => void; onIntent: (href: string) => void }) {
  return (
    <nav aria-label="Navigasi utama">
      {menu.map(({ label, href, glyph }) => {
        const isActive = active === href
        return (
          <Link
            key={href}
            href={href}
            prefetch={false}
            aria-current={isActive ? 'page' : undefined}
            className={isActive ? 'active' : ''}
            onMouseEnter={() => onIntent(href)}
            onFocus={() => onIntent(href)}
            onTouchStart={() => onIntent(href)}
            onClick={() => onNavigate(href)}
          >
            <span className="nav-main">
              <span className="nav-glyph" aria-hidden>{glyph}</span>
              <span className="nav-label">{label}</span>
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

export function AppShell({ children, adminMode = false }: { children: React.ReactNode; adminMode?: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const active = activeRoute(pathname)
  const title = titleForPath(pathname)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [navigating, setNavigating] = useState(false)

  useEffect(() => {
    setNavigating(false)
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!navigating) return
    const timeout = window.setTimeout(() => setNavigating(false), 4500)
    return () => window.clearTimeout(timeout)
  }, [navigating])

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    if (connection?.saveData || connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g') return

    const currentIndex = menu.findIndex((item) => item.href === active)
    const targets = new Set<string>(['/dashboard'])
    if (currentIndex > 0) targets.add(menu[currentIndex - 1].href)
    if (currentIndex >= 0 && currentIndex < menu.length - 1) targets.add(menu[currentIndex + 1].href)
    targets.delete(active)

    const timer = window.setTimeout(() => {
      for (const href of targets) router.prefetch(href)
    }, 650)

    return () => window.clearTimeout(timer)
  }, [active, router])

  useEffect(() => {
    if (!mobileOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [mobileOpen])

  const prefetchRoute = (href: string) => {
    if (href !== active) router.prefetch(href)
  }

  const beginNavigation = (href: string) => {
    setMobileOpen(false)
    if (href !== active) setNavigating(true)
  }

  return (
    <div className={`app-shell${navigating ? ' is-navigating' : ''}`}>
      <div className="route-progress" aria-hidden><span /></div>

      <aside className="sidebar desktop-sidebar">
        <Brand />
        <div className="sidebar-kicker">Strategic Workspace</div>
        <Navigation active={active} onNavigate={beginNavigation} onIntent={prefetchRoute} />
        <div className="sidebar-foot">
          <span>Independen</span>
          <small>Data · Analisis · Informasi</small>
        </div>
      </aside>

      <div className="mobile-shell-header">
        <Brand />
        <button
          className="mobile-menu-trigger"
          type="button"
          aria-label="Buka navigasi"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
        >
          <span /><span /><span />
        </button>
      </div>

      {mobileOpen ? (
        <div className="mobile-drawer-layer" role="presentation">
          <button className="mobile-drawer-backdrop" type="button" aria-label="Tutup navigasi" onClick={() => setMobileOpen(false)} />
          <aside className="mobile-drawer" aria-label="Navigasi mobile">
            <div className="mobile-drawer-head">
              <div>
                <p className="eyebrow">TIM ANALISIS DAN</p>
                <strong>Komunikasi Strategis <span>(Independen)</span></strong>
              </div>
              <button className="mobile-drawer-close" type="button" aria-label="Tutup navigasi" onClick={() => setMobileOpen(false)}>×</button>
            </div>
            <div className="mobile-drawer-nav">
              <Navigation active={active} onNavigate={beginNavigation} onIntent={prefetchRoute} />
            </div>
            <div className="mobile-menu-note">Workspace independen. Mode edit dan Temuan OPD dilindungi PIN administrator.</div>
          </aside>
        </div>
      ) : null}

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">TIM ANALISIS DAN KOMUNIKASI STRATEGIS (INDEPENDEN)</p>
            <h1>{title}</h1>
          </div>
          <div className="topbar-actions">
            <Link
              className={`admin-mode-chip${adminMode ? ' is-active' : ''}`}
              href={adminMode ? '/pengaturan' : `/login?next=${encodeURIComponent(pathname || active)}`}
              title={adminMode ? 'Mode edit aktif' : 'Masuk untuk mengedit'}
              aria-label={adminMode ? 'Mode edit aktif' : 'Masuk untuk mengedit'}
            >
              <span aria-hidden>{adminMode ? '✎' : '⌁'}</span>
              <small>{adminMode ? 'Edit aktif' : 'Edit'}</small>
            </Link>
            <div className="topbar-badge"><span className="online-dot" /> Sistem Aktif</div>
          </div>
        </header>
        <div className="route-stage" aria-busy={navigating}>{children}</div>
      </main>
    </div>
  )
}
