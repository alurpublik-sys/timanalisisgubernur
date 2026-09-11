import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { SignOutButton } from '@/components/signout-button'

const baseMenu = [
  ['Dashboard', '/dashboard'],
  ['Kunjungan OPD', '/kunjungan'],
  ['Isu Strategis', '/isu-strategis'],
  ['Policy Brief', '/policy-brief'],
  ['Media Monitor', '/media-monitor'],
  ['Agenda & Tugas', '/agenda'],
  ['Tim Analisis', '/tim-analisis'],
  ['Kinerja & Honor', '/kinerja'],
]

function Brand() {
  return <div className="brand">
    <div className="brand-mark">AH</div>
    <div><strong>Strategic</strong><span>Center</span></div>
  </div>
}

export async function AppShell({
  active,
  title,
  children,
}: {
  active: string
  title: string
  email?: string | null
  children: React.ReactNode
}) {
  const { user, profile } = await requireUser()
  const menu = profile.role === 'admin' ? [...baseMenu, ['Pengaturan', '/pengaturan']] : baseMenu
  const identity = profile.full_name || user.email || 'User AH Center'

  return (
    <div className="app-shell">
      <aside className="sidebar desktop-sidebar">
        <Brand />
        <nav>
          {menu.map(([label, href]) => (
            <Link key={href} href={href} className={active === href ? 'active' : ''}>{label}</Link>
          ))}
        </nav>
        <div className="sidebar-account">
          <span>{identity}</span>
          <small>{profile.role}</small>
          <SignOutButton />
        </div>
      </aside>

      <div className="mobile-shell-header">
        <Brand />
        <details className="mobile-menu">
          <summary aria-label="Buka navigasi">Menu</summary>
          <div className="mobile-menu-panel">
            <div className="mobile-account"><b>{identity}</b><span>{profile.role}</span></div>
            <nav>
              {menu.map(([label, href]) => (
                <Link key={href} href={href} className={active === href ? 'active' : ''}>{label}</Link>
              ))}
            </nav>
            <SignOutButton />
          </div>
        </details>
      </div>

      <main className="main-content">
        <header className="topbar">
          <div><p className="eyebrow">ANWAR HAFID STRATEGIC CENTER</p><h1>{title}</h1></div>
          <div className="user-chip">{identity} · {profile.role}</div>
        </header>
        {children}
      </main>
    </div>
  )
}
