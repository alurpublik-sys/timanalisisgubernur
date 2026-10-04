# Access model

Tim Analisis dan Komunikasi Strategis memakai model **public presentation + PIN-protected administration**.

## Public presentation surfaces
- Dashboard
- Kunjungan OPD dan sumber yang memang ditampilkan untuk paparan
- Renstra OPD
- Media Monitor
- 9 BERANI
- Referensi Konten
- Direktori Tim Analisis

## PIN-protected surfaces
- Mode edit dan seluruh mutasi data
- Pengaturan
- Temuan OPD
- Catatan internal yang mengikuti kebijakan RLS/admin session

Dokumen yang dimasukkan ke area paparan dianggap sebagai bahan yang memang boleh ditampilkan melalui aplikasi. Dokumen internal/rahasia tidak boleh ditempatkan di public assets; gunakan storage dengan kebijakan akses yang sesuai sebelum menautkannya ke halaman paparan.

Repo dapat tetap terbuka hanya selama source code tidak memuat rahasia, token service-role, PIN, atau dokumen internal. Semua secret runtime wajib berada di environment/platform secret storage.
