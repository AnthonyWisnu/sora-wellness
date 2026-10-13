# Sora Wellness Studio Platform

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11.2-E0234E?logo=nestjs&logoColor=white)
![React](https://img.shields.io/badge/React-19.1-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Midtrans](https://img.shields.io/badge/Payment-Midtrans_Snap_Sandbox-002B49?logoColor=white)
![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub_Actions_Runner-2088FF?logo=githubactions&logoColor=white)

**Platform Manajemen, Reservasi, dan Ekosistem Wellness Studio Berbasis API-First**  
*Dirancang khusus untuk boutique wellness studio (Yoga dan Pilates) dengan arsitektur modular, otorisasi berbasis izin granular (RBAC), presensi matras 2-tier, manajemen event komunitas luar studio, integrasi payment gateway Midtrans Snap, dan otomatisasi CI/CD VPS operasional.*

[Tentang Proyek](#tentang-proyek) ·
[Fitur Unggulan](#fitur-unggulan) ·
[Alur Bisnis dan Siklus Operasional](#alur-bisnis-dan-siklus-operasional) ·
[Arsitektur dan Diagram Sistem](#arsitektur-dan-diagram-sistem) ·
[Struktur Database (ERD)](#struktur-database-entity-relationship-diagram-erd) ·
[Panduan Instalasi Cepat](#panduan-instalasi-cepat) ·
[Kredensial Akun Demo](#kredensial-akun-demo-resmi) ·
[Dokumentasi API dan Pengujian](#dokumentasi-api-dan-pengujian) ·
[Deployment VPS dan CI/CD](#deployment-vps-dan-cicd) ·
[Struktur Direktori](#struktur-direktori)

</div>

---

## Tentang Proyek

**SORA Wellness Studio** adalah platform perangkat lunak terintegrasi untuk boutique studio kebugaran dan pemulihan tubuh. Sistem ini menerapkan pemisahan kendali mutlak antara aturan bisnis backend (*backend-controlled state machine*) dan antarmuka pengguna frontend (*thin client UI*).

Platform melayani seluruh spektrum aktivitas operasional:
1. **Pemesanan Kelas dan Membership:** Reservasi sesi berulang 180 hari, hold kursi 15 menit, dan kuota langganan prorata kalender.
2. **Transaksi dan Dompet Saldo:** Pembayaran terpadu Midtrans Snap Sandbox, double-entry wallet ledger, resume checkout modal, serta penarikan saldo (*wallet withdrawal/payout*).
3. **Presensi Terpisah (Front Desk vs Matras):** Meja depan fokus pada pemindaian e-ticket QR dan penugasan loker fisik; pelatih di ruang kelas fokus pada presensi kehadiran fisik di matras dan pantauan catatan kesehatan berizin (*consented health notes*).
4. **Event Komunitas Luar Studio:** Pengelolaan workshop outdoor, multi-sesi kegiatan, brosur promosi otomatis, tautan presisi Google Maps, dan e-ticket pass publik.
5. **Otorisasi Granular Enterprise (RBAC):** Superadmin dapat memberikan kombinasi hak akses spesifik per akun staf (Resepsionis, Koordinator Kelas, Keuangan, Manajer) dengan KPI dashboard yang beradaptasi secara dinamis.

> [!NOTE]
> **Status Lingkungan Produksi:** Sistem aktif dan dapat diuji secara langsung pada domain publik **`https://wellness.anthonywj.my.id`** yang terhubung ke server VPS Linux Ubuntu dengan runner CI/CD GitHub Actions otomatis.

---

## Fitur Unggulan

### 1. Sistem Izin Staf Granular dan Dasbor Adaptif (Enterprise RBAC)
- **Matriks 9 Hak Akses Modular:** Hak akses staf tidak lagi menggunakan peran statis yang kaku, melainkan dapat ditentukan secara granular per akun:
  - `front_desk`: Verifikasi tiket QR di meja depan lobi studio.
  - `lockers`: Akses matriks loker fisik dan penugasan kompartemen member.
  - `classes_schedule`: Manajemen kategori kelas, sesi rutin, dan jadwal mingguan.
  - `community_events`: Pengelolaan event komunitas luar studio dan registrasi peserta.
  - `studio_content`: Pengaturan teks, galeri foto, dan CMS landing page publik.
  - `studio_policy`: Konfigurasi kuota bulanan, hold time 15 menit, dan batas waktu pembatalan.
  - `finance_reports`: Buku besar pendapatan riil, log mutasi saldo, dan ekspor rekonsiliasi.
  - `finance_payouts`: Verifikasi dan persetujuan pengajuan transfer penarikan saldo member.
  - `staff_management`: Pendaftaran akun staf dan rotasi kredensial.
- **Preset Akses Cepat:** Pilihan preset sekali klik untuk peran *Resepsionis Lobi*, *Koordinator Kelas*, *Staf Keuangan*, dan *Manajer Umum*.
- **Ringkasan Dasbor Superadmin Dinamis:** Metrik KPI operasional (omzet penjualan riil, okupansi matras bulanan, leads pendaftar event komunitas, dan pelatih aktif) tersaji akurat sesuai data database terkini.

### 2. Modul Event Komunitas Luar Studio (Outdoor & Gathering)
- **Penyelenggaraan Event Fleksibel:** Pengaturan kegiatan di luar ruang studio (seperti Sunrise Yoga di Pantai Sanur atau Taman Budaya) dengan tanggal mulai dan selesai terpisah.
- **Tautan Presisi Google Maps:** Field URL pin lokasi Google Maps terdedikasi (`location_maps_url`) yang langsung membuka titik koordinat presisi di smartphone peserta.
- **Rangkaian Sub-Kegiatan (Maks. 6 Sesi):** Setiap event dapat menampung beragam sub-sesi kelas dengan instruktur pengajar internal studio maupun instruktur tamu eksternal.
- **Portal Pendaftaran dan E-Ticket Pass Mandiri:** Halaman publik `/events/:slug` memungkinkan non-member dan member mendaftar langsung, menghasilkan tiket unik format `SORA-EVT-YYMMDD-XXXX` lengkap dengan QR Code siap cetak.
- **Brosur dan QR Flyer Digital:** Modal generator brosur interaktif dengan QR code pendaftaran siap pakai untuk publikasi di media sosial dan WhatsApp.
- **Terminal Check-in Peserta Event:** Panitia dapat memvalidasi kedatangan peserta di lokasi acara secara instan melalui pencarian nama atau pemindaian kode tiket.

### 3. Presensi Pelatih 2-Tier dan Isolasi Privasi Kesehatan
- **Arsitektur Presensi Pelatih 2-Tier:**
  - *Tier 1 (Direktori Sesi):* Kartu sesi kelas interaktif dengan tab filter cepat (*Semua*, *Hari Ini*, *Mendatang*, *Selesai*), bilah pencarian nama kelas/pelatih, dan indikator kuota kehadiran (contoh: '3/10 Hadir').
  - *Tier 2 (Detail Sesi & Roster Peserta):* Layar terfokus dengan breadcrumb kembali, statistik kehadiran, indikator status check-in lobi, tombol massal 'Tandai Semua Hadir', dan toggle kehadiran individu.
- **Isolasi Catatan Riwayat Kesehatan Berizin (*Health Consent*):** Catatan kondisi fisik bersifat sukarela dan terenkripsi. Hanya pelatih yang mengajar sesi kelas terkait yang dapat melihat catatan kesehatan dalam bentuk snapshot terbatas saat sesi berlangsung. Admin dan pihak luar sama sekali tidak memiliki akses baca demi menjaga privasi medis pelanggan.
- **Dasbor Pelatih Mandiri:** Pelatih memiliki navigasi terdedikasi untuk memantau sesi kelas studio serta agenda event komunitas yang ditugaskan kepada mereka.

### 4. Front Desk Check-in Lobi dan Matriks Loker Fisik Japandi
- **Terminal Meja Depan Khusus:** Staf meja depan fokus memindai e-ticket QR kedatangan member di lobi studio tanpa tercampur dengan absensi matras di ruang latihan.
- **Deteksi Loker Otomatis:** Saat tiket berhasil diverifikasi di meja depan, sistem langsung mendeteksi nomor loker fisik aktif pelanggan (misal: 'Loker Pribadi: Loker A-01') untuk mempermudah pelayanan resepsionis.
- **Visual Locker Matrix:** Manajemen grid loker Japandi dengan status warna (Tersedia, Terpakai, Perawatan) dan penugasan member berbasis dialog. Pelepasan loker dieksekusi otomatis oleh sistem ketika paket membership pelanggan kedaluwarsa.

### 5. Mesin Pembayaran Midtrans Snap dan Dompet Saldo (Wallet Ledger)
- **Midtrans Snap Sandbox Berbatas Waktu:** Setiap pembuatan tagihan Snap mengirim batas kedaluwarsa 15 menit (`expiry: { duration: 15, unit: 'minutes' }`) yang selaras dengan pelepasan penahanan kursi di backend.
- **Dukungan Buka Kembali Modal Pembayaran (*Resume Checkout*):** Jika pelanggan menutup jendela browser atau pop-up Midtrans tanpa sengaja, tombol 'Lanjutkan Pembayaran' di riwayat booking dapat memanggil kembali token Snap aktif tanpa membuat tagihan ganda.
- **Buku Besar Saldo (*Double-Entry Ledger*):** Mutasi rupiah akibat pembatalan kelas tepat waktu tersimpan sebagai saldo dompet yang dapat dibelanjakan kembali atau ditarik ke rekening bank pribadi (*payout request*).
- **Verifikasi Webhook Idempoten:** Notifikasi webhook Midtrans divalidasi menggunakan signature SHA-512 dengan Server Key terenkripsi AES-256 (`MIDTRANS_SETTINGS_KEY`).

### 6. Foto Profil Member dan Headless CMS Situs Publik
- **Unggah Foto Profil Cepat:** Pelanggan dapat mengunggah foto profil (JPG, PNG, WebP maks 2 MB) di halaman `/dashboard/profile` dengan pratinjau instan (*optimistic update*) dan pembersihan otomatis berkas fisik lama.
- **CMS dengan Versioning Atomik:** Pengelolaan draf konten landing page publik, penataan blok berstruktur, pratinjau khusus admin (`?preview=1`), dan penerbitan aman dari *race condition*.

---

## Alur Bisnis dan Siklus Operasional

### 1. Alur Reservasi Kelas, Pembayaran, dan Kedatangan Studio

```mermaid
flowchart TD
    Start(["Pelanggan Memilih Kelas"]) --> CheckQuota{"Memiliki Kuota Member?"}
    
    CheckQuota -- "Ya (Member Aktif)" --> HoldSeat["Backend Tahan Kursi 15 Menit<br/>(Deduce Monthly Quota)"]
    CheckQuota -- "Tidak (Reguler)" --> PaymentOption{"Metode Bayar?"}
    
    PaymentOption -- "Saldo Dompet Cukup" --> DeductWallet["Potong Saldo Dompet<br/>(Atomic Wallet Transaction)"]
    PaymentOption -- "Midtrans Gateway / Kombinasi" --> SnapToken["Request Midtrans Snap Token<br/>(Expiry 15 Menit)"]
    
    SnapToken --> UserPay{"Pelanggan Bayar?"}
    UserPay -- "Sukses Bayar" --> WebhookReceive["Midtrans Webhook SHA-512<br/>(Konfirmasi Transaksi)"]
    UserPay -- "Gagal / >15 Menit" --> ExpireHold["Background Sweeper Lepas Kursi<br/>(Hold Expired)"]
    
    HoldSeat --> BookingConfirmed["Booking Terkonfirmasi<br/>(Generate QR E-Ticket)"]
    DeductWallet --> BookingConfirmed
    WebhookReceive --> BookingConfirmed
    
    BookingConfirmed --> ArrivalLobby["Pelanggan Tiba di Studio"]
    ArrivalLobby --> FrontDeskScan["Front Desk Verifikasi QR Tiket<br/>(Meja Depan Check-in)"]
    FrontDeskScan --> ShowLocker["Sistem Tampilkan Nomor Loker Fisik<br/>(Loker A-01 Terdeteksi)"]
    
    ShowLocker --> MatClass["Pelanggan Masuk Ruang Matras"]
    MatClass --> CoachAttendance["Coach Buka Roster Presensi 2-Tier<br/>(Cek Status Lobi & Alert Kesehatan)"]
    CoachAttendance --> FinishClass(["Presensi Selesai Disimpan"])
```

### 2. Alur Pembatalan Kelas, Pengembalian Saldo, dan Penarikan Dana (Payout)

```mermaid
flowchart LR
    CancelAction["Pelanggan Batalkan Booking"] --> CheckTime{"Waktu Pembatalan<br/>>= 24 Jam Sebelum Kelas?"}
    
    CheckTime -- "Ya (Tepat Waktu)" --> RefundWallet["Refund 100% Saldo Masuk Dompet<br/>(Kredit Buku Besar Dompet)"]
    CheckTime -- "Tidak (Terlambat)" --> Forfeit["Biaya / Kuota Hangus Sesuai Kebijakan"]
    
    RefundWallet --> UserChoice{"Pilihan Pelanggan?"}
    UserChoice -- "Gunakan Kembali" --> Rebook["Checkout Kelas Baru via Saldo Dompet"]
    UserChoice -- "Tarik ke Rekening Bank" --> RequestWithdrawal["Ajukan Tarik Saldo di Dashboard<br/>(Input Bank & Nomor Rekening)"]
    
    RequestWithdrawal --> AdminReview["Admin Staf Buka Menu Payout<br/>(Cek Mutasi & Unggah Bukti Transfer)"]
    AdminReview --> Approval{"Keputusan Admin?"}
    Approval -- "Disetujui (Approved)" --> FundsSent["Dana Cair ke Rekening Member<br/>(Status: Disetujui)"]
    Approval -- "Ditolak (Rejected)" --> RollbackWallet["Saldo Dikembalikan ke Dompet<br/>(Rollback Ledger)"]
```

### 3. Alur Event Komunitas Luar Studio

```mermaid
flowchart TD
    AdminCreate["Admin Buat Event Komunitas<br/>(Input Lokasi, Pin Google Maps & Sub-Sesi)"] --> PubStatus["Set Status: Dipublikasikan"]
    PubStatus --> FlyerGen["Sistem Generate Brosur & QR Digital"]
    
    FlyerGen --> PublicBrowse["Pengunjung Buka Portal /events/:slug"]
    PublicBrowse --> RegForm["Isi Nama, Email & Pilih Sesi Kelas"]
    RegForm --> PassCreated["E-Ticket Terbit (SORA-EVT-YYMMDD-XXXX)<br/>Tautan Pin Peta Aktif"]
    
    PassCreated --> EventDay["Hari Acara di Lokasi Outdoor"]
    EventDay --> CheckinDesk["Panitia / Pelatih Validasi Tiket di Lokasi<br/>(Check-in Peserta)"]
    CheckinDesk --> EventDone(["Kegiatan Komunitas Sukses Terlaksana"])
```

---

## Arsitektur dan Diagram Sistem

### Gambaran Umum Arsitektur Sistem

```mermaid
flowchart TD
    subgraph PERSONAS["Pengguna Sistem"]
        Guest["Pengunjung Tamu"]
        Customer["Pelanggan / Member"]
        Coach["Pelatih (Coach)"]
        Staff["Staf Khusus (Resepsionis / Finance)"]
        Superadmin["Superadmin Studio"]
    end

    subgraph CLIENT["Frontend SPA (React 19 + TypeScript + Vite)"]
        PublicApp["Portal Publik, CMS & Event Page"]
        MemberApp["Portal Reservasi, Profil & Dompet"]
        CoachApp["Coach Console (Presensi 2-Tier & Event)"]
        AdminApp["Admin Cockpit (RBAC Dinamis & Loker Matrix)"]
    end

    subgraph SECURITY["Lapisan Keamanan & Gateway"]
        Nginx["Reverse Proxy HTTPS (Port 443)"]
        SecLayer["HttpOnly Session (wellness.sid) + CSRF Token + Rate Limit"]
    end

    subgraph BACKEND["Backend Core Engines (NestJS 11 + Express)"]
        AuthMod["Auth, Session & Granular RBAC Engine"]
        CatalogMod["Catalog & Recurring Schedule Engine (180 Hari)"]
        BookingMod["Booking & 15-Min Hold Sweeper"]
        PaymentMod["Midtrans Snap Sandbox & Double-Entry Ledger"]
        WithdrawalMod["Wallet Payout & Transfer Verification"]
        EventMod["Community Events & Outdoor Ticket Engine"]
        AttendMod["Attendance 2-Tier & Front Desk Lobby Engine"]
        LockerMod["Locker Matrix & Auto-Release Engine"]
        HealthMod["Health Consent & Isolated Snapshot"]
        CMSMod["Headless CMS & Versioned Document Engine"]
    end

    subgraph DATA["Penyimpanan Data Terpusat"]
        PG[("PostgreSQL 16 (Port 5432)")]
        DiskStorage["Penyimpanan Media Server (uploads/)"]
    end

    subgraph THIRD_PARTY["Layanan Eksternal"]
        Midtrans["Midtrans Snap Sandbox Payment Gateway"]
        GoogleMaps["Google Maps Navigation & Embed Pin"]
    end

    subgraph DEPLOY["Pipeline CI/CD Operasional"]
        GH["GitHub Repo (branch: main)"]
        GHActions["GitHub Actions CI/CD"]
        VPSRunner["Self-Hosted Runner VPS Ubuntu (43.157.248.201)"]
    end

    %% Hubungan alur
    Guest --> PublicApp
    Customer --> MemberApp
    Coach --> CoachApp
    Staff --> AdminApp
    Superadmin --> AdminApp

    PublicApp & MemberApp & CoachApp & AdminApp -->|HTTP Fetch + JSON| Nginx
    Nginx --> SecLayer
    SecLayer -->|Proxy /api/v1| AuthMod & CatalogMod & BookingMod & PaymentMod & WithdrawalMod & EventMod & AttendMod & LockerMod & HealthMod & CMSMod

    AuthMod & CatalogMod & BookingMod & PaymentMod & WithdrawalMod & EventMod & AttendMod & LockerMod & HealthMod & CMSMod -->|Connection Pool pg.Pool| PG
    CMSMod & AuthMod -->|Simpan Foto Profil & Media| DiskStorage

    PaymentMod -->|Snap Token API & Webhook SHA-512| Midtrans
    PublicApp & EventMod -.->|Tautan Navigasi Maps| GoogleMaps

    GH -->|Git Push| GHActions
    GHActions -->|Trigger Job| VPSRunner
    VPSRunner -->|Migrate DB, Compile, PM2 Reload| BACKEND
    VPSRunner -->|Distribusi Statis /dist| Nginx
```

---

## Struktur Database (Entity Relationship Diagram · ERD)

```mermaid
erDiagram
    APP_USERS ||--o{ BOOKINGS : "memesan sesi kelas"
    APP_USERS ||--o{ MEMBERSHIPS : "memiliki paket membership"
    APP_USERS ||--o{ PACKAGE_PURCHASES : "transaksi paket"
    APP_USERS ||--o| WALLET_ACCOUNTS : "memiliki buku besar dompet"
    APP_USERS ||--o| HEALTH_PROFILES : "mencatat kondisi fisik"
    APP_USERS ||--o{ CLASS_SESSIONS : "mengajar kelas (coach)"
    APP_USERS ||--o{ LOCKER_ASSIGNMENTS : "menggunakan kompartemen"
    APP_USERS ||--o{ WALLET_WITHDRAWALS : "mengajukan tarik dana"
    APP_USERS ||--o{ EVENT_REGISTRATIONS : "mendaftar event komunitas"

    CLASS_TYPES ||--o{ SCHEDULE_RULES : "aturan pola mingguan"
    CLASS_TYPES ||--o{ CLASS_SESSIONS : "kategori kelas matras"
    SCHEDULE_RULES ||--o{ CLASS_SESSIONS : "menghasilkan sesi rutin"

    PACKAGE_OPTIONS ||--o{ PACKAGE_PURCHASES : "opsi paket langganan"
    PACKAGE_PURCHASES ||--o| MEMBERSHIPS : "mengaktifkan hak membership"

    CLASS_SESSIONS ||--o{ BOOKINGS : "menampung reservasi"
    CLASS_SESSIONS ||--o{ ATTENDANCE : "mencatat presensi matras"

    BOOKINGS ||--o| PAYMENT_TRANSACTIONS : "transaksi pembayaran kelas"
    PACKAGE_PURCHASES ||--o| PAYMENT_TRANSACTIONS : "transaksi pembayaran paket"
    BOOKINGS ||--o| ATTENDANCE : "tiket masuk kelas"
    BOOKINGS ||--o| HEALTH_SNAPSHOTS : "snapshot kondisi saat sesi"

    WALLET_ACCOUNTS ||--o{ WALLET_ENTRIES : "riwayat mutasi kredit/debit"
    BOOKINGS ||--o{ WALLET_ENTRIES : "referensi mutasi booking"
    WALLET_ACCOUNTS ||--o{ WALLET_WITHDRAWALS : "pencairan saldo"

    LOCKERS ||--o{ LOCKER_ASSIGNMENTS : "slot kompartemen fisik"
    MEMBERSHIPS ||--o{ LOCKER_ASSIGNMENTS : "mengikat hak loker"

    COMMUNITY_EVENTS ||--o{ EVENT_ACTIVITIES : "memiliki sub-kegiatan"
    COMMUNITY_EVENTS ||--o{ EVENT_REGISTRATIONS : "menampung peserta"
    EVENT_ACTIVITIES ||--o{ EVENT_REGISTRATIONS : "sesi kegiatan yang dipilih"

    APP_USERS {
        uuid id PK
        citext email UK
        text full_name
        text role "superadmin | admin | coach | customer"
        text[] permissions "granular permission keys"
        uuid avatar_media_id FK
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

    WALLET_WITHDRAWALS {
        uuid id PK
        uuid customer_id FK
        integer amount_idr
        text bank_name
        text account_number
        text account_holder
        text status "pending | approved | rejected"
        text admin_notes
        uuid transfer_proof_media_id FK
        timestamptz requested_at
        timestamptz processed_at
    }

    COMMUNITY_EVENTS {
        uuid id PK
        text slug UK
        text title
        text description
        text location_name
        text location_address
        text location_maps_url "google maps pin link"
        date start_date
        date end_date
        text status "draft | published | completed | cancelled"
        uuid banner_media_id FK
    }

    EVENT_ACTIVITIES {
        uuid id PK
        uuid event_id FK
        text title
        text category
        text coach_name
        uuid coach_id FK
        boolean is_guest_coach
        text guest_coach_name
        text start_time
        text end_time
        integer capacity
        integer price_idr
    }

    EVENT_REGISTRATIONS {
        uuid id PK
        uuid event_id FK
        uuid activity_id FK
        uuid customer_id FK
        text guest_name
        citext guest_email
        text guest_phone
        text ticket_code UK
        text status "registered | attended | cancelled"
        timestamptz attended_at
    }

    LOCKERS {
        uuid id PK
        text code UK
        text status "available | occupied | maintenance"
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

## Matriks Teknologi (Tech Stack)

| Lapisan | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 6.4 | SPA modular per fitur, tanpa dependensi UI bloated |
| **Desain dan Tipografi** | Modern CSS, Lucide React, Google Fonts | Estetika Japandi, tipografi *Plus Jakarta Sans*, bebas emoji |
| **Backend API** | NestJS 11.2, TypeScript, Express | Arsitektur modular dengan DTO Pipe Validation & Security Guards |
| **Database** | PostgreSQL 16 (Local & Docker) | Native `pg.Pool`, transaksi atomik, locking pesimistik |
| **Keamanan** | Helmet, CSRF-Sync, PG Session Store | Cookie `HttpOnly` (`wellness.sid`), SameSite=Lax, AES-256 Key Encryption |
| **Payment Gateway** | Midtrans Snap Sandbox | Batas kedaluwarsa 15 menit, verifikasi signature SHA-512 |
| **CI/CD Pipeline** | GitHub Actions, Self-Hosted Runner | Otomatisasi pengujian, migrasi skema, dan reload PM2 zero-downtime |
| **Penyimpanan Media** | Local Storage (`uploads/`) | Validasi magic byte SOI `FF D8 FF`, PNG header, WebP RIFF |

---

## Panduan Instalasi Cepat

### Prasyarat Sistem
- **Node.js** v22.x dan **npm**
- **Docker Desktop** (atau PostgreSQL lokal port 5432/55432)
- **Git** dan **PowerShell** (Windows) / Bash (macOS/Linux)

---

### Langkah 1: Kloning Repositori dan Menyiapkan `.env`

```powershell
# Masuk ke direktori proyek
Set-Location C:\laragon\www\wellness

# Salin template environment backend
Copy-Item backend/.env.example backend/.env
```

Pastikan konfigurasi `backend/.env` telah terisi:

```env
DATABASE_URL=postgresql://wellness:password-anda@127.0.0.1:55432/wellness
DB_USER=wellness
DB_PASSWORD=password-anda
DB_NAME=wellness
PORT=3000
SESSION_SECRET=kunci-rahasia-minimal-32-karakter-acak
FRONTEND_ORIGIN=http://127.0.0.1:5173
NODE_ENV=development
MEDIA_STORAGE_DIR=uploads
MIDTRANS_ENV=sandbox
MIDTRANS_SETTINGS_KEY=kunci-base64-32-byte-acak
```

---

### Langkah 2: Migrasi Database dan Penyiapan Data Demo

```powershell
Set-Location backend
npm install

# 1. Jalankan PostgreSQL via Docker (jika belum ada database lokal)
docker compose up -d db

# 2. Jalankan skrip migrasi database (termasuk migrasi 015)
npm run migrate

# 3. Sinkronkan akun demo resmi dan jadwal kelas
npm run demo:setup
```

---

### Langkah 3: Menjalankan Server Lokal

Buka dua terminal terpisah:

**Terminal 1 (Backend NestJS):**
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

Buka browser di **`http://127.0.0.1:5173`**.

---

## Kredensial Akun Demo Resmi

Seluruh akun demo telah diseragamkan dengan kata sandi resmi yang sama untuk memudahkan pengujian di lingkungan lokal maupun VPS:

> **Kata Sandi Seluruh Akun Demo:** `SoraDemo2026!`

| Peran | Nama Akun | Email Login | Hak Akses Utama |
| :--- | :--- | :--- | :--- |
| **Superadmin** | Admin Studio | `admin@sora.example.test` | Akses penuh: RBAC Staf, CMS, Loker, Jadwal, Event, Payout, Keuangan |
| **Staf Resepsionis** | Resepsionis Lobi | `reception@sora.example.test` | Terminal verifikasi e-ticket QR meja depan dan matriks loker fisik |
| **Pelatih (Coach)** | Nadia Putri | `nadia@sora.example.test` | Presensi matras 2-tier, pantau alert kesehatan, penugasan event |
| **Pelatih (Coach)** | Made Arya | `arya@sora.example.test` | Presensi matras 2-tier, pantau alert kesehatan, penugasan event |
| **Pelanggan (Member)** | Ayu Lestari | `ayu.lestari@sora.example.test` | Booking kelas pemula, upload foto profil, dompet saldo, riwayat |
| **Pelanggan (Member)** | Dimas Saputra | `dimas.saputra@sora.example.test` | Paket langganan aktif, booking kelas, riwayat kehadiran |
| **Pelanggan (Member)** | Lila Mahendra | `lila.mahendra@sora.example.test` | Riwayat kelas, catatan kesehatan berizin tersimpan, loker |
| **Pelanggan (Member)** | Maya Kirana | `maya.kirana@sora.example.test` | Reservasi kelas aktif mendatang |
| **Pelanggan (Member)** | Raka Pratama | `raka.pratama@sora.example.test` | Pelanggan reguler studio |
| **Pelanggan (Member)** | Sinta Dewi | `sinta.dewi@sora.example.test` | Riwayat kelas dan audit absensi |

---

## Dokumentasi API dan Pengujian

- **Swagger UI Interaktif:** `http://127.0.0.1:3000/api/docs`
- **Spesifikasi OpenAPI JSON:** `http://127.0.0.1:3000/api/docs-json`

### Menjalankan Pengujian Mandiri

```powershell
# Jalankan unit test logika bisnis di backend (18/18 harus pass)
cd backend
npm test

# Jalankan linter kode backend dan frontend
npm run lint
cd ../frontend
npm run lint

# Kompilasi frontend produksi
npm run build
```

---

## Deployment VPS dan CI/CD

Platform terintegrasi langsung dengan pipeline CI/CD otomatis berbasis **GitHub Actions**:

- **Domain Publik Live:** `https://wellness.anthonywj.my.id`
- **Host VPS:** Linux Ubuntu Server (`43.157.248.201`)
- **Workflow:** [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
- **Runner:** Self-Hosted Runner `vps-wellness`
- **Mekanisme Otomatis:**
  Setiap `git push origin main` secara otomatis mengeksekusi sinkronisasi kode di VPS, kompilasi frontend Vite, kompilasi backend NestJS, migrasi skema database PostgreSQL, reload proses PM2, dan pembaruan aset statis Nginx.

---

## Struktur Direktori

```text
wellness/
├── .github/
│   └── workflows/            # Pipeline CI/CD otomatis ke server VPS
│       └── deploy.yml
│
├── backend/                  # Layanan NestJS dan Logika Bisnis Terpusat
│   ├── migrations/           # Skema dan skrip migrasi database PostgreSQL (001 - 015)
│   ├── scripts/              # Skrip setup demo, rotasi sandi, dan sinkronisasi
│   ├── src/                  # Modul fitur backend modular
│   │   ├── attendance/       # Presensi matras 2-tier dan verifikasi tiket meja depan
│   │   ├── auth/             # Sesi HttpOnly PostgreSQL, CSRF, dan RBAC modular
│   │   ├── booking/          # Mesin reservasi, hold 15 menit, dan pembatalan
│   │   ├── catalog/          # Katalog kelas dan generator jadwal mingguan 180 hari
│   │   ├── content/          # CMS draf/publish dan pustaka media terproteksi
│   │   ├── events/           # Event komunitas luar studio, sub-sesi, dan tiket QR
│   │   ├── finance/          # Audit transaksi, buku besar dompet, dan rekonsiliasi
│   │   ├── health/           # Rekam kesehatan berizin dan isolasi snapshot kelas
│   │   ├── lockers/          # Matriks loker Japandi dan auto-release otomatis
│   │   ├── membership/       # Profil member, unggah avatar, dan kuota prorata
│   │   ├── payments/         # Integrasi Midtrans Snap Sandbox dan webhooks SHA-512
│   │   ├── shared/           # Database pool, guards keamanan, dan utility
│   │   └── withdrawals/      # Pengajuan tarik dana member dan persetujuan payout
│   ├── test/                 # Rangkaian unit test Node.js Test Runner
│   ├── uploads/              # Penyimpanan fisik media dan foto profil
│   └── compose.yaml          # Konfigurasi container PostgreSQL
│
├── frontend/                 # Aplikasi Web SPA React 19 + TypeScript + Vite
│   ├── public/images/        # Aset gambar dan branding studio
│   ├── src/
│   │   ├── app/              # Komponen root aplikasi dan routing
│   │   ├── features/         # Fitur per persona
│   │   │   ├── admin/        # Cockpit superadmin, RBAC dialog, loker, dan events
│   │   │   ├── coach/        # Konsol pelatih (presensi 2-tier dan agenda event)
│   │   │   ├── customer/     # Dashboard member, dompet saldo, dan upload foto
│   │   │   ├── events/       # Halaman publik pendaftaran event komunitas
│   │   │   └── public/       # Landing page, jadwal kelas publik, dan CMS viewer
│   │   ├── shared/           # Klien HTTP API, penanganan error, dan konfirmasi modal
│   │   └── styles/           # Sistem tema Japandi dan layout CSS modular
│   └── vite.config.ts        # Konfigurasi bundling Vite
│
├── AGENTS.md                 # Standar arsitektur, etika modifikasi, dan panduan tim
├── PRD.md                    # Product Requirements Document resmi
└── README.md                 # Dokumentasi panduan utama proyek
```

---

<div align="center">
  <sub>Dibuat dengan standar rekayasa perangkat lunak modern · SORA Wellness Studio</sub>
</div>
