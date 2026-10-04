import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { APP_NAME } from '@/lib/branding'
import './globals.css'
import './admin.css'
import './dashboard.css'
import './responsive.css'
import './knowledge.css'
import './knowledge-v2.css'
import './berani-modern.css'
import './premium-ui.css'
import './renstra.css'

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL('https://timanalisis.biz.id'),
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: 'Dashboard independen untuk data, analisis, monitoring, 9 BERANI, temuan OPD, dan referensi komunikasi strategis Sulawesi Tengah.',
  applicationName: APP_NAME,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/icon.png', type: 'image/png' }],
    shortcut: ['/icon.png'],
    apple: [{ url: '/icon.png', type: 'image/png' }],
  },
  openGraph: {
    title: APP_NAME,
    siteName: APP_NAME,
    description: 'Data · Analisis · Informasi untuk monitoring strategis Sulawesi Tengah.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: APP_NAME,
    description: 'Data · Analisis · Informasi untuk monitoring strategis Sulawesi Tengah.',
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body className={jakarta.variable}>{children}</body></html>
}
