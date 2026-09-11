import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Anwar Hafid Strategic Center',
  description: 'AH Center — Strategic Center full-stack dashboard',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
