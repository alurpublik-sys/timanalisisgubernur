'use client'

import { useEffect } from 'react'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[route-error]', error)
  }, [error])

  return (
    <div className="route-error-shell">
      <div className="route-error-mark" aria-hidden>!</div>
      <div>
        <p className="eyebrow">KONEKSI / DATA</p>
        <h2>Halaman belum berhasil dimuat.</h2>
        <p>Data Anda tidak berubah. Coba muat kembali halaman ini tanpa perlu keluar dari aplikasi.</p>
        <button className="primary-button" type="button" onClick={reset}>Coba Lagi</button>
      </div>
    </div>
  )
}
