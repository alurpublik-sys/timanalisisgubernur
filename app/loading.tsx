export default function Loading() {
  return (
    <div className="route-loading-shell" role="status" aria-live="polite" aria-label="Memuat halaman">
      <div className="route-loading-line" />
      <div className="route-loading-grid">
        <div className="route-loading-card route-loading-card-wide" />
        <div className="route-loading-card" />
        <div className="route-loading-card" />
        <div className="route-loading-card" />
      </div>
      <span>Memuat data…</span>
    </div>
  )
}
