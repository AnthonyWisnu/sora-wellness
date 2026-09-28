# Panduan Agen - Platform Wellness

Panduan ini menetapkan cara mengubah repository. [PRD.md](PRD.md) adalah sumber kebutuhan, aturan bisnis, kriteria penerimaan, serta matriks status implementasi. [README.md](README.md) adalah panduan clone dan penggunaan lokal. Jangan menyimpulkan bahwa semua kebutuhan PRD sudah diuji hanya karena ada implementasinya.

## Konteks produk saat ini

- Aplikasi versi pertama melayani **satu studio dan satu lokasi**. Multi-perusahaan, isolasi tenant, pendaftaran perusahaan, operator platform, penggunaan kredensial produksi, dan deployment produksi belum dibangun.
- Frontend React/TypeScript dan backend NestJS/TypeScript memakai API yang sama. React tidak boleh memiliki autentikasi, booking, pembayaran, atau data demo simulasi yang memintas API.
- API harus bebas dari ketergantungan teknologi UI. Klien lain seperti Postman, curl, PHP, Next.js, atau Astro harus tunduk pada aturan backend yang sama.
- Dashboard memiliki navigasi per peran dalam shell bersama. Jaga sidebar, header, konten, tabel/daftar, dialog form, dan tampilan mobile tetap konsisten serta mudah dibaca; jangan menyelesaikan ruang kosong dengan menaruh seluruh form panjang permanen di satu kolom.

## Sumber kebenaran dan perubahan keputusan

- Bedakan kebutuhan **Diputuskan**, **Asumsi prototipe**, dan **Terbuka** sebagaimana didefinisikan di PRD.
- Jangan mengunci perilaku backend yang masih **Terbuka**. Tanyakan pemilik proyek untuk keputusan yang memang memengaruhi perilaku; lanjutkan pekerjaan independen.
- Instruksi terbaru pemilik proyek yang mengubah produk mengalahkan keputusan lama. Perbarui PRD dalam perubahan yang sama.
- Saat menyentuh fitur dengan matriks §3.2, pertahankan statusnya akurat: bedakan tersedia di kode, diuji lokal, dan telah diuji terhadap layanan Sandbox.

## Arsitektur repository

- Backend: NestJS, TypeScript, PostgreSQL. Modul fitur berada di `backend/src/`: `auth`, `catalog`, `booking`, `payments`, `membership`, `health`, `attendance`, `lockers`, `content`, dan `finance`; utilitas/akses database bersama berada di `shared`.
- Frontend: React + TypeScript, dikelompokkan di `frontend/src/features/`: `public`, `auth`, `booking`, `customer`, `coach`, `admin`, dan `dashboard`. Komponen shell dan navigasi bersama untuk role dashboard berada di `features/dashboard`.
- API berversi di `/api/v1`; Swagger UI di `/api/docs`; OpenAPI JSON di `/api/docs-json`. Perubahan endpoint, autentikasi, respons, atau error harus tetap konsisten dengan frontend, dokumentasi API, dan contoh request.
- Migrasi skema PostgreSQL ada di `backend/migrations/`. Jangan mengubah database lewat asumsi UI; perubahan skema harus melalui migrasi dan tetap kompatibel dengan seed serta test.

## Aturan bisnis dan keamanan

- Status member berasal dari masa aktif langganan pelanggan; jangan membuat role akun `member`. Paket berakhir tidak menghapus akun, profil, histori booking, pembayaran, atau saldo.
- Semua pemeriksaan peran, sesi, tingkat kelas, masa paket, jatah, kapasitas, harga, pembayaran, pembatalan, loker, dan saldo dilakukan di backend. Jangan mempercayai hasil perhitungan frontend.
- Gunakan zona waktu lokal studio (`Asia/Makassar` pada data contoh) untuk tanggal bisnis; simpan waktu kejadian tanpa ambiguitas. Uang disimpan sebagai integer IDR.
- Saldo adalah buku transaksi yang dapat ditelusuri. Booking, kapasitas, kuota, pembayaran, webhook, retry, dan pengembalian harus idempoten serta aman terhadap request paralel.
- Autentikasi memakai sesi tersimpan di PostgreSQL, cookie `HttpOnly` `wellness.sid`, dan proteksi CSRF untuk mutasi. Klien API mempertahankan cookie jar dan mengambil token baru dari `GET /api/v1/auth/csrf` setelah login/registrasi.
- Nilai Server Key Midtrans, `SESSION_SECRET`, `MIDTRANS_SETTINGS_KEY`, password, cookie sesi, dan data pribadi tidak boleh masuk source, frontend, screenshot publik, log, atau Git. README boleh menjelaskan lokasi file kredensial lokal tanpa menyalin nilainya. Kredensial Sandbox diatur per developer melalui `.env` lokal atau dashboard admin; jangan memakai kredensial milik pemilik proyek.
- Batasi isi kesehatan pada pelanggan pemilik dan pelatih yang mengajar sesi terkait. Jangan kirim isi kesehatan pada dashboard admin, endpoint publik, atau respons peserta yang tak berwenang.
- Terapkan integrasi Midtrans sesuai dokumentasi resminya. Sandbox saja untuk demo; jangan mengklaim settlement/status yang belum diamati.

## Seed dan data demo lokal

- `backend/scripts/demo-setup.ts` (`npm run demo:setup`) membuat dataset lengkap Sora yang seluruh identitas dan data pribadinya fiktif. Sandi sembilan akun dibuat acak dan disimpan lokal di `backend/.qa/demo-accounts.json`.
- `.qa/` sengaja diabaikan Git karena berisi sandi, backup database/unggahan, screenshot, laporan, dan state uji. Jangan memindahkan sandi seed ke README atau commit.
- Seed penuh hanya boleh berjalan pada PostgreSQL `localhost` port `55432`, mode nonproduksi, dengan `MIDTRANS_ENV=sandbox`. Ia membuat backup tetapi mengganti data aplikasi lokal. Pastikan target database benar sebelum menyarankannya atau menjalankannya; jangan jalankan sebagai langkah verifikasi biasa.
- Seed demo tidak memerlukan kredensial gateway untuk mengisi dataset. Checkout gateway baru tersedia setelah developer mengatur merchant Sandbox-nya sendiri.
- `backend/scripts/seed.ts` (`npm run seed`) adalah seed dasar terpisah; ia mencetak sandi akun awal ke terminal satu kali. Jangan jalankan seed dasar dan seed penuh berurutan tanpa memahami efek masing-masing.
- `npm run demo:refresh-schedule` memperbarui jadwal seed tanpa menjalankan reset penuh.
- `npm run demo:rotate-passwords` merotasi sandi sembilan akun demo lokal tanpa reset data; ia menghapus sesi akun tersebut. Jalankan hanya pada database demo lokal port `55432` dengan Midtrans Sandbox.
- Pertahankan source test di Git. Abaikan hanya hasil/generated artifacts seperti screenshot, trace, report, coverage, log, backup, dan fixture sementara; jangan mengabaikan source test.

## MCP pembayaran uji lokal

- Server MCP di `backend/scripts/mcp-wellness/` memakai API wellness pada loopback dan akun pelanggan demo lokal. Ia tidak memakai Server Key langsung. Jangan sambungkan MCP ke backend produksi atau mengirim sandi lewat argumen proses.
- `npm run smoke:mcp-wellness` memeriksa koneksi dan pembacaan jadwal. `node dist/scripts/mcp-wellness/smoke.js --checkout` membuat checkout Sandbox berbayar dan membatalkan booking pending; jalankan hanya jika mutasi data uji memang dikehendaki.
- Pembatalan paket pending memakai Midtrans Cancel API hanya setelah provider melaporkan `pending`; transaksi Snap yang belum dimulai dibiarkan kedaluwarsa. Refund gateway belum tersedia.

## Praktik perubahan kode

- Pertahankan modularitas: file satu fitur tinggal bersama, UI menggunakan komponen bersama bila pola benar-benar berulang, dan tanggung jawab komponen dibuat jelas. Hindari file raksasa atau abstraksi generik yang tidak dipakai ulang.
- Untuk layar pengelolaan admin, utamakan daftar lebar dengan filter/paginasi dan form tambah/edit dalam dialog/drawer sesuai pola komponen `AdminDialog`; tampilkan error, loading, dan konfirmasi aksi destruktif.
- Dashboard harus tetap responsif. Sidebar dapat digulir bila navigasinya melampaui tinggi layar, tetapi scrollbar mesti menyatu dengan tema; menu mobile harus tetap dapat dibuka, ditutup dengan keyboard, dan tidak menutupi navigasi keyboard.
- Perubahan UI tidak boleh mengubah aturan produk atau memalsukan data. Gunakan seed fiktif dan API aktual.
- Jangan menambah dependensi sebelum memeriksa apakah kemampuan tersebut sudah ada di stack.

## Perintah dan verifikasi

Jalankan perintah dari folder aplikasi terkait:

| Tujuan | Backend (`backend/`) | Frontend (`frontend/`) |
| --- | --- | --- |
| Build | `npm run build` | `npm run build` |
| Lint | `npm run lint` | `npm run lint` |
| Unit/integration test | `npm test` | Belum ada perintah unit test di package scripts |
| Migrasi lokal | `npm run migrate` | - |
| Test smoke umum | `npm run smoke` | - |
| Smoke terarah | `npm run smoke:payments`, `smoke:cancellations`, `smoke:packages`, `smoke:health`, `smoke:content-lockers`, `smoke:admin-finance`, `smoke:site` | `npm run smoke:live`, `smoke:health`, `smoke:admin`, `smoke:content-lockers`, `smoke:admin-finance`, `smoke:site`, `smoke:dashboard` |
| Format | - | `npm run format` / `npm run format:check` |

Smoke test live dapat memerlukan backend, frontend, Edge, atau fixture database. Baca script target sebelum menjalankan; pastikan ia memakai database lokal dan pahami apakah fixture akan dipulihkan. Jangan jalankan `demo:setup` hanya untuk memeriksa build atau dokumentasi.

Untuk perubahan aturan bisnis, cocokkan dengan kriteria penerimaan PRD dan uji batas waktu, nominal, kapasitas, idempotensi, serta peran yang terdampak. Untuk perubahan tampilan, jalankan build/lint dan bila server lokal tersedia periksa layar pada ukuran desktop dan mobile. Jangan melaporkan test atau transaksi Sandbox yang tidak benar-benar dilakukan.

## Pelaporan

- Sebutkan file serta perintah/alur yang benar-benar diperiksa. Tandai yang belum diuji.
- Jika ada keterbatasan environment (misalnya workspace tanpa metadata `.git`, browser, atau database), katakan secara eksplisit alih-alih mengarang hasil.
- Jangan menyebut proyek siap produksi; PRD membatasi implementasi ini pada demo satu studio dan deployment belum tervalidasi.
