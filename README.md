# 🌿 Sora Wellness Studio Platform

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11.2-E0234E?logo=nestjs&logoColor=white)
![React](https://img.shields.io/badge/React-19.1-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-6.3-646CFF?logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Midtrans](https://img.shields.io/badge/Payment-Midtrans_Snap-002B49?logoColor=white)

**Platform Manajemen & Booking Studio Wellness Modern Berbasis API-First**  
*Dirancang khusus untuk satu boutique studio (Yoga & Pilates) dengan arsitektur modular, keamanan tingkat enterprise, dan sistem pembayaran terintegrasi.*

[Fitur Utama](#-fitur-utama) •
[Arsitektur & Tech Stack](#-arsitektur--tech-stack) •
[Panduan Instalasi](#-panduan-instalasi-cepat) •
[Akun & Data Demo](#-akun--data-demo) •
[Dokumentasi API](#-dokumentasi-api--pengujian) •
[Struktur Direktori](#-struktur-direktori)

</div>

---

## 📌 Tentang Proyek

**Sora Wellness Studio** adalah platform manajemen studio kebugaran terpadu yang memisahkan secara tegas antara aturan bisnis backend dan antarmuka frontend. Platform ini melayani operasional harian studio mulai dari reservasi kelas, kuota langganan (*membership*), pembatalan adaptif, buku besar saldo (*wallet ledger*), absensi pelatih, rekam kesehatan berizin (*consented health notes*), pengelolaan loker, hingga Content Management System (CMS) untuk situs publik.

> **Status Proyek:** Aplikasi demo tingkat produk (*production-grade demo*). Transaksi pembayaran terhubung langsung ke **Midtrans Sandbox** resmi tanpa uang riil.

---

## ✨ Fitur Utama

### 1. 🌐 Situs Publik & CMS Mandiri
- **Profil Studio Dinamis:** Informasi studio, hero banner, teks promosi, dan galeri foto studio resolusi tinggi.
- **CMS dengan Versioning:** Pengelolaan draf konten, pratinjau khusus admin (`?preview=1`), dan penerbitan satu klik (*atomic publish*) yang terlindung dari *race condition*.
- **Pustaka Media Terproteksi:** Unggah dan validasi berkas gambar (JPG, PNG, WebP maks 5 MB) dengan pelacakan pemakaian aset agar tidak terhapus saat masih digunakan.
- **Peta & Kontak Terintegrasi:** Dukungan URL sematan Google Maps resmi, tautan WhatsApp, dan nomor telepon langsung.

### 2. 🎟️ Sistem Reservasi & Keanggotaan (*Booking Engine*)
- **Tiga Tingkat Kelas:** *Beginner*, *Intermediate 1*, dan *Intermediate 2* dengan batas kapasitas dan harga per sesi.
- **Jadwal Berulang Fleksibel:** Pengaturan pola jadwal mingguan otomatis hingga 180 hari ke depan, lengkap dengan penanganan hari libur atau pembatalan sesi tertentu.
- **Hak Akses Member & Jatah Bulanan:** Perhitungan kuota kelas bulanan dengan prorata akurat sesuai kalender (termasuk penanganan tanggal 31 dan tahun kabisat).
- **Auto-Expire Seat Hold:** Penahanan kursi 15 menit saat pembayaran berlangsung; otomatis dilepaskan oleh background sweeper jika transaksi tidak diselesaikan.

### 3. 💳 Pembayaran & Dompet Digital (*Wallet Ledger*)
- **Integrasi Midtrans Snap Sandbox:** Checkout kelas dan paket membership langsung memanggil gateway resmi Midtrans.
- **Pembayaran Kombinasi:** Fleksibilitas menggunakan saldo dompet (*wallet*) yang digabung dengan pembayaran sisa tagihan via payment gateway.
- **Buku Besar Transaksi (*Double-Entry Ledger*):** Setiap rupiah mutasi (pembelian, pengembalian dana, pembebasan saldo tahanan) tercatat transparan dan tidak dapat dimanipulasi.
- **Penanganan Webhook Aman:** Verifikasi signature notifikasi menggunakan SHA-512 dengan Server Key terenkripsi AES-256.

### 4. 🔄 Kebijakan Pembatalan Adaptif
- **Pembatalan oleh Pelanggan:** Kebijakan pembatalan 24 jam. Pembatalan tepat waktu mengembalikan jatah/saldo 100%, sedangkan pembatalan terlambat menghanguskan jatah/biaya.
- **Pembatalan Sepihak oleh Studio:** Jika studio membatalkan sesi kelas, seluruh hak pelanggan dipulihkan otomatis dalam satu transaksi atomik—termasuk memulihkan hak pelanggan yang sebelumnya sempat membatalkan terlambat.

### 5. 🩺 Kesehatan, Absensi & Privasi Pelatih
- **Rekam Riwayat Kesehatan Berizin:** Formulir kondisi fisik dengan persetujuan (*consent*) yang dapat dihapus sewaktu-waktu oleh pelanggan.
- **Snapshot Kesehatan Terbatas:** Pelatih hanya dapat melihat kondisi kesehatan peserta yang tercatat pada saat sesi kelas berlangsung.
- **Pencatatan & Koreksi Absensi:** Pelatih mencatat kehadiran dalam jendela 24 jam; Admin dapat melakukan koreksi data absensi yang wajib disertai alasan audit.

### 6. 🔐 Manajemen Loker Studio
- Penomoran loker fisik dan penetapan loker eksklusif kepada member aktif.
- Pelepasan loker otomatis (*auto-release*) saat masa paket langganan pelanggan berakhir.

---

## 🏗 Arsitektur & Tech Stack

```mermaid
graph TD
    Client[Browser / Klien HTTP] -->|HTTP / JSON + Session Cookie| Proxy[Vite Proxy :5173]
    Proxy -->|Reverse Proxy /api/v1| Nest[Backend NestJS :3000]
    Nest -->|Connection Pool| PG[(PostgreSQL 16 :55432)]
    Nest -->|Snap API & Webhooks| Midtrans[Midtrans Sandbox]
    Nest -->|Storage| Disk[Uploads Media Storage]
```

| Lapisan | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 6 | Arsitektur modular per fitur, responsif ponsel & desktop |
| **Desain & UI** | CSS Modern, Lucide React, Google Fonts | Tipografi *Cormorant Garamond*, *Manrope*, *Plus Jakarta Sans* |
| **Backend API** | NestJS 11, TypeScript, Express | Arsitektur controller-service-module dengan DTO Validation |
| **Database** | PostgreSQL 16 (Docker) | Akses via `pg.Pool`, transaksi atomik & *pessimistic locking* |
| **Keamanan** | Helmet, CSRF-Sync, PG Session | Sesi server-side `HttpOnly`, proteksi CSRF, sanitasi header |
| **Payment Gateway** | Midtrans Snap Sandbox | Enkripsi Server Key AES-256, verifikasi notifikasi SHA-512 |
| **Testing** | Node.js Test Runner, Playwright | 15/15 Unit test lulus, smoke test browser otomatis |

---

## 🚀 Panduan Instalasi Cepat

### Prasyarat Sistem
- **Node.js** v22.x & **npm**
- **Docker Desktop** (untuk database PostgreSQL)
- **Git** & **PowerShell** (Windows) / Terminal (macOS/Linux)

---

### Langkah 1: Kloning & Persiapan Konfigurasi

```powershell
# 1. Masuk ke folder proyek
Set-Location C:\laragon\www\wellness

# 2. Salin template konfigurasi backend
Copy-Item backend/.env.example backend/.env
```

Buka `backend/.env` dan isi variabel konfigurasi lokal berikut:

```env
DATABASE_URL=postgresql://wellness:password-acak-anda@127.0.0.1:55432/wellness
DB_USER=wellness
DB_PASSWORD=password-acak-anda
DB_NAME=wellness
PORT=3000
SESSION_SECRET=kunci-rahasia-minimal-32-karakter-acak
FRONTEND_ORIGIN=http://127.0.0.1:5173
NODE_ENV=development
MEDIA_STORAGE_DIR=uploads
MIDTRANS_ENV=sandbox
MIDTRANS_SETTINGS_KEY=kunci-base64-32-byte-acak
```

> [!TIP]
> **Cara Cepat Menghasilkan Kunci Acak via Terminal:**
> ```powershell
> node -e "console.log(require('node:crypto').randomBytes(24).toString('base64url'))" # untuk DB_PASSWORD
> node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))" # untuk SESSION_SECRET
> node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"    # untuk MIDTRANS_SETTINGS_KEY
> ```

---

### Langkah 2: Setup Database & Dataset Demo

Jalankan rangkaian perintah berikut di dalam direktori `backend`:

```powershell
Set-Location backend
npm install

# 1. Jalankan PostgreSQL melalui Docker
docker compose up -d db

# 2. Jalankan migrasi skema tabel
npm run migrate

# 3. Muat dataset demo lengkap Sora Wellness Studio
npm run demo:setup
```

Skrip `demo:setup` akan secara otomatis:
- Mengisi 7 katalog kelas dan jadwal rutin 45 hari ke depan.
- Mengunggah foto studio dan mengonfigurasi CMS situs publik.
- Mengonfigurasi nomor kontak dan peta dari `backend/.demo.local.json`.
- Membuat 9 akun demo dan mencatat password uniknya ke:
  ```
  backend/.qa/demo-accounts.json
  ```

---

### Langkah 3: Menjalankan Aplikasi

Buka dua jendela terminal terpisah:

**Terminal 1 (Backend API):**
```powershell
Set-Location backend
npm run dev
```
*API aktif di: `http://127.0.0.1:3000/api/v1`*

**Terminal 2 (Frontend React):**
```powershell
Set-Location frontend
npm install
npm run dev
```
*Frontend aktif di: `http://127.0.0.1:5173`*

Buka peramban di **`http://127.0.0.1:5173`**.

---

## 👥 Akun & Data Demo

Buka berkas [`backend/.qa/demo-accounts.json`](backend/.qa/demo-accounts.json) yang terbuat di komputer Anda untuk melihat password login masing-masing akun:

| Peran | Nama Akun | Email Login | Hak Akses Utama |
| :--- | :--- | :--- | :--- |
| **Admin** | Admin Sora | `admin@sora.example.test` | Kelola jadwal, kelas, staf, CMS, loker, audit absensi, & keuangan |
| **Coach** | Nadia Putri | `nadia@sora.example.test` | Jadwal mengajar, rekam kehadiran, & lihat catatan kesehatan kelasnya |
| **Coach** | Made Arya | `arya@sora.example.test` | Jadwal mengajar, rekam kehadiran, & lihat catatan kesehatan kelasnya |
| **Customer** | Ayu Lestari | `ayu.lestari@sora.example.test` | Booking kelas pemula, beli paket, kelola profil |
| **Customer** | Dimas Saputra | `dimas.saputra@sora.example.test` | Booking kelas pemula, beli paket, kelola profil |
| **Customer** | Lila Mahendra | `lila.mahendra@sora.example.test` | Riwayat kelas lampau, loker, & catatan kesehatan tersimpan |
| **Customer** | Maya Kirana | `maya.kirana@sora.example.test` | Booking kelas aktif mendatang |
| **Customer** | Raka Pratama | `raka.pratama@sora.example.test` | Pelanggan reguler |
| **Customer** | Sinta Dewi | `sinta.dewi@sora.example.test` | Riwayat kelas & koreksi absensi admin |

---

## 📖 Dokumentasi API & Pengujian

Aplikasi menyediakan dokumentasi OpenAPI interaktif yang dapat diakses langsung saat backend berjalan:

* **Swagger UI Interaktif:** `http://127.0.0.1:3000/api/docs`
* **Spesifikasi OpenAPI JSON:** `http://127.0.0.1:3000/api/docs-json`

### Menjalankan Pengujian Mandiri

```powershell
# Jalankan unit test logika bisnis di backend
cd backend
npm test

# Jalankan linter kode
npm run lint

# Jalankan skrip smoke test Playwright di frontend (opsional)
cd ../frontend
npm run smoke:dashboard
npm run smoke:admin
```

---

## 📁 Struktur Direktori

```text
wellness/
├── backend/                  # Layanan NestJS & Business Engine
│   ├── migrations/           # Skema & migrasi tabel PostgreSQL
│   ├── scripts/              # Skrip demo-setup, seed, & smoke test
│   ├── src/                  # Kode sumber modular per fitur
│   │   ├── attendance/       # Modul absensi pelatih & koreksi admin
│   │   ├── auth/             # Sesi, login, CSRF, & ganti kata sandi
│   │   ├── booking/          # Reservasi kelas & aturan pembatalan
│   │   ├── catalog/          # Katalog kelas & jadwal sesi
│   │   ├── content/          # CMS dokumen publik, versi draf, & media
│   │   ├── finance/          # Pemantauan transaksi & buku besar saldo
│   │   ├── health/           # Rekam kesehatan & retensi snapshot
│   │   ├── lockers/          # Manajemen loker & auto-release
│   │   ├── membership/       # Pembelian paket & kuota prorata
│   │   ├── payments/         # Integrasi Midtrans Snap & webhooks
│   │   └── shared/           # Koneksi DB, guard keamanan, & CSRF
│   ├── uploads/              # Penyimpanan berkas media studio
│   └── compose.yaml          # Konfigurasi container PostgreSQL
│
├── frontend/                 # Aplikasi Web React 19 + TypeScript
│   ├── public/images/        # Aset gambar & ilustrasi bawaan
│   ├── src/
│   │   ├── app/              # Komponen root aplikasi & router
│   │   ├── features/         # Komponen dashboard per peran & publik
│   │   ├── shared/           # Klien HTTP API, formatter, & tipe data
│   │   └── styles/           # Desain CSS modular & styling Stitch
│   └── vite.config.ts        # Konfigurasi proxy Vite ke backend
│
├── .demo.local.json          # Konfigurasi kontak & peta studio
├── AGENTS.md                 # Panduan etika & batasan teknis tim
├── PRD.md                    # Product Requirements Document lengkap
└── README.md                 # Dokumentasi panduan utama proyek
```

---

## 🔒 Kebijakan Keamanan & Data

1. **Berkas Lingkungan:** Berkas `.env` tidak pernah dikomit ke repository. Kredensial merchant dan database dikelola per lingkungan pengembang.
2. **Kunci Server Midtrans:** Tersimpan di database PostgreSQL dalam bentuk terenkripsi AES-256 menggunakan `MIDTRANS_SETTINGS_KEY`.
3. **Data Demo:** Seluruh nama pelanggan, catatan kesehatan, testimoni, dan histori transaksi pada dataset demo adalah fiktif untuk kebutuhan pengujian.

---

<div align="center">
  <sub>Dibuat dengan dedikasi untuk keunggulan arsitektur perangkat lunak · © 2026 Sora Wellness Studio</sub>
</div>
