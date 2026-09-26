'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { APP_SHORT_NAME } from '@/lib/branding'

const menu = [
  { label: 'Dashboard', href: '/dashboard', glyph: 'DB' },
  { label: 'Kunjungan OPD', href: '/kunjungan', glyph: 'OP' },
  { label: 'Media Monitor', href: '/media-monitor', glyph: 'MM' },
  { label: '9 BERANI', href: '/berani', glyph: '9B' },
  { label: 'Temuan OPD', href: '/temuan-opd', glyph: 'TO' },
  { label: 'Referensi Konten', href: '/referensi-konten', glyph: 'RK' },
  { label: 'Tim Analisis', href: '/tim-analisis', glyph: 'TA' },
  { label: 'Pengaturan', href: '/pengaturan', glyph: 'PG' },
] as const

function Brand() {
  return (
    <div className="brand strategic-brand">
      <div className="brand-portrait-wrap brand-icon-wrap">
        <Image src="/icon.svg" alt="" width={62} height={62} sizes="62px" className="brand-portrait brand-app-icon" priority />
      </div>
      <div className="brand-copy">
        <strong>{APP_SHORT_NAME}</strong>
        <span>Komunikasi Strategis · Independen</span>
      </div>
    </div>
  )
}

function Navigation({ active, onNavigate }: { active: string; onNavigate: (href: string) => void }) {
  return (
    <nav aria-label="Navigasi utama">
      {menu.map(({ label, href, glyph }) => {
        const isActive = active === href
        return (
          <Link
            key={href}
            href={href}
            prefetch
            aria-current={isActive ? 'page' : undefined}
            className={isActive ? 'active' : ''}
            onClick={() => onNavigate(href)}
          >
            <span className="nav-main">
              <span className="nav-glyph" aria-hidden>{glyph}</span>
              <span className="nav-label">{label}</span>
            </span>
            {href === '/pengaturan' ? <small className="nav-lock">PIN</small> : null}
          </Link>
        )
      })}
    </nav>
  )
}

export function AppShell({ active, title, children }: { active: string; title: string; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [navigating, setNavigating] = useState(false)

  useEffect(() => {
    setNavigating(false)
    setMobileOpen(false)
  }, [active])

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
        <Navigation active={active} onNavigate={beginNavigation} />
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
                <p className="eyebrow">TIM ANALISIS</p>
                <strong>Komunikasi Strategis</strong>
              </div>
              <button className="mobile-drawer-close" type="button" aria-label="Tutup navigasi" onClick={() => setMobileOpen(false)}>×</button>
            </div>
            <div className="mobile-drawer-nav">
              <Navigation active={active} onNavigate={beginNavigation} />
            </div>
            <div className="mobile-menu-note">Workspace independen. Pengaturan dilindungi PIN administrator.</div>
          </aside>
        </div>
      ) : null}

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">TIM ANALISIS DAN KOMUNIKASI STRATEGIS (INDEPENDEN)</p>
            <h1>{title}</h1>
          </div>
          <div className="topbar-badge"><span className="online-dot" /> Sistem Aktif</div>
        </header>
        <div className="route-stage" key={active} aria-busy={navigating}>{children}</div>
      </main>
    </div>
  )
}
