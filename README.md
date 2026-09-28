# Sora Wellness Studio Platform

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11.2-E0234E?logo=nestjs&logoColor=white)
![React](https://img.shields.io/badge/React-19.1-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-6.3-646CFF?logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Midtrans](https://img.shields.io/badge/Payment-Midtrans_Snap-002B49?logoColor=white)
![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF?logo=githubactions&logoColor=white)

**Platform Manajemen dan Booking Studio Wellness Modern Berbasis API-First**  
*Dirancang khusus untuk boutique studio (Yoga dan Pilates) dengan arsitektur modular, keamanan tingkat enterprise, presensi 2-tier, dan sistem pembayaran terintegrasi.*

[Fitur Utama](#fitur-utama) ·
[Gambaran Umum Sistem](#gambaran-umum-arsitektur-sistem) ·
[Struktur Database (ERD)](#struktur-database-entity-relationship-diagram--erd) ·
[Panduan Instalasi Cepat](#panduan-instalasi-cepat) ·
[Akun dan Data Demo](#akun-dan-data-demo) ·
[Dokumentasi API dan Pengujian](#dokumentasi-api-dan-pengujian) ·
[Deployment VPS dan CI/CD](#deployment-vps-dan-cicd) ·
[Struktur Direktori](#struktur-direktori)

</div>

---

## Tentang Proyek

**Sora Wellness Studio** adalah platform manajemen studio kebugaran terpadu yang memisahkan secara tegas antara aturan bisnis backend dan antarmuka frontend. Platform ini melayani operasional harian studio mulai dari reservasi kelas, kuota langganan (membership), pembatalan adaptif, buku besar saldo (wallet ledger), presensi pelatih 2-tier, verifikasi tiket lobi meja depan, rekam kesehatan berizin (consented health notes), sistem matriks loker fisik, hingga Content Management System (CMS) untuk situs publik.

> **Status Proyek:** Aplikasi demo tingkat produk (production-grade demo). Transaksi pembayaran terhubung langsung ke **Midtrans Sandbox** resmi tanpa uang riil. Sistem telah dilengkapi pipeline CI/CD otomatis ke server VPS aktif.

---

## Fitur Utama

### 1. Situs Publik dan Headless CMS Mandiri
- **Profil Studio Dinamis:** Informasi studio, hero banner, teks promosi, dan galeri foto studio resolusi tinggi bergaya estetika Japandi modern.
- **CMS dengan Versioning:** Pengelolaan draf konten, pratinjau khusus admin (`?preview=1`), dan penerbitan satu klik (atomic publish) yang terlindung dari *race condition*.
- **Pustaka Media Terproteksi:** Unggah dan validasi berkas gambar (JPG, PNG, WebP maks 5 MB) dengan pelacakan pemakaian aset agar tidak terhapus saat masih digunakan di konten aktif.
- **Peta dan Kontak Terintegrasi:** Dukungan URL sematan Google Maps resmi, tautan WhatsApp, dan nomor telepon langsung.

### 2. Sistem Reservasi dan Keanggotaan (Booking Engine)
- **Tiga Tingkat Kelas:** *Beginner*, *Intermediate 1*, dan *Intermediate 2* dengan batas kapasitas dan harga per sesi.
- **Jadwal Berulang Fleksibel:** Pengaturan pola jadwal mingguan otomatis hingga 180 hari ke depan, lengkap dengan penanganan hari libur atau pembatalan sesi tertentu.
- **Hak Akses Member dan Jatah Bulanan:** Perhitungan kuota kelas bulanan dengan prorata akurat sesuai kalender (termasuk penanganan tanggal 31 dan tahun kabisat).
- **Auto-Expire Seat Hold 15 Menit:** Penahanan kursi selama 15 menit saat checkout berlangsung; otomatis dilepaskan oleh background sweeper jika transaksi tidak diselesaikan.

### 3. Pembayaran Terintegrasi dan Dompet Digital (Wallet Ledger)
- **Integrasi Midtrans Snap Sandbox:** Checkout kelas dan paket membership langsung memanggil gateway resmi Midtrans dengan batas waktu transaksi 15 menit presisi.
- **Resilience Pembayaran (Resume Modal):** Jika pelanggan tidak sengaja menutup pop-up Snap atau tab pembayaran, sistem menyediakan opsi 'Lanjutkan Pembayaran' di riwayat booking untuk membuka kembali sesi transaksi aktif selama masih dalam batas 15 menit.
- **Pembayaran Kombinasi:** Fleksibilitas menggunakan saldo dompet (wallet) yang digabung dengan pembayaran sisa tagihan via payment gateway.
- **Buku Besar Transaksi (Double-Entry Ledger):** Setiap rupiah mutasi (pembelian, pengembalian dana, pembebasan saldo tahanan) tercatat transparan dan tidak dapat dimanipulasi.
- **Penanganan Webhook Aman:** Verifikasi signature notifikasi menggunakan SHA-512 dengan Server Key terenkripsi AES-256 di database.

### 4. Kebijakan Pembatalan Adaptif
- **Pembatalan oleh Pelanggan:** Kebijakan pembatalan 24 jam sebelum kelas dimulai. Pembatalan tepat waktu mengembalikan jatah/saldo 100%, sedangkan pembatalan terlambat menghanguskan jatah/biaya.
- **Pembatalan Sepihak oleh Studio:** Jika studio membatalkan sesi kelas, seluruh hak pelanggan dipulihkan otomatis dalam satu transaksi atomik, termasuk memulihkan hak pelanggan yang sebelumnya sempat membatalkan terlambat.

### 5. Presensi Pelatih 2-Tier dan Rekam Kesehatan Berizin
- **Arsitektur Presensi 2-Tier:** 
  - *Tier 1 (Direktori Sesi Kelas):* Grid kartu kelas interaktif dengan filter tab (Semua, Hari Ini, Mendatang, Selesai), pencarian instan, pemilih tanggal, indikator kuota kehadiran (misal: '3/10 Hadir'), dan tombol 'Buka Kelas & Absensi'.
  - *Tier 2 (Detail Sesi & Roster Peserta):* Tampilan penuh berfokus dengan breadcrumb kembali, statistik kehadiran, banner alert kondisi fisik peserta, tombol massal 'Tandai Semua Hadir', serta toggle kehadiran per peserta lengkap dengan indikator kedatangan lobi.
- **Rekam Riwayat Kesehatan Berizin:** Formulir kondisi fisik dengan persetujuan (consent) yang dapat dihapus sewaktu-waktu oleh pelanggan.
- **Snapshot Kesehatan Terbatas:** Pelatih hanya dapat melihat kondisi kesehatan peserta yang tercatat pada saat sesi kelas berlangsung. Admin tidak memiliki akses ke isi rekam kesehatan demi privasi.

### 6. Verifikasi Masuk Meja Depan (Front Desk Check-in)
- **Pemisahan Wewenang Lobi dan Matras:** Admin meja depan bertugas melakukan verifikasi e-ticket QR di lobi studio, mencatat timestamp kedatangan peserta, dan memvalidasi tiket masuk.
- **Deteksi Loker Fisik Instan:** Saat QR e-ticket pelanggan berhasil diverifikasi di meja depan, sistem langsung menampilkan nomor loker fisik aktif pelanggan (contoh: 'Loker Pribadi: Loker A-01') untuk kemudahan operasional resepsionis.

### 7. Manajemen Loker Matriks (Japandi Style)
- **Matriks Loker Visual:** Tampilan grid loker interaktif dengan pemetaan zona, status visual (Tersedia, Terpakai, Perawatan), serta modal penugasan member.
- **Pelepasan Otomatis (Auto-Release):** Pelepasan loker otomatis oleh sistem ketika masa paket keanggotaan pelanggan berakhir.

---

## Arsitektur dan Tech Stack

### Gambaran Umum Arsitektur Sistem

```mermaid
flowchart TD
    subgraph ACTORS["Aktor Pengguna"]
        Guest["Pengunjung Tamu"]
        Customer["Pelanggan / Member"]
        Coach["Pelatih (Coach)"]
        Admin["Staf Meja Depan / Admin"]
    end

    subgraph FRONTEND["Frontend SPA (React 19 + TypeScript + Vite)"]
        PublicApp["Portal Publik & CMS Viewer"]
        MemberApp["Portal Reservasi & Dompet Saldo"]
        CoachApp["Coach Console (Presensi 2-Tier)"]
        AdminApp["Admin Terminal (Front Desk Check-in & Loker)"]
    end

    subgraph GATEWAY["Reverse Proxy & Keamanan"]
        Nginx["Nginx / Vite Dev Proxy (:5173 / :80 / :443)"]
        SecMiddleware["Cookie Sesi HttpOnly (wellness.sid) + CSRF-Sync Token"]
    end

    subgraph BACKEND["Backend Core Engines (NestJS 11 + Express)"]
        AuthMod["Auth & Session Module"]
        CatalogMod["Catalog & Schedule Engine (180 Hari)"]
        BookingMod["Booking Engine (Seat Hold 15 Menit)"]
        PaymentMod["Midtrans Payment & Wallet Ledger"]
        AttendMod["Attendance & Front Desk Lobby Engine"]
        LockerMod["Locker Matrix & Auto-Release Engine"]
        HealthMod["Health Consent & Isolated Snapshot"]
        CMSMod["Headless CMS & Versioned Document Engine"]
    end

    subgraph STORAGE["Penyimpanan Data Terpusat"]
        PG[("PostgreSQL 16 Relational DB")]
        DiskStorage["Penyimpanan Berkas Media Lokal (uploads/)"]
    end

    subgraph EXTERNAL["Layanan Pihak Ketiga (External Services)"]
        Midtrans["Midtrans Snap Sandbox Payment Gateway"]
        GoogleMaps["Google Maps Embed API"]
    end

    subgraph CICD["Otomatisasi CI/CD & Infrastruktur"]
        GH["GitHub Repository (branch: main)"]
        GHActions["GitHub Actions CI/CD Pipeline"]
        VPS["Self-Hosted Runner (VPS Ubuntu 43.157.248.201)"]
    end

    %% Hubungan alur data
    Guest --> PublicApp
    Customer --> MemberApp
    Coach --> CoachApp
    Admin --> AdminApp

    PublicApp & MemberApp & CoachApp & AdminApp -->|HTTP JSON + Cookie| Nginx
    Nginx --> SecMiddleware
    SecMiddleware -->|Reverse Proxy /api/v1| AuthMod & CatalogMod & BookingMod & PaymentMod & AttendMod & LockerMod & HealthMod & CMSMod

    AuthMod & CatalogMod & BookingMod & PaymentMod & AttendMod & LockerMod & HealthMod & CMSMod -->|Connection Pool pg.Pool| PG
    CMSMod -->|Write / Read File| DiskStorage

    PaymentMod -->|Snap Token API & Webhook SHA-512| Midtrans
    PublicApp -.->|Embed Map Iframe| GoogleMaps

    GH -->|Push Webhook| GHActions
    GHActions -->|Trigger Job| VPS
    VPS -->|Auto Build, Migrate, Reload PM2| BACKEND
    VPS -->|Deploy Static Bundle| Nginx
```

---

### Struktur Database (Entity Relationship Diagram · ERD)

```mermaid
erDiagram
    APP_USERS ||--o{ BOOKINGS : "memesan"
    APP_USERS ||--o{ MEMBERSHIPS : "memiliki paket"
    APP_USERS ||--o{ PACKAGE_PURCHASES : "membeli paket"
    APP_USERS ||--o| WALLET_ACCOUNTS : "memiliki saldo"
    APP_USERS ||--o| HEALTH_PROFILES : "mencatat riwayat"
    APP_USERS ||--o{ CLASS_SESSIONS : "mengajar sesi (coach)"
    APP_USERS ||--o{ LOCKER_ASSIGNMENTS : "ditetapkan loker"

    CLASS_TYPES ||--o{ SCHEDULE_RULES : "aturan jadwal template"
    CLASS_TYPES ||--o{ CLASS_SESSIONS : "kategori kelas"
    SCHEDULE_RULES ||--o{ CLASS_SESSIONS : "menghasilkan sesi rutin"

    PACKAGE_OPTIONS ||--o{ PACKAGE_PURCHASES : "opsi yang dibeli"
    PACKAGE_PURCHASES ||--o| MEMBERSHIPS : "mengaktifkan keanggotaan"

    CLASS_SESSIONS ||--o{ BOOKINGS : "menampung reservasi"
    CLASS_SESSIONS ||--o{ ATTENDANCE : "mencatat kehadiran"

    BOOKINGS ||--o| PAYMENT_TRANSACTIONS : "transaksi pembayaran kelas"
    PACKAGE_PURCHASES ||--o| PAYMENT_TRANSACTIONS : "transaksi pembayaran paket"
    BOOKINGS ||--o| ATTENDANCE : "tiket masuk sesi"
    BOOKINGS ||--o| HEALTH_SNAPSHOTS : "snapshot catatan fisik"

    WALLET_ACCOUNTS ||--o{ WALLET_ENTRIES : "mutasi buku besar saldo"
    BOOKINGS ||--o{ WALLET_ENTRIES : "referensi mutasi booking"

    LOCKERS ||--o{ LOCKER_ASSIGNMENTS : "kompartemen fisik"
    MEMBERSHIPS ||--o{ LOCKER_ASSIGNMENTS : "mengikat hak loker"

    APP_USERS {
        uuid id PK
        citext email UK
        text full_name
        text role "admin | coach | customer"
        text password_hash
        boolean password_change_required
        timestamptz created_at
    }

    CLASS_TYPES {
        uuid id PK
        text title
        text category
        text level "beginner | intermediate_1 | intermediate_2"
        integer duration_minutes
        integer default_capacity
        integer default_price_idr
        boolean active
    }

    CLASS_SESSIONS {
        uuid id PK
        uuid class_type_id FK
        uuid coach_id FK
        date local_date
        timestamptz starts_at
        timestamptz ends_at
        integer capacity
        integer price_idr
        text status "scheduled | cancelled | finished"
    }

    BOOKINGS {
        uuid id PK
        uuid customer_id FK
        uuid session_id FK
        text status "pending_payment | confirmed | cancelled | expired"
        text source "free | quota | single"
        integer price_idr
        integer wallet_reserved_idr
        integer gateway_due_idr
        timestamptz hold_expires_at
    }

    PAYMENT_TRANSACTIONS {
        uuid id PK
        uuid booking_id FK
        uuid package_purchase_id FK
        text order_id UK
        integer gross_amount_idr
        text status "pending | success | failed | expired"
        text snap_token
        text redirect_url
    }

    MEMBERSHIPS {
        uuid id PK
        uuid customer_id FK
        uuid purchase_id FK
        date starts_on
        date ends_on
    }

    WALLET_ACCOUNTS {
        uuid customer_id PK, FK
        bigint balance_idr
    }

    ATTENDANCE {
        uuid session_id PK, FK
        uuid customer_id PK, FK
        uuid booking_id UK, FK
        boolean present
        uuid recorded_by FK
        timestamptz recorded_at
    }

    LOCKERS {
        uuid id PK
        text code UK
        boolean active
    }

    LOCKER_ASSIGNMENTS {
        uuid id PK
        uuid locker_id FK
        uuid customer_id FK
        uuid membership_id FK
        timestamptz assigned_at
        timestamptz released_at
    }
```

---

### Matriks Teknologi (Tech Stack)

| Lapisan | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 6 | Arsitektur modular per fitur, responsif ponsel dan desktop |
| **Desain dan UI** | Modern CSS, Lucide React, Google Fonts | Estetika Japandi, tipografi *Plus Jakarta Sans* dan *Cormorant Garamond* |
| **Backend API** | NestJS 11, TypeScript, Express | Arsitektur controller-service-module dengan DTO Validation Pipe |
| **Database** | PostgreSQL 16 (Docker) | Akses via `pg.Pool`, transaksi atomik dan *pessimistic locking* |
| **Keamanan** | Helmet, CSRF-Sync, PG Session | Sesi server-side `HttpOnly`, proteksi CSRF, sanitasi header OWASP |
| **Payment Gateway** | Midtrans Snap Sandbox | Enkripsi Server Key AES-256, verifikasi notifikasi SHA-512 |
| **CI/CD Pipeline** | GitHub Actions, Self-Hosted Runner | Otomatisasi pengujian, build, dan zero-downtime reload di VPS |
| **Testing** | Node.js Test Runner, Playwright | Unit test logika bisnis mandiri dan smoke test browser |

---

## Panduan Instalasi Cepat

### Prasyarat Sistem
- **Node.js** v22.x dan **npm**
- **Docker Desktop** (untuk database PostgreSQL)
- **Git** dan **PowerShell** (Windows) / Terminal (macOS/Linux)

---

### Langkah 1: Kloning dan Persiapan Konfigurasi

```powershell
# 1. Masuk ke direktori repositori
Set-Location C:\laragon\www\wellness

# 2. Salin template konfigurasi backend
Copy-Item backend/.env.example backend/.env
```

Buka `backend/.env` dan sesuaikan variabel konfigurasi lokal berikut:

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
> **Cara Menghasilkan Kunci Acak via Terminal:**
> ```powershell
> node -e "console.log(require('node:crypto').randomBytes(24).toString('base64url'))" # DB_PASSWORD
> node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))" # SESSION_SECRET
> node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"    # MIDTRANS_SETTINGS_KEY
> ```

---

### Langkah 2: Setup Database dan Dataset Demo

Jalankan rangkaian perintah berikut di dalam direktori `backend`:

```powershell
Set-Location backend
npm install

# 1. Jalankan PostgreSQL melalui Docker
docker compose up -d db

# 2. Jalankan skrip migrasi skema database
npm run migrate

# 3. Muat dataset demo lengkap Sora Wellness Studio
npm run demo:setup
```

Skrip `demo:setup` akan secara otomatis:
- Mengisi 7 katalog kelas dan jadwal rutin 45 hari ke depan.
- Mengunggah foto studio dan mengonfigurasi dokumen CMS situs publik.
- Mengonfigurasi nomor kontak dan peta studio.
- Membuat 9 akun demo dengan kredensial tersimpan aman di:
  ```
  backend/.qa/demo-accounts.json
  ```

---

### Langkah 3: Menjalankan Aplikasi

Buka dua jendela terminal terpisah:

**Terminal 1 (Backend API NestJS):**
```powershell
Set-Location backend
npm run dev
```
*API aktif di: `http://127.0.0.1:3000/api/v1`*

**Terminal 2 (Frontend React Vite):**
```powershell
Set-Location frontend
npm install
npm run dev
```
*Frontend aktif di: `http://127.0.0.1:5173`*

Buka peramban di **`http://127.0.0.1:5173`**.

---

## Akun dan Data Demo

Buka berkas lokal [`backend/.qa/demo-accounts.json`](backend/.qa/demo-accounts.json) yang dibuat oleh skrip setup untuk melihat password unik masing-masing akun demo:

| Peran | Nama Akun | Email Login | Hak Akses Utama |
| :--- | :--- | :--- | :--- |
| **Admin** | Admin Sora | `admin@sora.example.test` | Kelola jadwal, kelas, staf, CMS, matriks loker, verifikasi tiket lobi, audit absensi, dan keuangan |
| **Coach** | Nadia Putri | `nadia@sora.example.test` | Jadwal mengajar 2-tier, presensi matras kelas, dan pantauan alert kesehatan peserta |
| **Coach** | Made Arya | `arya@sora.example.test` | Jadwal mengajar 2-tier, presensi matras kelas, dan pantauan alert kesehatan peserta |
| **Customer** | Ayu Lestari | `ayu.lestari@sora.example.test` | Booking kelas pemula, beli paket langganan, dompet saldo, profil |
| **Customer** | Dimas Saputra | `dimas.saputra@sora.example.test` | Booking kelas pemula, beli paket langganan, dompet saldo, profil |
| **Customer** | Lila Mahendra | `lila.mahendra@sora.example.test` | Riwayat kelas lampau, loker pribadi, dan riwayat kesehatan tersimpan |
| **Customer** | Maya Kirana | `maya.kirana@sora.example.test` | Booking kelas aktif mendatang |
| **Customer** | Raka Pratama | `raka.pratama@sora.example.test` | Pelanggan reguler studio |
| **Customer** | Sinta Dewi | `sinta.dewi@sora.example.test` | Riwayat kelas dan koreksi absensi admin |

---

## Dokumentasi API dan Pengujian

Aplikasi menyediakan dokumentasi OpenAPI interaktif yang dapat diakses langsung saat backend berjalan:

- **Swagger UI Interaktif:** `http://127.0.0.1:3000/api/docs`
- **Spesifikasi OpenAPI JSON:** `http://127.0.0.1:3000/api/docs-json`

### Menjalankan Pengujian Mandiri

```powershell
# Jalankan unit test logika bisnis di backend
cd backend
npm test

# Jalankan linter kode backend dan frontend
npm run lint
cd ../frontend
npm run lint

# Jalankan skrip smoke test browser Playwright (opsional)
npm run smoke:dashboard
npm run smoke:admin
npm run smoke:site
npm run smoke:public-data
npm run smoke:package-benefits
```

### Konfigurasi Midtrans Sandbox

1. Kredensial Server Key dan Client Key Sandbox dimasukkan melalui menu **Pengaturan Pembayaran** di Dashboard Admin Sora. Kunci Server dienkripsi dengan AES-256 sebelum disimpan di database.
2. Setiap transaksi Snap dikonfigurasi dengan batas kedaluwarsa 15 menit (`expiry: { duration: 15, unit: 'minutes' }`).
3. Endpoint webhook menerima notifikasi HTTPS di `/api/v1/webhooks/midtrans` dengan validasi SHA-512 signature.

---

## Deployment VPS dan CI/CD

Platform Sora Wellness Studio telah didukung pipeline CI/CD otomatis berbasis **GitHub Actions** yang terhubung langsung ke VPS Linux operasional:

- **Domain Publik Aktif:** `https://wellness.anthonywj.my.id`
- **Host VPS:** Linux Ubuntu Server (Alamat IP: `43.157.248.201`)
- **Workflow:** [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
- **Runner:** Self-Hosted GitHub Runner (`vps-wellness`)
- **Mekanisme Deployment:** Pada setiap `git push origin main`, runner di VPS otomatis menjalankan penarikan kode terbaru, instalasi dependensi, migrasi database, build produksi frontend dan backend, serta reload layanan backend melalui PM2 dan reload static server Nginx/Caddy.

---

## Struktur Direktori

```text
wellness/
├── .github/
│   └── workflows/            # Workflow CI/CD deployment otomatis ke VPS
│       └── deploy.yml
│
├── backend/                  # Layanan NestJS dan Business Logic Engine
│   ├── migrations/           # Skema dan migrasi tabel PostgreSQL
│   ├── scripts/              # Skrip demo setup, MCP, dan utilitas QA
│   ├── src/                  # Modul fitur backend modular
│   │   ├── attendance/       # Modul presensi pelatih dan verifikasi tiket lobi
│   │   ├── auth/             # Sesi PostgreSQL, login, CSRF, dan reset sandi
│   │   ├── booking/          # Reservasi kelas, hold 15 menit, dan pembatalan
│   │   ├── catalog/          # Katalog jenis kelas dan jadwal berulang 180 hari
│   │   ├── content/          # CMS headless draf, publikasi, dan pustaka media
│   │   ├── finance/          # Audit transaksi pembayaran dan buku besar saldo
│   │   ├── health/           # Rekam kesehatan berizin dan isolasi snapshot
│   │   ├── lockers/          # Matriks loker Japandi dan auto-release
│   │   ├── membership/       # Pembelian paket langganan dan jatah prorata
│   │   ├── payments/         # Integrasi Midtrans Snap Sandbox dan webhooks
│   │   └── shared/           # Database pool, auth guards, dan interceptors
│   ├── uploads/              # Direktori penyimpanan berkas media studio
│   └── compose.yaml          # Konfigurasi container PostgreSQL lokal
│
├── frontend/                 # Aplikasi Web React 19 + TypeScript + Vite
│   ├── public/images/        # Aset gambar studio bawaan
│   ├── src/
│   │   ├── app/              # Komponen root aplikasi dan router
│   │   ├── features/         # Modul antarmuka per peran (admin, coach, customer, public)
│   │   ├── shared/           # Klien HTTP API, tipe data, dan formatters
│   │   └── styles/           # Desain CSS modular dan styling sistem
│   └── vite.config.ts        # Konfigurasi proxy Vite ke backend
│
├── .demo.local.json          # Konfigurasi lokal kontak dan peta studio
├── AGENTS.md                 # Panduan etika, batasan teknis, dan alur CI/CD tim
├── PRD.md                    # Product Requirements Document resmi
└── README.md                 # Dokumentasi panduan utama proyek
```

---

## Kebijakan Keamanan dan Tata Kelola Data

1. **Kerahasiaan Kredensial:** Berkas `.env` dan direktori `.qa/` tidak pernah dikomit ke repositori. Kredensial merchant dan database dikelola terisolasi per lingkungan.
2. **Enkripsi Kunci Server:** Kunci Server Midtrans dienkripsi menggunakan algoritma AES-256 dengan `MIDTRANS_SETTINGS_KEY`.
3. **Privasi Rekam Medis:** Rekam riwayat kesehatan peserta dilindungi dengan consent eksplisit dan snapshot terbatas yang hanya dapat diakses oleh pelatih yang bertugas saat kelas berlangsung. Admin tidak memiliki akses baca terhadap isi kondisi kesehatan.
4. **Data Demo:** Seluruh nama pelanggan, rekam kesehatan, testimoni, dan histori transaksi pada dataset demo bersifat fiktif untuk keperluan demonstrasi dan pengujian kualitas perangkat lunak.

---

<div align="center">
  <sub>Dibuat dengan dedikasi untuk keunggulan rekayasa perangkat lunak · © 2026 Sora Wellness Studio</sub>
</div>
