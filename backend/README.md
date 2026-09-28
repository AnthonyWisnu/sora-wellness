# Wellness API - fondasi satu studio

## Dataset demo lokal Sora

Untuk menjelajahi semua peran dengan data yang terisi, jalankan `npm run demo:setup` setelah migrasi. Kredensial Midtrans Sandbox tidak diwajibkan: tanpa pengaturan gateway, dataset dan dashboard tetap dapat digunakan, tetapi checkout berbayar belum tersedia. Perintah ini **mengganti data aplikasi lokal** tetapi mempertahankan pengaturan Midtrans terenkripsi yang sudah ada. Ia hanya menerima PostgreSQL di `127.0.0.1:55432` dan `MIDTRANS_ENV=sandbox`, membuat cadangan database dan unggahan di `.qa/demo-backup-*`, lalu mengisi studio, akun, katalog, jadwal, CMS, media, peserta, absensi, kesehatan fiktif, serta loker. Kata sandi akun demo dibuat acak dan disimpan hanya di `.qa/demo-accounts.json` yang diabaikan Git. Pengisian data ini tidak membuat transaksi gateway sukses palsu.

Nomor kontak pribadi dapat diisi pada `.demo.local.json` (salin format dari `.demo.example.json`); berkas lokal tersebut diabaikan Git. Titik peta demo mengarah ke Fakultas Teknik Universitas Udayana di Jimbaran dan **bukan** klaim lokasi usaha Sora. Foto studio dan cerita pelanggan dalam dataset adalah ilustrasi fiktif. Setelah beberapa minggu, jalankan `npm run demo:refresh-schedule` untuk menambah sesi 45 hari mendatang tanpa menggandakan sesi atau mengubah booking. Skrip pembayaran uji nyata di frontend adalah `node scripts/demo-sandbox-fill.mjs package|class|wallet|member`; jalankan secara berurutan, memakai akun demo dari berkas lokal dan Midtrans Sandbox resmi.

Backend NestJS/TypeScript dengan PostgreSQL untuk **satu perusahaan dan satu lokasi**. React sudah terhubung ke API untuk halaman publik, autentikasi, booking, pembatalan, pembelian paket, profil dan kesehatan pelanggan, absensi pelatih, serta dashboard admin untuk katalog, paket, jadwal, akun, kebijakan, pembayaran, loker, konten publik, dan pemantauan transaksi. Booking kelas berbayar membuat transaksi Snap Midtrans Sandbox dan menahan kursi selama 15 menit. Pembelian paket memakai Snap dengan batas pembayaran 15 menit dan mulai berlaku setelah pembayaran berhasil. API menerima notifikasi Midtrans dan dapat memeriksa ulang status order. Pembatalan booking dan sesi beserta pengembalian jatah/saldo sudah dijalankan di backend.

Kode `src` dikelompokkan menurut fitur (`auth`, `catalog`, `booking`, `payments`, `membership`, `health`, `attendance`, `lockers`, `content`, `finance`); dependensi umum ada di `shared`. Tiap fitur mendaftarkan controller dan service melalui NestJS module, sementara `AppModule` menyusun modulnya. Skrip dan test mengimpor fungsi dari folder fitur terkait. Pemindahan ini tidak mengubah path HTTP atau skema database.

## Menjalankan lokal

Butuh Node.js 22, npm, dan Docker Desktop. Dari folder `backend`:

```powershell
Copy-Item .env.example .env
```

Isi `DB_PASSWORD` dan `SESSION_SECRET` (minimal 32 karakter acak), lalu samakan password dalam `DATABASE_URL`. Jangan commit `.env`.

```powershell
npm install
docker compose up -d db
npm run migrate
npm run seed
npm run dev
```

`seed` membuat satu admin, satu pelatih, pilihan paket, jenis kelas, dan sesi contoh untuk 25 hari ke depan. Kata sandi sementara admin/pelatih hanya dicetak saat seed pertama; simpan secara lokal. Saat login pertama mereka wajib mengganti kata sandi. Jalankan `npm run test`, `npm run lint`, dan, ketika server berjalan, `npm run smoke` untuk verifikasi. Jalankan `npm run smoke:payments` untuk menguji status pembayaran terlambat, kedaluwarsa, saldo, dan retry. Jalankan `npm run smoke:cancellations` untuk menguji batas pembatalan, pengembalian jatah/saldo, transaksi pending, serta pembatalan perusahaan. Jalankan `npm run smoke:packages` untuk menguji aktivasi paket saat settlement dan notifikasi duplikat. Jalankan `npm run smoke:health` untuk menguji privasi kesehatan, snapshot, absensi, serta audit koreksi. Jalankan `npm run smoke:content-lockers` untuk menguji gambar dan loker. Jalankan `npm run smoke:admin-finance` untuk menguji daftar booking, pembayaran, saldo, buku transaksi, filter, paginasi, dan hak akses admin. Smoke test memakai fixture database lokal; skrip kesehatan, paket, konten/loker, dan transaksi admin membersihkan fixturenya setelah selesai.

### Pemantauan transaksi admin

Endpoint baca khusus admin `GET /api/v1/admin/bookings`, `GET /api/v1/admin/payments`, dan `GET /api/v1/admin/wallets` mendukung `q`, `page`, dan `limit` (1-100). Booking mendukung `status`, `from`, `to` berdasarkan tanggal kelas lokal. Pembayaran mendukung `status`, `kind=class|package`, `from`, `to` berdasarkan tanggal transaksi lokal. `GET /api/v1/admin/wallets/:customerId/entries` menampilkan buku saldo pelanggan dengan `kind`, `from`, `to`, `page`, dan `limit`. Filter tanggal memakai `YYYY-MM-DD`. Respons daftar berisi `items`, `page`, `limit`, dan `total`; entri saldo juga memuat pelanggan serta saldo terkini. Nominal memakai angka rupiah bulat. Endpoint ini membaca status transaksi yang tercatat di database; pengecekan ulang ke Midtrans tetap melalui alur refresh pembayaran yang sudah tersedia.

### Konten publik, gambar, dan loker

CMS situs memakai `GET/PUT /api/v1/admin/site` untuk draf, `GET /api/v1/admin/site/preview` untuk pratinjau khusus admin, `POST /api/v1/admin/site/publish` untuk menerbitkan, dan `GET /api/v1/public/site` untuk membaca versi terbit. Simpan draf dengan `{ "expectedVersion": 1, "document": { ... } }`; publikasi memakai `{ "expectedVersion": 2 }`. Respons baca draf mengembalikan `draftVersion` dan `publishedVersion`. Versi yang sudah berubah menghasilkan HTTP 409. Editor admin mengelola profil, empat halaman publik, blok terstruktur, testimoni, FAQ, kontak, URL sematan peta, dan footer. `GET/PUT /api/v1/admin/content` tetap tersedia sebagai kontrak lama dan perubahan melalui PUT langsung diterbitkan lewat CMS.

`GET/POST /api/v1/admin/media` membaca pustaka gambar dan mengunggah satu berkas multipart dengan field `file`; `DELETE /api/v1/admin/media/:id` hanya menerima gambar yang tidak dipakai draf atau versi terbit. Unggahan divalidasi sebagai JPG/PNG/WebP maksimal 5 MB berdasarkan MIME dan tanda awal berkas. Berkas berada di direktori `MEDIA_STORAGE_DIR` (bawaan `backend/uploads`), diabaikan Git; sertakan direktori ini bersama database saat membuat cadangan. `GET /api/v1/public/studio` mempertahankan kontrak logo/foto/galeri lama; `GET /api/v1/public/media/:id` menyajikan gambar. Jalankan `npm run smoke:site` saat backend aktif untuk menguji draf privat, konflik versi, validasi URL peta, dan publikasi; fixture uji dipulihkan setelah selesai.

Admin membuat nomor melalui `GET/POST /api/v1/admin/lockers`, mencari member aktif yang belum mendapat loker melalui `GET /api/v1/admin/lockers/eligible-customers?q=`, menetapkan nomor melalui `PUT /api/v1/admin/lockers/:id/assignment`, atau melepasnya melalui `DELETE` pada path yang sama. Member membaca nomornya melalui `GET /api/v1/me/locker`. Penetapan dikaitkan ke masa paket yang aktif saat ditetapkan. Ketika masa paket itu berakhir, nomor dilepas sekalipun pelanggan sudah membeli perpanjangan; admin harus menetapkan ulang. Pelepasan diproses pada pembacaan/operasi loker dan sweep berkala. Jika fitur studio dimatikan, nomor disembunyikan dan penetapan baru ditolak.

### Midtrans Sandbox

Isi `MIDTRANS_ENV=sandbox` dan `MIDTRANS_SETTINGS_KEY` di `.env` lokal backend. Nilai `MIDTRANS_SETTINGS_KEY` harus berupa base64 dari 32 byte acak; untuk membuatnya, jalankan `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`. Simpan kunci ini selama database masih digunakan, karena Server Key yang tersimpan tidak dapat dibuka jika kunci hilang. `.env` diabaikan oleh Git.

Kredensial merchant dapat diatur melalui `PUT /api/v1/admin/payment-settings` oleh admin dengan sesi dan CSRF yang valid. Endpoint GET pada path yang sama hanya mengembalikan Merchant ID, Client Key, dan status konfigurasi; Server Key tidak pernah dikembalikan. Untuk impor awal melalui terminal, isi sementara `MIDTRANS_MERCHANT_ID`, `MIDTRANS_CLIENT_KEY`, dan `MIDTRANS_SERVER_KEY` di `.env`, jalankan `npm run import:midtrans`, lalu hapus tiga variabel tersebut dari `.env`. Server Key akan disimpan terenkripsi di PostgreSQL. Jangan menyalinnya ke frontend, contoh API, log, atau berkas yang di-commit. `POST /api/v1/admin/payment-settings/test` membuat order uji Rp10.000 untuk memeriksa koneksi.

```powershell
npm run check:midtrans
```

Perintah itu membuat order uji Rp10.000 di Sandbox dan hanya menampilkan ID order, keberhasilan token, serta hostname URL pembayaran. Perintah tersebut **tidak menyelesaikan pembayaran**. Status API Midtrans dapat mengembalikan HTTP 404 sebelum pelanggan memilih metode pembayaran di Snap; dalam kasus itu booking tetap menunggu sampai tahan kursi berakhir.

`POST /api/v1/bookings` dengan `paymentChoice: "single"` mengembalikan `payment.redirectUrl` dan `payment.snapToken` jika masih ada tagihan gateway. Klien membuka URL Snap tersebut. `GET /api/v1/bookings/:id` menampilkan status terkini, dan `POST /api/v1/bookings/:id/refresh-payment` meminta status resmi ke Midtrans setelah pelanggan kembali dari pembayaran. Midtrans dapat mengirim `POST /api/v1/webhooks/midtrans`; endpoint ini tidak memakai sesi atau CSRF, tetapi memverifikasi signature lalu meminta status langsung ke Midtrans sebelum mengubah booking. Saat uji lokal, URL HTTPS publik dapat dipasang sementara di `MIDTRANS_NOTIFICATION_URL`; backend mengirimkannya sebagai header `X-Override-Notification` hanya untuk transaksi Snap baru. Cara ini mengikuti [dokumentasi notifikasi Midtrans](https://docs.midtrans.com/docs/https-notification-webhooks) dan tidak mengubah URL merchant di dashboard. Hapus variabel itu setelah uji agar transaksi berikutnya memakai konfigurasi merchant biasa.

Untuk membatasi akses tunnel lokal, jalankan `node scripts/webhook-gateway.mjs` di terminal backend, lalu arahkan tunnel HTTPS sementara ke `http://127.0.0.1:3333`. Gateway tersebut hanya meneruskan `POST /api/v1/webhooks/midtrans` ke API lokal. Gunakan URL `https://<host-tunnel>/api/v1/webhooks/midtrans` sebagai nilai variabel di atas, lalu restart backend. Simpan URL tunnel hanya di `.env` lokal; jangan memasukkannya ke commit. Uji ini membutuhkan koneksi internet dan tunnel yang tetap berjalan sampai webhook diterima.

`POST /api/v1/me/membership-purchases` menerima `packageOptionId` dari `GET /api/v1/public/packages` dan header `Idempotency-Key` unik. Harga serta durasi disalin dari pilihan paket di backend. Paket berbayar mendapat URL Snap Sandbox dan status `pending_payment`; saldo kelas tidak dapat dipakai. Checkout disetel kedaluwarsa 15 menit. `GET /api/v1/me/membership-purchases` menampilkan riwayat, sedangkan `POST /api/v1/me/membership-purchases/:id/refresh-payment` memeriksa status resmi. Paket mulai pada tanggal lokal studio saat pembayaran berhasil. Perpanjangan tersedia mulai 30 hari sebelum akhir paket dan hanya satu paket berikutnya boleh terjadwal. Endpoint pembayaran, status, dan notifikasi yang sama menangani transaksi kelas maupun paket.

Tahan kursi yang kedaluwarsa dilepas oleh sweep tiap menit dan juga saat pelanggan meminta opsi booking, membuat booking, atau melihat saldo. Bila pembayaran sukses terlambat, backend mencoba mengonfirmasi booking hanya jika kursi dan syarat kelas masih tersedia; jika gagal, bagian yang benar-benar dibayar lewat gateway masuk saldo. Saldo yang sempat dipakai untuk booking gabungan dikembalikan ketika tahan kursi habis. Riwayat saldo tersedia di `GET /api/v1/me/wallet/entries`. Transisi terlambat dan kedaluwarsa diuji dengan fixture. Pada 26 September 2026, pembayaran kartu uji Sandbox untuk kelas mencapai status penyedia `capture`; webhook nyata melalui tunnel mengubah booking menjadi `confirmed` tanpa refresh. Pembelian paket kartu uji mencapai `capture`; tombol **Periksa status** mengaktifkan paket saat webhook tidak diatur. Status `settlement` dari bank belum diamati pada dua transaksi uji ini.

Pelanggan membatalkan booking melalui `POST /api/v1/bookings/:id/cancel`. Tepat pada batas kebijakan 24 jam termasuk terlambat; setelah kelas dimulai, pembatalan pelanggan ditolak. Pembatalan tepat waktu mengembalikan jatah atau mengkredit seluruh harga kelas satuan ke saldo. Pembatalan terlambat tetap memakai jatah/harga. Booking yang masih menunggu pembayaran hanya melepas porsi saldo yang telah ditahan; jika gateway kemudian berhasil, nilai gateway dikreditkan ke saldo tanpa menghidupkan kembali booking yang dibatalkan. Admin membatalkan sesi melalui `POST /api/v1/admin/sessions/:id/cancel`; seluruh booking aktif diproses dalam satu transaksi tanpa menerapkan batas pelanggan. Jika pelanggan sebelumnya sudah membatalkan terlambat, pembatalan sesi perusahaan juga memulihkan jatah atau biaya yang sebelumnya hangus. Respons dan detail booking menunjukkan asal pembatalan dan jumlah saldo yang dikreditkan. Pemanggilan ulang tidak menggandakan pengembalian.

Pelanggan membaca, menyimpan dengan persetujuan, dan menghapus catatan kesehatan melalui `GET/PUT/DELETE /api/v1/me/health`. Penghapusan menghapus profil, revisi, dan snapshot kelas miliknya. Pelatih memakai `GET /api/v1/coach/sessions` (opsional `?date=YYYY-MM-DD`) dan `GET /api/v1/coach/sessions/:id/participants` hanya untuk kelas yang dia ajar. Sebelum kelas dimulai, respons berisi catatan kesehatan terkini peserta yang booking-nya terkonfirmasi. Setelah kelas dimulai, respons memakai snapshot dari revisi yang berlaku pada waktu mulai kelas; pembatalan booking menghentikan akses. Snapshot yang melewati satu tahun setelah kelas dibersihkan berkala dan tidak ditampilkan lagi. Admin tidak mendapat isi kesehatan melalui endpoint peserta. Pelatih mencatat hadir/tidak hadir melalui `PUT /api/v1/coach/sessions/:id/attendance/:customerId` sejak kelas dimulai sampai 24 jam setelah selesai. Admin dapat memperbaiki absensi sesudahnya melalui path setara di `/admin/sessions`, dengan alasan wajib; `GET /api/v1/admin/sessions/:id/attendance-corrections` memuat jejak koreksi. Absensi tidak mengubah pembayaran atau jatah.

- API: `http://127.0.0.1:3000/api/v1`
- Swagger UI: `http://127.0.0.1:3000/api/docs`
- OpenAPI JSON: `http://127.0.0.1:3000/api/docs-json`
- PostgreSQL lokal: `127.0.0.1:55432`

Mekanisme login memakai sesi PostgreSQL dan cookie `HttpOnly` `SameSite=Lax`. Ambil token dari `GET /api/v1/auth/csrf`; kirim sebagai header `x-csrf-token` pada setiap POST/PATCH/DELETE. Setelah login atau pendaftaran, ambil token baru karena pengenal sesi diganti. React memakai proxy Vite `/api/v1` ke backend pada aplikasi lokal; browser mengirim cookie sesi melalui origin frontend yang sama. Klien HTTP lain memakai cookie jar. `POST /api/v1/bookings` dan `POST /api/v1/me/membership-purchases` memerlukan header `Idempotency-Key` yang unik untuk satu upaya.

### Contoh klien tanpa React

Ganti `TOKEN_DARI_RESPONS` dengan nilai `token` dari panggilan pertama. Gunakan cookie jar yang sama pada permintaan berikutnya.

```bash
curl -c cookies.txt http://127.0.0.1:3000/api/v1/auth/csrf
curl -b cookies.txt -c cookies.txt -H 'content-type: application/json' -H 'x-csrf-token: TOKEN_DARI_RESPONS' \
  -d '{"email":"pelanggan@example.com","fullName":"Ayu Lestari","password":"kata-sandi-kuat-123"}' \
  http://127.0.0.1:3000/api/v1/auth/register
curl -b cookies.txt http://127.0.0.1:3000/api/v1/public/sessions
```

Untuk paket, ambil `id` dari `GET /api/v1/public/packages`, lalu gunakan token CSRF baru setelah register/login dan kunci idempotensi yang sama bila mengulang permintaan yang gagal di jaringan:

```bash
curl -b cookies.txt http://127.0.0.1:3000/api/v1/public/packages
curl -b cookies.txt http://127.0.0.1:3000/api/v1/auth/csrf
curl -b cookies.txt -H 'content-type: application/json' -H 'x-csrf-token: TOKEN_BARU' -H 'Idempotency-Key: purchase-001' \
  -d '{"packageOptionId":"ID_OPSI_PAKET"}' \
  http://127.0.0.1:3000/api/v1/me/membership-purchases
```

## Batas fondasi saat ini

- Pendaftaran/login pelanggan, sesi, CSRF, profil, pencarian akun oleh admin, reset offline, dan otorisasi peran sudah ada. Pemeriksaan tatap muka dilakukan admin secara operasional; API mewajibkan catatan verifikasi pada reset.
- Publik dapat melihat studio, paket, jenis kelas, dan sesi. Admin dapat mengelola jenis kelas, harga pilihan paket, sesi tunggal, aturan jadwal mingguan dengan rentang hingga 180 hari, serta kebijakan. Sesi dari aturan jadwal dibuat untuk rentang yang dipilih. Sesi yang sudah dipesan tidak boleh diubah langsung; admin dapat membatalkannya melalui alur pengembalian lalu membuat sesi pengganti.
- Booking gratis dan booking dengan jatah member terkonfirmasi oleh backend. Booking berbayar membuat Snap Sandbox dan masuk `pending_payment`; pembayaran saldo penuh langsung terkonfirmasi. Pembelian paket berbayar juga membuat Snap dan mengaktifkan masa member hanya setelah status pembayaran resmi berhasil.
- Harga, jendela jadwal, cutoff dua jam, akses tingkat kelas, kuota bulan sesi, serta kapasitas diperiksa di backend. Permintaan booking mengunci baris pelanggan dan sesi dalam transaksi PostgreSQL untuk mencegah kuota/kursi terpakai ganda.
- Fungsi tanggal akhir paket dan jatah prorata dipakai pada aktivasi pembelian dan perpanjangan paket. Checkout kartu Sandbox sampai `capture`, webhook HTTPS nyata untuk booking, dan refresh manual untuk paket telah diuji pada 26 September 2026. Status `settlement` dan pengiriman webhook saat tunnel terputus masih perlu diuji bila ingin menutup semua variasi provider.
- Profil pelanggan, kesehatan opsional dengan persetujuan, snapshot kelas, daftar peserta pelatih, absensi, dan koreksi admin sudah memakai API. Akses kesehatan diuji dari peran berbeda; admin hanya melihat nama dan status absensi peserta.

Rincian produk dan aturan akhir ada di [PRD.md](../PRD.md).
