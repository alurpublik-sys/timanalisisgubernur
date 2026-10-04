export default function WorkspaceLoading() {
  return (
    <div className="workspace-loading" aria-label="Memuat halaman">
      <section className="loading-hero">
        <span />
        <span />
        <span />
      </section>
      <section className="loading-grid">
        {Array.from({ length: 6 }).map((_, index) => <span key={index} />)}
      </section>
    </div>
  )
}
