# Sora Wellness Studio

Platform demo wellness untuk satu studio dan satu lokasi. Proyek ini memakai API NestJS, PostgreSQL, dan aplikasi React/TypeScript. Data contoh dibuat secara lokal oleh seed script; akun dan sandi demo tidak disimpan di repository.

> **Status:** aplikasi demo untuk pengembangan dan presentasi. Pembayaran memakai Midtrans Sandbox. Jangan masukkan data pelanggan sungguhan atau deploy konfigurasi ini sebagai layanan produksi.

## Daftar isi

- [Fitur](#fitur)
- [Prasyarat](#prasyarat)
- [Clone dan konfigurasi](#clone-dan-konfigurasi)
- [Buat database dan isi dataset demo](#buat-database-dan-isi-dataset-demo)
- [Jalankan aplikasi](#jalankan-aplikasi)
- [Akun dan data demo](#akun-dan-data-demo)
- [Coba API dengan Swagger atau Postman](#coba-api-dengan-swagger-atau-postman)
- [Midtrans Sandbox](#midtrans-sandbox)
- [Perintah pengembangan](#perintah-pengembangan)
- [Struktur repository](#struktur-repository)
- [Troubleshooting](#troubleshooting)
- [Berbagi repository dengan aman](#berbagi-repository-dengan-aman)

## Fitur

- Halaman publik studio, jadwal kelas, pilihan paket, konten, dan galeri media.
- Pelanggan dapat membuat akun, mengelola profil, melihat riwayat kesehatan, booking kelas, serta melihat paket, pembayaran, saldo, dan loker.
- Pelatih dapat melihat peserta kelas yang dia ajar dan mencatat kehadiran.
- Admin dapat mengelola akun staf, kelas, sesi, jadwal berulang, paket, aturan, transaksi, loker, media, konten situs, dan pengaturan pembayaran.
- Backend menjadi sumber aturan untuk akses, kapasitas, harga, status pembayaran, pembatalan, jatah, dan saldo.
- API HTTP JSON dapat dipakai tanpa React. Swagger tersedia untuk mencoba endpoint.

Versi saat ini melayani **satu studio dan satu lokasi**. Visi multi-perusahaan di [PRD.md](PRD.md) belum diimplementasikan.

## Prasyarat

- Windows PowerShell (langkah di bawah menggunakan PowerShell), Git, dan Node.js 22.
- npm yang terpasang bersama Node.js.
- Docker Desktop aktif untuk menjalankan PostgreSQL lokal.
- Akun Midtrans Sandbox hanya diperlukan untuk menguji pembayaran gateway. Dataset demo dapat dibuat tanpa kredensial Midtrans.

Periksa instalasi:

```
node --version
npm --version
docker --version
git --version
```

## Clone dan konfigurasi

Clone repository lalu masuk ke folder proyek:

```
git clone <URL-REPOSITORY-GITHUB>
Set-Location wellness
```

Ganti <URL-REPOSITORY-GITHUB> dengan alamat repository yang dibagikan pemilik proyek.

Salin template konfigurasi backend:

```
Copy-Item backend/.env.example backend/.env
```

Buka backend/.env dan atur nilai lokal berikut:

| Variabel | Nilai lokal |
| --- | --- |
| DB_USER | wellness atau nama pengguna PostgreSQL pilihan Anda |
| DB_PASSWORD | Sandi acak yang Anda buat sendiri |
| DB_NAME | wellness |
| DATABASE_URL | postgresql://your-user:your-password@127.0.0.1:55432/your-database, konsisten dengan nilai di atas |
| PORT | 3000 |
| SESSION_SECRET | Nilai acak rahasia minimal 32 karakter |
| FRONTEND_ORIGIN | http://127.0.0.1:5173 |
| NODE_ENV | development |
| MEDIA_STORAGE_DIR | uploads |
| MIDTRANS_ENV | sandbox |
| MIDTRANS_SETTINGS_KEY | Base64 dari 32 byte acak; simpan nilai ini selama database dipakai |

Buat nilai acak dari PowerShell. Jalankan setiap baris sendiri, lalu salin nilainya ke .env:

```
node -e "console.log(require('node:crypto').randomBytes(24).toString('base64url'))"
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Gunakan hasil pertama sebagai DB_PASSWORD, hasil kedua sebagai SESSION_SECRET, dan hasil ketiga sebagai MIDTRANS_SETTINGS_KEY. Pastikan DATABASE_URL memakai user, sandi, host, port, dan nama database yang sama. Nilai base64url aman digunakan langsung pada URL database.

Jangan commit backend/.env. Jika tidak menguji peta/kontak demo, .demo.local.json boleh tidak dibuat. Bila perlu, salin backend/.demo.example.json ke backend/.demo.local.json lalu isi nomor telepon, WhatsApp, dan tautan peta lokal.

## Buat database dan isi dataset demo

> Perintah demo:setup akan menghapus lalu membuat ulang data aplikasi di database lokal port 55432. Sebelum menjalankannya, pastikan database tersebut khusus untuk proyek Wellness. Script membuat cadangan database dan unggahan ke backend/.qa/demo-backup-*, tetapi sebaiknya jangan arahkan konfigurasi ke database penting.

> Bila hanya ingin seed dasar, jalankan npm run seed sebagai pengganti npm run demo:setup. Seed dasar membuat admin/pelatih awal, beberapa paket/kelas, dan jadwal contoh; sandi acak dicetak satu kali ke terminal. Jangan jalankan kedua seed berurutan pada database yang sama.

```
Set-Location backend
npm install
docker compose up -d db
npm run migrate
npm run demo:setup
```

demo:setup mengisi data fiktif untuk mencoba dashboard, termasuk:

- 9 akun demo: admin, dua pelatih, dan enam pelanggan.
- Jenis kelas pemula dan lanjutan, jadwal kelas lampau/mendatang, serta beberapa booking.
- Catatan kesehatan dan absensi contoh yang seluruhnya fiktif.
- Pilihan paket, saldo, loker, dan konten halaman publik.
- Foto studio ilustratif yang tersedia di frontend/public/images/.

> Dataset ini tidak membutuhkan Midtrans Sandbox yang telah dikonfigurasi. Dashboard tetap dapat dibuka, tetapi pembayaran berbayar melalui gateway belum tersedia sampai Anda memasukkan kredensial Sandbox sendiri (lihat [Midtrans Sandbox](#midtrans-sandbox)).

Setelah berhasil, script mencetak lokasi berkas akun demo:

```
backend/.qa/demo-accounts.json
```

Berkas tersebut berisi sandi acak yang cocok dengan database lokal yang baru dibuat. Folder .qa diabaikan Git; **jangan mengunggah atau mengirimkan berkas ini**. Setiap orang harus menjalankan seed sendiri dan menggunakan akun hasil seed masing-masing. Menyalin berkas akun ke komputer teman tidak akan membuat akun itu berlaku pada database teman.

Dataset demo dapat diperbarui tanpa membuat ulang booking melalui:

```
npm run demo:refresh-schedule
```

## Jalankan aplikasi

Jalankan backend di terminal PowerShell pertama dari folder backend:

```
npm run dev
```

Jalankan frontend di terminal kedua dari root proyek:

```
Set-Location frontend
npm install
npm run dev
```

Buka http://127.0.0.1:5173 di browser. Frontend memakai proxy Vite untuk meneruskan /api/v1 ke backend lokal.

| Layanan | Alamat |
| --- | --- |
| Aplikasi React | http://127.0.0.1:5173 |
| API | http://127.0.0.1:3000/api/v1 |
| Swagger UI | http://127.0.0.1:3000/api/docs |
| OpenAPI JSON | http://127.0.0.1:3000/api/docs-json |
| PostgreSQL | 127.0.0.1:55432 |

Untuk login, gunakan email dan sandi yang tercatat di backend/.qa/demo-accounts.json. Seed demo mengatur sandi acak baru tiap kali dataset dibuat ulang.

## Akun dan data demo

Gunakan email berikut bersama sandi hasil seed lokal. **Sandi tidak sama untuk semua instalasi dan memang tidak ditulis di GitHub.** Setelah menjalankan `npm run demo:setup`, buka file `backend/.qa/demo-accounts.json` dari folder utama proyek. Cari baris dengan email yang ingin dipakai, lalu salin nilai `password` dari objek akun itu.

| Peran | Email login | Cara mendapatkan sandi |
| --- | --- | --- |
| Admin | admin@sora.example.test | Nilai `password` untuk email ini di `backend/.qa/demo-accounts.json` |
| Pelatih | nadia@sora.example.test, arya@sora.example.test | Cari masing-masing email di `backend/.qa/demo-accounts.json` |
| Pelanggan | ayu.lestari@sora.example.test, dimas.saputra@sora.example.test, lila.mahendra@sora.example.test, maya.kirana@sora.example.test, raka.pratama@sora.example.test, sinta.dewi@sora.example.test | Cari email yang ingin dipakai di `backend/.qa/demo-accounts.json` |

Cara masuk: jalankan kedua server, buka `http://127.0.0.1:5173`, pilih **Masuk**, lalu masukkan email dan sandi dari file tersebut. Jika file belum ada, jalankan seed penuh dari folder `backend` dengan `npm run demo:setup`; seed ulang mengganti dataset dan semua sandinya. File berada di `backend/.qa/` relatif terhadap folder utama proyek dan sengaja diabaikan Git, jadi setiap teman membuat sandi lokal sendiri saat menjalankan seed.

> Semua data, alamat, catatan kesehatan, transaksi, foto, serta testimoni yang dihasilkan untuk seed adalah ilustrasi fiktif. Jangan gunakan sebagai informasi studio sungguhan.

### Menemukan akun demo

Setelah `npm run demo:setup` selesai, buka `backend/.qa/demo-accounts.json` dengan editor teks. Di dalamnya ada nama, peran, email, dan sandi acak untuk semua akun demo. File ini dibuat di komputer Anda, sengaja tidak ada di GitHub, dan berubah setiap kali seed penuh dijalankan. Untuk seed dasar (`npm run seed`), simpan kredensial yang dicetak di terminal saat seed pertama berjalan.

## Coba API dengan Swagger atau Postman

API bisa dicoba tanpa aplikasi React. Pastikan database sudah di-migrate dan backend menyala (`npm run dev` dari folder `backend`). Untuk penggunaan pertama, buka Swagger UI:

**http://127.0.0.1:3000/api/docs**

Swagger menampilkan endpoint berdasarkan kelompok, skema input, dan contoh respons. Buka kelompok `public` dan coba `GET /api/v1/public/sessions` atau `GET /api/v1/public/packages`; endpoint baca publik tidak memerlukan login. Tekan **Try it out**, lalu **Execute**.

Untuk memakai Postman:

1. Buat collection baru dan pilih **Import**.
2. Masukkan URL `http://127.0.0.1:3000/api/docs-json` (atau simpan respons OpenAPI JSON lalu impor file tersebut). Postman akan membuat request dari spesifikasi API.
3. Atur base URL ke `http://127.0.0.1:3000/api/v1` dan gunakan request `GET /public/sessions` untuk uji pertama.
4. Request yang butuh login memakai cookie sesi `wellness.sid`. Pastikan Postman mengaktifkan cookie jar untuk `127.0.0.1`, dan gunakan host yang sama pada semua request; jangan berganti antara `localhost` dan `127.0.0.1`.

#### Login akun seed dan menguji endpoint terlindungi

Untuk request terlindungi, gunakan Postman: Swagger cocok untuk membaca spesifikasi dan mencoba GET publik, sedangkan alur login ini perlu mengirim cookie sesi serta header CSRF secara manual. Jalankan urutan berikut di Postman dengan cookie jar yang sama:

1. Kirim `GET /api/v1/auth/csrf`. Simpan nilai `token` dari respons JSON.
2. Kirim `POST /api/v1/auth/login` dengan header `x-csrf-token: <token>` dan JSON body, misalnya `{"email":"admin@sora.example.test","password":"<sandi-dari-demo-accounts.json>"}`.
3. Pastikan cookie `wellness.sid` yang diterima tersimpan. Login mengganti sesi, jadi ambil token CSRF baru dengan `GET /api/v1/auth/csrf` setelah login.
4. Panggil endpoint terlindungi memakai cookie sesi yang sama. Untuk setiap request `POST`, `PUT`, `PATCH`, atau `DELETE`, kirim header `x-csrf-token` dari token sesi terbaru.

Contoh endpoint setelah login admin: `GET /api/v1/admin/accounts`. Coba juga `GET /api/v1/coach/sessions` setelah login pelatih, atau `GET /api/v1/me/profile` setelah login pelanggan. Hak akses tetap mengikuti peran akun; endpoint admin akan menolak akun pelanggan/pelatih.

Respons `403 Token CSRF tidak valid` biasanya berarti header CSRF hilang/kedaluwarsa atau cookie sesi tidak ikut terkirim; ambil token baru dan pastikan host tetap `127.0.0.1`.

Jangan memasukkan sandi akun demo atau cookie sesi ke screenshot, issue, log, atau GitHub. Nilai di file akun hanya berlaku pada database lokal yang membuatnya.

## Midtrans Sandbox

Midtrans bersifat opsional untuk membuka aplikasi dan menjelajahi dataset. Untuk menguji checkout:

1. Buat/akses akun merchant Sandbox Midtrans milik Anda sendiri.
2. Isi MIDTRANS_ENV=sandbox dan MIDTRANS_SETTINGS_KEY di backend/.env.
3. Salin MIDTRANS_MERCHANT_ID, MIDTRANS_CLIENT_KEY, dan MIDTRANS_SERVER_KEY Sandbox Anda ke .env.
4. Dari folder backend, jalankan npm run import:midtrans.
5. Hapus tiga variabel kredensial merchant dari .env setelah tersimpan. Nilai Server Key disimpan terenkripsi di database; jangan masukkan ke frontend, README, screenshot, log, atau Git.
6. Masuk sebagai admin demo, buka menu **Midtrans**, lalu pilih **Uji koneksi**.

> Jangan memakai atau meminta pemilik repository membagikan Server Key. Setiap pengembang menggunakan kredensial Sandbox miliknya sendiri. MIDTRANS_SETTINGS_KEY harus tetap sama selama database yang berisi kredensial terenkripsi masih dipakai; jika hilang, kredensial itu tidak dapat dibaca.

Pembayaran uji hanya memakai metode/kartu uji resmi Sandbox dan tidak memindahkan uang nyata. Jangan menjalankan skenario pembayaran kartu uji dengan kredensial produksi.

## Perintah pengembangan

Jalankan perintah dari folder yang sesuai (backend atau frontend):

| Tujuan | Backend | Frontend |
| --- | --- | --- |
| Build | npm run build | npm run build |
| Lint | npm run lint | npm run lint |
| Tes | npm test | — |
| Format check | — | npm run format:check |
| Format otomatis | — | npm run format |
| Seed demo penuh | npm run demo:setup | — |
| Smoke browser dashboard | — | npm run smoke:dashboard |
| Smoke manajemen admin | — | npm run smoke:admin |

Smoke test browser memerlukan backend dan frontend yang sedang berjalan, serta Microsoft Edge di Windows. Smoke test yang membutuhkan database dapat membuat fixture sementara; gunakan database lokal dan pastikan script terkait membersihkan fixture setelah selesai.

Untuk menjalankan smoke test backend tertentu, lihat scripts di backend/package.json dan dokumentasi [backend/README.md](backend/README.md). Dokumentasi frontend ada di [frontend/README.md](frontend/README.md).

## Struktur repository

| Lokasi | Keterangan |
| --- | --- |
| backend/src/ | API NestJS yang dikelompokkan berdasarkan fitur |
| backend/migrations/ | Migrasi skema PostgreSQL |
| backend/scripts/seed.ts | Seed dasar untuk pengembangan lokal |
| backend/scripts/demo-setup.ts | Dataset Sora yang lengkap dan dapat dibuat ulang |
| backend/uploads/ | Media yang diunggah saat aplikasi berjalan; tidak di-commit |
| frontend/src/ | Aplikasi React/TypeScript, fitur, dan stylesheet |
| frontend/public/images/ | Aset ilustrasi yang diperlukan halaman dan seed demo |
| PRD.md | Kebutuhan produk, aturan, dan kriteria penerimaan |
| AGENTS.md | Panduan kerja di repository |

## Troubleshooting

**Docker gagal membuka port 55432**

Pastikan tidak ada PostgreSQL lain memakai port itu. Periksa container dengan docker compose ps dari folder backend. Jangan mengganti port tanpa menyesuaikan DATABASE_URL dan pemeriksaan keamanan lokal di script demo.

**Backend tidak dapat terhubung ke database**

Pastikan Docker Desktop berjalan, docker compose up -d db sudah berhasil, dan DATABASE_URL, DB_USER, DB_PASSWORD, serta DB_NAME konsisten dengan backend/.env.

**Login demo gagal**

Pastikan backend dan database memakai dataset yang sama. Baca kredensial terbaru dari backend/.qa/demo-accounts.json; jika database baru saja di-seed ulang, sandi sebelumnya sudah tidak berlaku.

**Checkout berbayar belum tersedia**

Ini normal jika Midtrans Sandbox belum diimpor. Lengkapi langkah pada [Midtrans Sandbox](#midtrans-sandbox), lalu mulai ulang backend jika .env berubah.

**Frontend menampilkan kegagalan jaringan/CORS**

Pastikan buka alamat Vite yang sama dengan nilai FRONTEND_ORIGIN (127.0.0.1 dan localhost dianggap origin berbeda), backend aktif pada port 3000, dan proxy Vite memakai host tersebut.

## Berbagi repository dengan aman

- Commit source code, migrasi, seed script, lockfile, dokumentasi, dan aset aplikasi yang benar-benar dipakai.
- Jangan commit .env, .demo.local.json, uploads/, database dump, sandi akun demo, kredensial Midtrans, atau data pembayaran lokal.
- Seed script dan konten fiktif boleh dibagikan; kredensial akun dihasilkan ulang untuk setiap database lokal.
- Sumber test dipertahankan di repository. Hasil tes seperti screenshot, trace, report, coverage, log, dan fixture sementara diabaikan oleh .gitignore.
- Folder Referensi UI/ adalah bahan referensi kerja lokal dan tidak ikut repository.

Sebelum push pertama, periksa daftar file dengan git status --short dan pastikan tidak ada file rahasia atau hasil uji yang ikut ter-stage.
