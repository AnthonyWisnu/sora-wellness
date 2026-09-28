# Panduan Agen dan Kontributor - Platform Sora Wellness

Dokumen ini menetapkan standar arsitektur, batasan teknis, etika modifikasi kode, dan alur kerja pengembangan pada repositori Sora Wellness Studio.

- [PRD.md](PRD.md) adalah sumber kebenaran resmi untuk kebutuhan produk, aturan bisnis, kriteria penerimaan, dan matriks status implementasi.
- [README.md](README.md) adalah panduan instalasi lokal, ikhtisar fitur, dan konfigurasi lingkungan pengembang.

---

## 1. Konteks Produk dan Arsitektur Sistem

- **Arsitektur API-First:** Backend NestJS memegang kendali mutlak atas seluruh aturan bisnis, validasi, otorisasi, dan mutasi data. Frontend React tidak boleh menduplikasi logika bisnis penting, mengasumsikan kalkulasi finansial di sisi klien, atau menggunakan data simulasi/mock yang memintas API.
- **Kemandirian Klien:** Kontrak API di bawah `/api/v1` harus sepenuhnya independen dari teknologi antarmuka. Klien lain seperti curl, Postman, aplikasi mobile, atau backend PHP/Laravel harus tunduk pada validasi dan aturan integritas data yang sama.
- **Cakupan Saat Ini:** Melayani satu boutique wellness studio (Yoga dan Pilates) dengan satu lokasi operasional. Ekstensi multi-tenant atau multi-perusahaan merupakan arah arsitektur masa depan yang belum diaktifkan pada skema database saat ini.
- **Zona Waktu dan Presisi Keuangan:** Zona waktu bisnis studio contoh adalah `Asia/Makassar` (WITA). Seluruh nilai moneter disimpan sebagai integer IDR (Rupiah bulat) tanpa pecahan desimal.

---

## 2. Alur Deployment Otomatis dan CI/CD VPS

Platform telah terintegrasi dengan pipeline CI/CD otomatis berbasis **GitHub Actions** yang terhubung langsung ke VPS Linux operasional:

- **Host Lingkungan:** VPS Linux Ubuntu Server (`43.157.248.201`)
- **Domain Publik:** `https://wellness.anthonywj.my.id`
- **Workflow:** [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
- **Runner:** Self-hosted runner `vps-wellness`
- **Prosedur Rilis:**
  1. Setiap `git push origin main` akan secara otomatis memicu job deployment di runner VPS.
  2. Runner melakukan sinkronisasi kode, kompilasi frontend dan backend, eksekusi migrasi database PostgreSQL, reload proses NestJS via PM2, dan pembaruan berkas statis Nginx/Caddy.
  3. Agen pengembang dapat memantau status eksekusi workflow secara langsung menggunakan GitHub CLI:
     ```powershell
     gh run list --limit 1
     gh run watch <run-id>
     ```

---

## 3. Standar Antarmuka dan Pola UX (Design System)

Semua dashboard (Admin, Coach, Customer) berbagi shell navigasi bersama dengan standar pengalaman pengguna sebagai berikut:

1. **Alur Presensi Pelatih 2-Tier (Coach Attendance):**
   - *Tier 1 (Direktori Sesi):* Ditampilkan dalam kartu-kartu sesi interaktif dengan tab filter (Semua, Hari Ini, Mendatang, Selesai), bilah pencarian, dan kuota kehadiran (misal: '3/10 Hadir').
   - *Tier 2 (Detail Sesi & Roster Peserta):* Tampilan penuh berfokus dengan breadcrumb 'Kembali ke Jadwal Kelas', indikator alert kondisi fisik, tombol massal 'Tandai Semua Hadir', dan toggle kehadiran individu.
2. **Pemisahan Meja Depan (Front Desk Check-in) vs Presensi Matras:**
   - Admin meja depan menggunakan antarmuka 'Verifikasi tiket' untuk memvalidasi QR e-ticket kedatangan peserta di lobi studio.
   - Sistem secara otomatis menampilkan nomor loker fisik aktif pelanggan (contoh: 'Loker Pribadi: Loker A-01') saat tiket berhasil diverifikasi.
   - Pelatih di ruang kelas fokus pada presensi kehadiran fisik di atas matras dan dapat melihat status kedatangan lobi peserta.
3. **Matriks Loker Visual (Locker Matrix Japandi):**
   - Loker fisik dikelola melalui grid visual dengan status warna (Tersedia, Terpakai, Perawatan) dan penugasan member berbasis modal dialog.
4. **Pola Manajemen Data Admin:**
   - Gunakan layout daftar/tabel lebar dengan pencarian, filter, dan paginasi.
   - Formulir tambah dan edit data wajib dibuka melalui modal dialog atau drawer (`AdminDialog` pattern) untuk mencegah kekosongan ruang halaman.
5. **Responsivitas dan Aksesibilitas:**
   - Navigasi sidebar harus tetap dapat digulir jika item melebihi tinggi layar, dengan warna scrollbar menyatu dengan tema.
   - Menu mobile drawer harus dapat dibuka dan ditutup dengan mudah serta ramah navigasi keyboard.

---

## 4. Standar Tipografi dan Konsistensi Merek

Patuhi aturan ketat berikut di seluruh berkas kode, antarmuka pengguna, dan dokumentasi markdown:

- **Bebas Emoji (Zero Emoji Policy):** Dilarang keras menggunakan ikon emoji apa pun (baik unicode emoji maupun shortcode emoji) di dalam teks UI, komponen, judul, dokumen, maupun commit message. Gunakan ikon SVG formal seperti Lucide React (`lucide-react`).
- **Bebas Em-Dash dan En-Dash:** Karakter em-dash (`\u2014`) dan en-dash (`\u2013`) dilarang keras. Gunakan selalu tanda hubung baku (`-`) atau titik tengah (`·`) untuk pemisah teks.
- **Konsistensi Merek SORA:** Nama merek studio resmi adalah **SORA Wellness Studio**. Jangan pernah menggunakan nama lama 'ZEIRA' dalam judul dokumen, teks antarmuka, metadata HTML, maupun pesan sistem.

---

## 5. Protokol Pembayaran Midtrans Snap dan Keandalan Transaksi

1. **Batas Waktu Transaksi 15 Menit:**
   - Parameter `expiry` dengan durasi 15 menit (`{ duration: 15, unit: 'minutes' }`) wajib dikirim pada setiap pembuatan transaksi Snap Midtrans untuk menyelaraskan waktu penahanan kursi backend dengan batas pembayaran gateway.
2. **Dukungan Buka Kembali Modal Pembayaran (Resume Checkout):**
   - Jika pelanggan tidak sengaja menutup modal Snap atau tab browser, tombol 'Lanjutkan Pembayaran' pada riwayat booking harus dapat memanggil kembali token Snap yang masih aktif tanpa membuat transaksi baru yang mubazir.
3. **Keandalan dan Idempotensi:**
   - Penanganan webhook dan sinkronisasi manual status transaksi harus idempoten. Notifikasi yang datang berulang atau tidak berurutan tidak boleh melipatgandakan saldo atau mengubah status booking lebih dari satu kali.
   - Porsi saldo dompet yang ditahan dilepaskan otomatis ketika batas waktu penahanan kursi berakhir.
4. **Simulator Pengujian:**
   - Pengujian pembayaran dilakukan eksklusif pada environment **Midtrans Sandbox**. Dilarang mencoba transaksi dengan kartu kredit riil.

---

## 6. Tata Kelola Keamanan dan Kerahasiaan Data

1. **Penyimpanan Kredensial:**
   - Berkas konfigurasi `.env`, folder `.qa/`, serta kredensial database dan payment gateway tidak boleh di-commit ke Git.
   - Server Key Midtrans disimpan terenkripsi di PostgreSQL menggunakan algoritma AES-256 (`MIDTRANS_SETTINGS_KEY`) dan disamarkan saat dibaca oleh admin.
2. **Autentikasi dan Proteksi Sesi:**
   - Sesi disimpan pada tabel database PostgreSQL, ditransmisikan hanya melalui cookie `HttpOnly` bernama `wellness.sid` dengan konfigurasi `SameSite=Lax` dan atribut `Secure` pada koneksi HTTPS.
   - Setiap mutasi data HTTP (`POST`, `PUT`, `PATCH`, `DELETE`) dilindungi oleh mekanisme CSRF token yang divalidasi oleh backend.
3. **Privasi Data Kesehatan Peserta:**
   - Formulir catatan kesehatan bersifat sukarela dengan persetujuan (*consent*) eksplisit pelanggan.
   - Akses data kesehatan hanya diberikan kepada pelatih yang mengajar sesi kelas terkait dalam bentuk snapshot terbatas saat sesi berlangsung. Admin dan publik sama sekali tidak memiliki akses baca terhadap isi kondisi kesehatan.

---

## 7. Matriks Perintah dan Verifikasi Cepat

Jalankan perintah dari folder modul terkait sebelum mengajukan commit:

| Operasi | Modul Backend (`backend/`) | Modul Frontend (`frontend/`) |
| :--- | :--- | :--- |
| **Kompilasi (Build)** | `npm run build` | `npm run build` |
| **Linter Kode** | `npm run lint` | `npm run lint` |
| **Unit Testing** | `npm test` | - |
| **Migrasi Database** | `npm run migrate` | - |
| **Penyegaran Jadwal Demo** | `npm run demo:refresh-schedule` | - |
| **Rotasi Sandi Akun Demo** | `npm run demo:rotate-passwords` | - |
| **Smoke Test Khusus** | `npm run smoke:payments`, `smoke:health` | `npm run smoke:dashboard`, `smoke:admin` |

---

## 8. Panduan Pelaporan dan Audit Perubahan

- Laporkan secara transparan berkas yang dimodifikasi, pengujian yang telah dijalankan, serta hasil build sebelum menyelesaikan tugas.
- Jangan menyatakan suatu fitur telah selesai atau siap produksi apabila belum divalidasi dengan pengujian otomatis atau pengujian fungsional yang relevan.
- Pertahankan struktur dokumen markdown tetap bersih, profesional, dan menggunakan format tautan standar GitHub Markdown (`file:///`).
