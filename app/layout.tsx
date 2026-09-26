import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { ANWAR_HAFID_PHOTO, APP_NAME } from '@/lib/branding'
import './globals.css'
import './admin.css'
import './dashboard.css'
import './responsive.css'
import './knowledge.css'
import './knowledge-v2.css'

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' })

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: 'Pusat analisis, monitoring isu, media, 9 BERANI, temuan OPD, referensi konten, dan koordinasi strategis.',
  icons: {
    icon: [{ url: ANWAR_HAFID_PHOTO, type: 'image/png' }],
    shortcut: [ANWAR_HAFID_PHOTO],
    apple: [ANWAR_HAFID_PHOTO],
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body className={jakarta.variable}>{children}</body></html>
}
