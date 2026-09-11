import Link from 'next/link'

const menu = [
  ['Dashboard', '/dashboard'],
  ['Kunjungan OPD', '/kunjungan'],
  ['Isu Strategis', '/isu-strategis'],
  ['Policy Brief', '/policy-brief'],
  ['Media Monitor', '/media-monitor'],
  ['Agenda & Tugas', '/agenda'],
  ['Tim Analisis', '/tim-analisis'],
  ['Kinerja & Honor', '/kinerja'],
  ['Pengaturan', '/pengaturan'],
]

export function AppShell({
  active,
  title,
  email,
  children,
}: {
  active: string
  title: string
  email?: string | null
  children: React.ReactNode
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">AH</div>
          <div><strong>Strategic</strong><span>Center</span></div>
        </div>
        <nav>
          {menu.map(([label, href]) => (
            <Link key={href} href={href} className={active === href ? 'active' : ''}>{label}</Link>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div><p className="eyebrow">ANWAR HAFID STRATEGIC CENTER</p><h1>{title}</h1></div>
          {email ? <div className="user-chip">{email}</div> : null}
        </header>
        {children}
      </main>
    </div>
  )
}
