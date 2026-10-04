import type { MetadataRoute } from 'next'
import { APP_NAME, APP_SHORT_NAME } from '@/lib/branding'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: 'Dashboard data, analisis, monitoring, 9 BERANI, temuan OPD, dan referensi komunikasi strategis.',
    id: '/dashboard',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#f4f7fa',
    theme_color: '#0b2d52',
    icons: [
      { src: '/icon.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
      { src: '/icon.png', sizes: '96x96', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
