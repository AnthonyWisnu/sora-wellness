# PRD - Platform Sora Wellness Berbasis API

**Status:** Spesifikasi produk dan catatan implementasi versi pertama  
**Bahasa produk:** Indonesia  
**Perusahaan pada implementasi pertama:** Satu studio yoga dan pilates (Sora Wellness Studio), satu lokasi operasional  
**Sumber keputusan:** Percakapan dan arahan pemilik proyek hingga 28 September 2026

---

## 1. Cara Membaca Dokumen

Setiap aturan di dokumen ini memiliki salah satu status berikut:

| Status | Arti untuk Implementasi |
| :--- | :--- |
| **Diputuskan** | Aturan yang sudah disepakati pemilik proyek; implementasi dan pengujian wajib mematuhinya. |
| **Asumsi prototipe** | Boleh digunakan untuk tampilan dan data demonstrasi agar sistem dapat dinilai; bukan aturan bisnis backend final. |
| **Terbuka** | Belum diputuskan. Wajib diklarifikasi kepada pemilik proyek sebelum mengimplementasikan logika terkait. |

Bagian kebutuhan dan aturan bisnis mendeskripsikan perilaku produk yang disepakati. Status aktual fitur dicatat terpisah pada §3.2 agar kebutuhan teoretis tidak disalahartikan sebagai bukti pengujian operasional.

---

## 2. Ringkasan Produk dan Ruang Lingkup

### 2.1 Tujuan

**Diputuskan.** Membangun aplikasi wellness versi pertama untuk **satu perusahaan** yang mencakup situs publik interaktif, dashboard tersegregasi sesuai peran, katalog kelas, paket keanggotaan (membership), reservasi (booking engine), payment gateway terintegrasi, buku besar saldo dompet (wallet ledger), rekam riwayat kesehatan berizin, presensi pelatih 2-tier, verifikasi tiket meja depan (front desk), matriks loker fisik, dan headless CMS.

**Diputuskan.** Backend NestJS menjadi pemilik tunggal aturan bisnis (*business logic authority*) dan menyediakan API yang dapat dikonsumsi oleh React maupun klien lain (PHP/Laravel, mobile app, curl). Implementasi saat ini menggunakan **Midtrans Snap Sandbox** untuk simulasi transaksi finansial tanpa uang riil. Deployment otomatis telah diimplementasikan pada server VPS Linux operasional menggunakan CI/CD pipeline.

### 2.2 Batas Implementasi Versi Pertama

- Implementasi versi pertama melayani satu perusahaan, satu lokasi fisik, satu zona waktu bisnis (`Asia/Makassar`), satu jenis manfaat keanggotaan dasar, dan pilihan durasi serta harga paket.
- Belum mencakup isolasi multi-tenant atau registrasi banyak studio secara swalayan (*multi-company isolation*).
- Penagihan paket tidak bersifat recurring otomatis (*auto-debit*); pelanggan melakukan perpanjangan manual saat masa aktif mendekati akhir.
- Tidak ada antrean tunggu kelas (*waitlist*).

### 2.3 Ukuran Keberhasilan

1. Seluruh peran (Admin, Coach, Customer) dapat menjalankan alur kerja utamanya melalui antarmuka React yang terhubung penuh ke API.
2. Aturan booking, kuota, pembatalan, dan saldo menghasilkan kalkulasi yang identik saat API dipanggil langsung tanpa browser.
3. Transaksi pembayaran Sandbox dapat dimulai, diverifikasi batas waktunya (15 menit), di-resume jika jendela tertutup, dan diselesaikan statusnya secara atomik.
4. Spesifikasi OpenAPI (`/api/docs`) memungkinkan pengembang eksternal mengintegrasikan klien baru secara mandiri.
5. Skenario kriteria penerimaan pada bagian 12 terbukti lulus verifikasi fungsional.

---

## 3. Teknologi, Lingkungan, dan Tahapan

| Komponen | Keputusan |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 6, responsif ponsel dan desktop, estetika Japandi |
| **Backend API** | NestJS 11, TypeScript, Express, arsitektur modular per fitur |
| **Database** | PostgreSQL 16 (Docker Compose untuk lokal, PostgreSQL service untuk VPS) |
| **Dokumentasi API** | OpenAPI 3.0 via Swagger UI (`/api/docs`) dan OpenAPI JSON (`/api/docs-json`) |
| **Payment Gateway** | Midtrans Snap Sandbox dengan validasi SHA-512 dan enkripsi Server Key AES-256 |
| **Zona Waktu Bisnis** | `Asia/Makassar` (WITA); penyimpanan data menggunakan timestamp UTC berzona |
| **Deployment VPS** | Linux Ubuntu Server (`43.157.248.201`) domain `https://wellness.anthonywj.my.id` |
| **CI/CD Pipeline** | GitHub Actions dengan self-hosted runner `vps-wellness` pada branch `main` |

### 3.1 Tahapan Pelaksanaan

1. **Fondasi Desain dan Prototipe:** Penyusunan antarmuka publik dan dashboard bergaya Japandi modern dengan sistem komponen terpadu.
2. **Fondasi Backend API:** Implementasi autentikasi sesi berbasis PostgreSQL, proteksi CSRF, kontrol akses peran, katalog kelas, dan penjadwalan rutin 180 hari.
3. **Engine Pembayaran dan Ledger:** Integrasi Midtrans Snap Sandbox, mekanisme tahan kursi 15 menit, resume modal checkout, buku besar saldo dompet (double-entry), dan kebijakan pembatalan adaptif 24 jam.
4. **Modul Operasional Tingkat Lanjut:** Presensi pelatih 2-tier, verifikasi tiket QR meja depan dengan deteksi nomor loker fisik aktif, matriks visual loker Japandi, CMS headless dengan draf versioned, dan isolasi snapshot riwayat kesehatan.
5. **Otomatisasi CI/CD dan Deployment VPS:** Penerapan pipeline GitHub Actions dengan self-hosted runner di server VPS Linux untuk pengujian dan rilis zero-downtime.

### 3.2 Matriks Status Fitur yang Diimplementasikan

| Area Fitur | Status Implementasi | Catatan dan Batasan Verifikasi |
| :--- | :--- | :--- |
| **Situs Publik dan CMS** | Tersedia | Profil studio, jadwal interaktif, paket membership, galeri, draf versioning, pratinjau admin, publikasi atomik, dan proteksi media JPG/PNG/WebP maks 5 MB. |
| **Autentikasi dan Akun** | Tersedia | Pendaftaran pelanggan langsung aktif tanpa email verification, sesi PostgreSQL via cookie `HttpOnly` `wellness.sid`, proteksi CSRF, rotasi sandi demo, dan reset sandi offline admin dengan audit. |
| **Katalog dan Jadwal** | Tersedia | Tiga tingkat kelas (Beginner, Intermediate 1, Intermediate 2), aturan jadwal berulang hingga 180 hari, pembatalan sesi studio dengan pemulihan hak pelanggan secara atomik. |
| **Booking dan Kuota** | Tersedia | Validasi kelayakan di backend, kapasitas kursi, kuota prorata bulanan member, tahan kursi 15 menit, opsi 'Lanjutkan Pembayaran' jika modal tertutup, dan refresh status. |
| **Midtrans dan Saldo** | Tersedia | Snap Sandbox dengan parameter `expiry` 15 menit, verifikasi webhook SHA-512, pembayaran kombinasi saldo + gateway, buku besar mutasi saldo, dan penanganan pembayaran sukses terlambat. |
| **Presensi Pelatih (2-Tier)** | Tersedia | Tier 1 Direktori Kartu Kelas (filter Semua, Hari Ini, Mendatang, Selesai, kuota kehadiran) dan Tier 2 Detail Roster Peserta (alert kesehatan, status lobi, tombol massal 'Tandai Semua Hadir'). |
| **Verifikasi Meja Depan** | Tersedia | Scan QR e-ticket di meja depan admin, validasi tiket, pencatatan waktu kedatangan lobi, dan tampilan otomatis nomor loker fisik aktif member. |
| **Manajemen Loker** | Tersedia | Matriks visual loker Japandi (Tersedia, Terpakai, Perawatan), penugasan member aktif, dan auto-release saat paket langganan berakhir. |
| **Rekam Kesehatan** | Tersedia | Formulir kondisi fisik dengan persetujuan (consent), snapshot terbatas saat sesi kelas berlangsung untuk pelatih pengajar, dan isolasi total dari dashboard admin. |
| **CI/CD dan Deployment VPS** | Tersedia | GitHub Actions workflow otomatis pada setiap push `main`, terhubung ke self-hosted runner di VPS `wellness.anthonywj.my.id`. |

---

## 4. Peran dan Hak Akses Pengguna

| Peran / Status | Hak Utama | Pembatasan Utama |
| :--- | :--- | :--- |
| **Pengunjung Publik** | Melihat profil studio, galeri, daftar paket, dan jadwal kelas publik. | Wajib mendaftar atau login untuk melakukan pemesanan; tidak dapat mengakses data internal studio. |
| **Pelanggan Reguler** | Mengelola profil dan formulir kesehatan sendiri; memesan kelas pemula; melihat riwayat booking, pembayaran, dan saldo dompet. | Tidak dapat memesan kelas tingkat lanjutan (Intermediate 1 dan 2) tanpa paket aktif. |
| **Member (Paket Aktif)** | Seluruh hak pelanggan reguler, akses ke 3 tingkat kelas, jatah kelas bulanan, dan informasi loker pribadi yang ditetapkan. | Status member dievaluasi berdasarkan masa aktif paket pada tanggal sesi kelas berlangsung, bukan sebagai role akun terpisah. |
| **Pelatih (Coach)** | Melihat jadwal sesi yang diajar via direktori kartu kelas, melihat detail roster peserta, memantau alert kondisi fisik berizin, dan mencatat presensi kehadiran kelas. | Tidak dapat melihat data peserta dari sesi yang diajar oleh pelatih lain; tidak dapat melihat data keuangan studio. |
| **Admin Studio** | Mengelola katalog, jadwal, staf, CMS, matriks loker, kebijakan, pengaturan Midtrans, verifikasi tiket meja depan lobi, audit absensi, dan rekonsiliasi keuangan. | Kredensial rahasia gateway disamarkan; tidak memiliki akses baca terhadap isi rekam medis/kesehatan pelanggan demi privasi. |

---

## 5. Halaman dan Alur Antarmuka Pengguna

### 5.1 Halaman Publik
- **Beranda (Landing Page):** Menampilkan profil studio, hero banner Japandi, cuplikan kelas unggulan, pilihan paket membership, galeri, dan kontak peta Google Maps resmi.
- **Jadwal Interaktif:** Menampilkan jendela tanggal yang dapat dipilih (hingga 30 hari untuk member, 7 hari untuk publik), kategori kelas, jam sesi, pelatih pengajar, sisa kuota kursi, dan status reservasi.
- **Headless CMS Studio:** Admin mengelola konten melalui antarmuka draf, pratinjau terisolasi (`?preview=1`), dan penerbitan satu klik (*atomic publish*). Media divalidasi dengan batas 5 MB per berkas.

### 5.2 Dashboard Pelanggan
- Menampilkan ringkasan status paket aktif, sisa kuota bulan berjalan, nomor loker aktif, saldo dompet, serta daftar booking mendatang dan riwayat lampau.
- **Alur Pembayaran Resilient:** Pada saat checkout, modal Midtrans Snap muncul dengan batas waktu 15 menit. Apabila modal tertutup tanpa sengaja, tombol 'Lanjutkan Pembayaran' tersedia di riwayat booking untuk membuka kembali token transaksi yang masih aktif.

### 5.3 Dashboard Pelatih (Alur Presensi 2-Tier)
- **Tier 1 (Direktori Sesi Kelas):** Disajikan dalam bentuk grid kartu sesi interaktif dengan tab filter status (Semua, Hari Ini, Mendatang, Selesai), bilah pencarian nama kelas/pelatih, pemilih tanggal, indikator kuota kehadiran (contoh: '3/10 Hadir'), dan tombol akses 'Buka Kelas & Absensi'.
- **Tier 2 (Detail Sesi & Roster Peserta):** Tampilan penuh berfokus yang memuat:
  - Breadcrumb navigasi 'Kembali ke Jadwal Kelas'.
  - Ringkasan statistik kehadiran (Total Peserta, Hadir, Belum Hadir).
  - Banner peringatan (alert) kondisi fisik peserta yang memiliki catatan kesehatan berizin.
  - Tombol massal 'Tandai Semua Hadir' untuk mempercepat operasional kelas.
  - Daftar peserta lengkap dengan indikator status kedatangan lobi (*Tiba di Lobi*), nomor kontak, dan tombol toggle presensi individu (*Hadir* / *Tidak hadir*).

### 5.4 Dashboard Admin
- Navigasi mencakup: Kelola Sesi, Jenis Kelas, Jadwal Berulang, **Verifikasi tiket** (Front Desk Check-in), Matriks Loker, Kelola Akun, CMS Situs, Keuangan, dan Pengaturan Pembayaran.
- **Verifikasi Tiket Meja Depan (Front Desk):** Admin memindai atau memasukkan kode QR e-ticket peserta saat tiba di lobi. Sistem mencatat waktu verifikasi kedatangan dan secara otomatis menampilkan nomor loker fisik aktif pelanggan (misal: 'Loker Pribadi: Loker A-01') untuk asistensi resepsionis.

---

## 6. Kelas, Sesi, dan Penjadwalan

- Tiga tingkatan kelas berjenjang: *Beginner*, *Intermediate 1*, dan *Intermediate 2*.
- Admin dapat menetapkan jadwal mingguan berulang otomatis hingga 180 hari ke depan, dengan kemampuan membuat sesi pengecualian atau pembatalan sesi tertentu.
- Sesi yang telah memiliki booking terkonfirmasi tidak dapat diubah jadwal atau kapasitasnya secara langsung. Admin harus membatalkan sesi tersebut (yang secara atomik memulihkan seluruh hak dan pembayaran pelanggan), lalu membuat sesi pengganti.
- Batas waktu pemesanan kelas ditutup 2 jam sebelum waktu mulai sesi.

---

## 7. Paket Keanggotaan dan Perhitungan Jatah Bulanan

- Paket keanggotaan memiliki durasi dalam satuan bulan kalender (contoh: 1 bulan, 3 bulan, 6 bulan).
- Tanggal aktif pertama dimulai pada tanggal lokal saat pembayaran berhasil. Tanggal aktif terakhir dihitung presisi kalender: satu hari sebelum tanggal padanan di bulan target, atau hari terakhir bulan jika tanggal padanan tidak tersedia (contoh: 31 Januari untuk 1 bulan pada tahun nonkabisat aktif hingga 28 Februari).
- Jatah kelas bulanan dialokasikan berdasarkan **bulan kalender tempat sesi berlangsung**, dihitung prorata menurut rumus:
  `ceil(jatah_normal_bulanan * jumlah_hari_aktif_di_bulan / jumlah_hari_di_bulan)`.
- Perpanjangan paket manual dapat dilakukan mulai 30 hari sebelum masa paket aktif terakhir berakhir.

---

## 8. Booking, Pembayaran Midtrans, dan Saldo

### 8.1 Alur Reservasi
- Pelanggan memilih metode pembayaran: jatah kuota member bulanan, saldo dompet, atau pembelian satuan via payment gateway.
- Kelas dengan harga satuan Rp0 langsung terkonfirmasi tanpa memotong jatah kuota member atau memicu payment gateway.
- Pembayaran via Midtrans menahan kursi (*seat hold*) selama 15 menit.

### 8.2 Konfigurasi dan Ketahanan Midtrans Snap
- Backend mengirim parameter kedaluwarsa 15 menit (`expiry: { duration: 15, unit: 'minutes' }`) pada setiap permintaan token Snap.
- Sistem menyimpan token Snap dan URL pengalihan untuk memungkinkan pelanggan membuka kembali (*resume checkout*) sesi pembayaran yang belum selesai selama masih dalam jendela 15 menit.
- Webhook diverifikasi menggunakan tanda tangan hash SHA-512 dengan kunci Server Key yang tersimpan terenkripsi AES-256.
- Jika pembayaran gateway sukses dilaporkan setelah batas waktu penahanan 15 menit berakhir:
  - Backend memprioritaskan pembuatan booking baru jika sesi masih memenuhi syarat dan kursi masih tersedia.
  - Jika sesi telah penuh atau tidak lagi memenuhi syarat, nominal pembayaran gateway secara otomatis dikonversi menjadi saldo dompet pelanggan tanpa ada dana yang hilang.

### 8.3 Buku Besar Saldo Dompet (Wallet Ledger)
- Menggunakan prinsip pencatatan ganda (*double-entry bookkeeping*). Setiap kredit, debit, dan pembebasan reservasi memiliki nomor referensi transaksi asal yang jelas.
- Saldo dompet dapat digunakan untuk membayar sebagian atau seluruh biaya pemesanan kelas satuan. Saldo tidak dapat digunakan untuk membeli paket membership.

### 8.4 Kebijakan Pembatalan Adaptif
- Batas waktu pembatalan mandiri oleh pelanggan adalah **24 jam** sebelum sesi kelas dimulai.
- Pembatalan sebelum batas waktu mengembalikan jatah kuota atau mengkreditkan 100% nominal pembayaran kembali ke saldo dompet.
- Pembatalan kurang dari 24 jam sebelum kelas dimulai menghanguskan jatah/pembayaran.
- Pembatalan sepihak oleh pihak studio memulihkan seluruh hak peserta secara penuh, termasuk memulihkan hak peserta yang sempat membatalkan terlambat.

---

## 9. Kesehatan, Absensi, dan Manajemen Loker

### 9.1 Privasi dan Rekam Kesehatan Berizin
- Pengisian profil kesehatan bersifat sukarela dan mewajibkan persetujuan (*consent*) pelanggan.
- Pelatih hanya dapat membaca informasi kesehatan peserta yang terdaftar pada sesi yang diajarnya melalui snapshot sesi terbatas.
- Snapshot riwayat kesehatan sesi dihapus otomatis satu tahun setelah sesi berlangsung, atau dihapus seketika saat pelanggan mencabut persetujuan atau meminta penghapusan data.
- Dashboard admin dan respons API admin dibatasi dari isi data kesehatan demi kepatuhan terhadap privasi medis.

### 9.2 Presensi Kelas dan Verifikasi Masuk Meja Depan
- **Verifikasi Masuk Meja Depan (Lobi):** Dikelola oleh admin/resepsionis melalui pemindaian e-ticket QR. Berfungsi mencatat kehadiran fisik pelanggan di area lobi studio dan menampilkan informasi loker aktif.
- **Presensi Kehadiran Kelas (Matras):** Dikelola secara eksklusif oleh pelatih pengajar di dalam ruang kelas melalui alur presensi 2-tier. Pelatih dapat menandai kehadiran individu atau massal hingga 24 jam setelah sesi selesai.
- Ketidakhadiran peserta di kelas tidak mengembalikan jatah atau pembayaran kelas yang telah digunakan. Koreksi absensi administratif oleh admin setelah batas 24 jam mewajibkan pencatatan alasan audit resmi.

### 9.3 Matriks Loker Visual (Japandi System)
- Pengelolaan loker fisik menggunakan antarmuka matriks visual interaktif dengan status warna yang jelas (Tersedia, Terpakai, Perawatan).
- Loker ditetapkan oleh admin kepada member aktif. Satu loker hanya dapat dimiliki oleh satu member aktif pada satu waktu.
- Sistem secara otomatis melepaskan penetapan loker (*auto-release*) ketika paket keanggotaan member yang bersangkutan berakhir.

---

## 10. Kontrak API dan Arsitektur Data

### 10.1 Prinsip Desain API
- API beroperasi di bawah prefiks `/api/v1` menggunakan protokol HTTP JSON terstruktur.
- Autentikasi berbasis sesi terproteksi dengan cookie `HttpOnly` `wellness.sid`.
- Validasi masukan menggunakan NestJS ValidationPipe terpusat; operasi mutasi data terlindung dari serangan CSRF.
- Semua nilai moneter dikirimkan dalam satuan rupiah bulat (contoh: `priceIdr: 150000`).
- Dokumentasi interaktif tersedia secara publik pada endpoint `/api/docs` (Swagger UI) dan `/api/docs-json`.

### 10.2 Ringkasan Endpoint Utama

| Metode dan Path | Hak Akses | Deskripsi Fungsional |
| :--- | :--- | :--- |
| `GET /public/studio` | Publik | Profil studio, jam buka, kontak, dan tautan peta. |
| `GET /public/sessions` | Publik / User | Jadwal kelas publik dengan filter tanggal dan kategori. |
| `POST /auth/login` | Publik | Autentikasi pengguna, menerbitkan sesi PostgreSQL dan CSRF token. |
| `POST /auth/logout` | Terautentikasi | Pencabutan sesi aktif di server dan pembersihan cookie. |
| `POST /bookings` | Pelanggan | Pembuatan reservasi kelas (kuota, saldo, atau gateway Midtrans). |
| `GET /bookings` | Pelanggan | Riwayat reservasi dengan status, e-ticket QR, dan tombol resume bayar. |
| `POST /bookings/{id}/cancel` | Pelanggan | Pembatalan mandiri reservasi sesuai batas waktu 24 jam. |
| `GET /me/membership` | Pelanggan | Status langganan aktif, jatah kuota bulanan, dan masa berlaku. |
| `GET /me/wallet` | Pelanggan | Informasi saldo dompet dan mutasi buku besar. |
| `GET /coach/sessions` | Pelatih | Direktori sesi yang diajar pelatih beserta metrik `attendedCount`. |
| `GET /coach/sessions/{id}/participants`| Pelatih | Roster peserta kelas, alert kesehatan berizin, dan flag `lobbyCheckedIn`. |
| `PUT /coach/sessions/{id}/attendance/{id}` | Pelatih | Pencatatan presensi matras peserta (*Hadir* / *Tidak hadir*). |
| `POST /attendance/check-in/booking` | Admin | Verifikasi tiket lobi meja depan, mengembalikan konfirmasi `lockerCode`. |
| `GET /admin/lockers` | Admin | Matriks visual status seluruh loker studio dan histori penetapan. |
| `POST /webhooks/midtrans` | Midtrans | Penerimaan notifikasi pembayaran gateway dengan validasi SHA-512. |

---

## 11. Kebutuhan Nonfungsional

1. **Keamanan Informasi:** Kata sandi di-hash menggunakan algoritma argon2id/bcrypt; kunci server Midtrans dienkripsi dengan AES-256; proteksi header OWASP via Helmet; sesi terisolasi di database.
2. **Integritas Finansial dan Idempotensi:** Mutasi saldo dan kapasitas kursi terlindung dari *race conditions* menggunakan transaksi database atomik dan *pessimistic locking*. Notifikasi webhook diproses secara idempoten.
3. **Privasi Rekam Medis:** Perlindungan data riwayat fisik peserta dari akses admin dan pembatasan akses pelatih hanya pada sesi aktif yang relevan.
4. **Keandalan dan Operabilitas:** Sistem terintegrasi dengan pipeline CI/CD GitHub Actions pada VPS operasional dengan kemampuan build mandiri dan rollback berbasis Git.
5. **Standar Penulisan dan UI:** Bebas dari segala bentuk emoji dan bebas dari karakter em-dash/en-dash di seluruh komponen sistem dan dokumentasi.

---

## 12. Kriteria Penerimaan Tambahan (AC)

- **AC-25 (Resume Pembayaran Midtrans):** Pelanggan yang tidak sengaja menutup modal pembayaran Snap dapat mengklik 'Lanjutkan Pembayaran' di riwayat booking untuk membuka kembali sesi pembayaran tanpa membuat duplikasi transaksi, selama masih dalam jendela 15 menit.
- **AC-26 (Presensi Pelatih 2-Tier):** Pelatih melihat sesi dalam format kartu direktori dengan filter tab status dan metrik kuota kehadiran (Tier 1), kemudian dapat membuka detail sesi untuk melihat roster lengkap, banner alert kondisi fisik, tombol massal 'Tandai Semua Hadir', dan toggle kehadiran individu (Tier 2).
- **AC-27 (Verifikasi Tiket Meja Depan dan Konfirmasi Loker):** Admin meja depan yang memindai QR e-ticket peserta berhasil mencatat status kedatangan lobi peserta (`lobbyCheckedIn = true`), dan sistem secara instan menampilkan nomor loker fisik aktif member di layar konfirmasi.

---

## 13. Daftar Keputusan Produk (Log Keputusan)

- **O-14:** Durasi penahanan kursi dan masa berlaku token Snap Midtrans diseragamkan menjadi 15 menit melalui parameter `expiry`, didukung oleh mekanisme buka kembali modal checkout jika tertutup tidak sengaja.
- **O-15:** Pemisahan fungsional tegas antara meja depan lobi (*Front Desk Check-in* oleh Admin untuk validasi tiket QR dan pengecekan loker) dengan presensi kelas (*Mat Attendance* oleh Coach untuk presensi latihan fisik dan pantauan kondisi medis).

---

<div align="center">
  <sub>Sora Wellness Studio · Product Requirements Document · Terakhir Diperbarui: 28 September 2026</sub>
</div>
