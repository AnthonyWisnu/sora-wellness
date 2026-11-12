# Dokumen penelitian SORA Wellness Studio

Mulai dari tiga dokumen berikut. Tidak perlu membaca semua skrip dan bukti mentah.

| Keperluan | Dokumen |
| --- | --- |
| Mengetahui fungsi yang sudah diuji | [Hasil akhir](pelaksanaan/penelitian/hasil-akhir.md) |
| Mengambil tabel pengujian dan lima screenshot jurnal | [Bahan jurnal](pelaksanaan/penelitian/bahan-jurnal.md) |
| Memastikan benefit member dan kalender 30 hari | [Verifikasi benefit member](pelaksanaan/penelitian/cek-benefit-member.md) |

Loker pribadi ditetapkan admin kepada member aktif, sesuai aturan produk. Kalender member mencakup 30 tanggal termasuk hari ini, sedangkan pelanggan reguler 7 tanggal. Uji browser desktop dan ponsel membuktikan tanggal terakhir dan dialog booking dapat dibuka.

## Isi folder

- `pelaksanaan/penelitian/`: hasil, skrip pengujian, serta screenshot yang masih digunakan.
- `pelaksanaan/00/`, `pelaksanaan/03/`, dan helper `.cjs`: dependensi fixture dan bukti pengujian akses. Tidak diperlukan untuk menjalankan aplikasi biasa.
- `pelaksanaan/smoke/`: hasil smoke test pendukung.
- `arsip/`: satu ZIP lokal berisi laporan audit, rencana lama, prototipe visual, dan artefak percobaan. Harness audit lama yang tidak digunakan juga disimpan di sini. Folder ini diabaikan Git dan tidak ikut deployment.

## Perapian 12 November 2026

Sebanyak 844 file historis disatukan dalam `arsip/audit-sebelum-perapian-2026-11-12.zip`. Semua isi arsip diverifikasi dengan CRC dan SHA-256 sebelum file asal dihapus. Manifest beserta path asli tersedia di dalam ZIP untuk pemulihan bila diperlukan.

Sebanyak 11.163 file dependensi alat audit yang tidak dipakai aplikasi dihapus, sekitar 156 MiB. Kode aplikasi, migrasi, konfigurasi lokal, dan data database tidak dihapus. Tujuh screenshot dipertahankan: lima untuk jurnal dan dua untuk verifikasi benefit member.

[Catatan perapian terstruktur](pelaksanaan/penelitian/perapian-files.json). Kandidat workflow dan perangkat deployment disimpan lokal dalam `arsip/`, belum diaktifkan. Source penelitian dipublikasikan melalui branch `penelitian/rapikan-audit-benefit-member`, tanpa deployment.
