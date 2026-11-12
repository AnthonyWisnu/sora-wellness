# Hasil akhir prototipe penelitian SORA Wellness Studio

Tanggal: 12 November 2026. Status: lima langkah fungsional penelitian selesai dan terverifikasi lokal. Rencana audit produksi 29 unit tetap menjadi backlog terpisah.

[Ringkasan bukti otomatis](verification-summary.json) dan [daftar berkas kandidat yang berubah](perubahan-file.md).

## Alur yang sudah diuji

| Alur | Hasil aktual | Bukti |
|---|---|---|
| Registrasi dan sesi | Registrasi, login, logout, akses setelah logout ditolak, login ulang pada lebar 375px | [hasil](register-results.json) |
| Booking serentak | 50 pelanggan melalui HTTP memperebutkan satu kursi. Satu respons 201, 49 respons 409, satu booking terkonfirmasi, tidak ada overbooking | [hasil](concurrency-results.json) |
| Member | Paket Sandbox menjadi aktif sekali, jadwal member menjangkau 30 hari, sesi 14 hari terlihat, booking kuota mengurangi satu jatah dan tiket QR tersedia | [paket](sandbox-package-results.json), [booking](member-booking-results.json) |
| Pelanggan tanpa paket | Jendela 7 hari, kelas lanjutan di luar hak ditolak, checkout kelas Sandbox, tiket, pembatalan dan refund Rp75.000 ke wallet sekali | [hasil](paid-booking-results.json) |
| Superadmin dan staf | Sembilan izin tampil, pencabutan menghilangkan menu, API tanpa izin ditolak. Matriks HTTP berisi 110 pemeriksaan tanpa kegagalan | [UI izin](staff-permissions-results.json), [API](../03/http-results.json), [aksi akun](account-actions-results.json) |
| Operasional admin | Membuat jenis kelas dan sesi, mengubah kapasitas, membatalkan sesi, menetapkan loker kepada member aktif | [hasil](admin-studio-results.json) |
| Lobi dan coach | Verifikasi tiket menampilkan loker tanpa catatan kesehatan dan tidak mengubah presensi matras. Coach sesi aktif melihat snapshot berizin dan mencatat hadir. Coach lain ditolak | [hasil](attendance-results.json) |
| Event luar studio | Dua kegiatan bertanggal berbeda, pendaftaran gratis dan pemulihan tiket, login kembali ke event berbayar, pembayaran Sandbox, tiket, check-in, jadwal berpeserta terkunci | [hasil](event-results.json) |
| Wallet dan laporan | Pengajuan, penolakan dan penyelesaian payout sintetis; saldo tidak dipotong/dikembalikan dua kali; laporan dan CSV event benar; saldo layar diperbarui tanpa reload | [API](supporting-results.json), [wallet UI](wallet-ui-results.json), [finance UI](finance-ui-results.json) |

Pembayaran paket, kelas, dan event menggunakan transaksi Midtrans Sandbox yang benar-benar mencapai status settlement melalui simulator BCA resmi. Webhook sah direplay dua kali melalui HTTP lokal dan signature palsu ditolak 403. Ini membuktikan pemrosesan callback lokal, belum membuktikan pengiriman callback otomatis dari internet ke VPS. Prosedur simulator mengikuti [dokumentasi Midtrans](https://docs.midtrans.com/docs/testing-payment-on-sandbox).

## Perbaikan fungsional pada tahap ini

- Dialog pembayaran tidak lagi langsung tertutup saat checkout berpindah ke dashboard. [Uji browser paket](package-resume-results.json) membuktikan dialog tetap terbuka dan resume memakai order serta URL Snap yang sama. Pemulihan intent sebelum token tersimpan juga diuji terpisah dengan simulasi timeout provider pada tahap sebelumnya, bukan diklaim sebagai simulasi gangguan jaringan Sandbox langsung.
- Jenis transaksi kelas, paket dan event diteruskan dengan benar ke pemeriksa status. Laporan event memiliki filter, judul dan ekspor yang sesuai.
- Event menyimpan tanggal setiap kegiatan. Jadwal coach dan brosur menampilkan tanggal kegiatan masing-masing, [bukti UI](event-dates-ui-results.json). Isian instruktur tamu kosong tidak lagi menggagalkan kegiatan yang memakai coach studio. Status pembatalan tersedia pada editor, sedangkan roster membedakan pending, aktif, gagal, kedaluwarsa dan kredit wallet.
- Menu dan tindakan mengikuti izin aktual. Izin kosong tidak mendapat menu operasional bawaan; staf payout dan laporan mendapat tab yang sesuai; admin tidak ditawari reset superadmin atau pemberian izin di luar wewenangnya.
- Pilihan izin memakai checkbox asli. Dialog konfirmasi yang diuji browser sama dengan yang dipakai pengguna.
- Saldo dashboard diperbarui dari API setelah pengajuan penarikan. Naskah penarikan menjelaskan simulasi manual tanpa menjanjikan SLA bisnis yang belum ditetapkan.

## Pemeriksaan akhir

| Pemeriksaan | Hasil |
|---|---|
| Backend build dan unit test | 36 lulus, 0 gagal, [log](backend-tests.log) |
| Backend lint | Lulus, [hasil](backend-lint.json) |
| Frontend build | Lulus, [log](frontend-build.log). Peringatan ukuran bundle tetap dicatat sebagai optimasi lanjutan |
| Frontend lint | Lulus, [hasil](frontend-lint.json) |
| Tes feedback pembayaran frontend | 6 lulus, 0 gagal, [log](frontend-feedback.log) |
| Smoke test pendukung yang sudah ada | Payments, cancellations, packages, health, content-lockers, admin-finance dan site lulus pada database fixture, [hasil](../smoke/) |

[Lingkungan uji](environment.json): Windows, Node v22.23.4, PostgreSQL 16.15 dalam Docker, Edge headless melalui Playwright, OpenAPI 3.0.0. Data sintetis disimpan pada database fixture yang terpisah. Tidak ada uang riil atau transfer bank riil.

## Bahan jurnal dan penggunaan lokal

- [Enam kelompok pengujian dan lima screenshot terpilih](bahan-jurnal.md).
- Aplikasi diperiksa pada `http://127.0.0.1:5173`, API fixture pada port 3000. Jika layanan berhenti, jalankan Docker dan `docker start backend-db-1`, tunggu `docker exec backend-db-1 pg_isready`, lalu jalankan dua terminal dari root proyek:

```powershell
node audit/pelaksanaan/00/run-backend.cjs
```

```powershell
npm --prefix frontend run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

- Akun sintetis lokal disimpan di `backend/.qa/penelitian-akun-lokal.md`, diabaikan Git. Jangan memakai akun atau data uji ini sebagai akun produksi.
- Skrip dalam folder ini menyimpan bukti pengujian. Untuk pengulangan penuh, buat fixture baru melalui setup.cjs lalu jalankan urutan uji sesuai alur di tabel; beberapa uji sengaja mengubah status booking, izin, pembayaran dan presensi. Semua mutasi diarahkan ke fixture lokal, bukan database utama.

PDF jurnal asli tidak diubah. Publikasi source ditujukan ke branch `penelitian/rapikan-audit-benefit-member`. Deployment tidak dilakukan sesuai instruksi pemilik. Status selesai di sini berlaku untuk cakupan prototipe penelitian yang disepakati, bukan sertifikasi atau hasil audit produksi menyeluruh.
