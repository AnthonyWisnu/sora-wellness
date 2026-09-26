# PRD — Platform Wellness Berbasis API

**Status:** spesifikasi produk dan catatan implementasi versi pertama  
**Bahasa produk:** Indonesia  
**Perusahaan pada implementasi pertama:** satu studio yoga dan pilates, satu lokasi, identitas merek sementara  
**Sumber keputusan:** percakapan dengan pemilik proyek hingga 26 September 2026

## 1. Cara membaca dokumen

Setiap aturan di dokumen ini memiliki salah satu status berikut:

| Status | Arti untuk implementasi |
| --- | --- |
| **Diputuskan** | Aturan yang sudah dipilih pemilik proyek; implementasi dan pengujian harus mengikutinya. |
| **Asumsi prototipe** | Boleh dipakai untuk tampilan dan data contoh agar prototipe dapat dinilai; bukan aturan backend yang disetujui. |
| **Terbuka** | Belum diputuskan. Tanyakan sebelum mengimplementasikan perilaku yang bergantung padanya. |

Bagian kebutuhan dan aturan bisnis mendeskripsikan perilaku produk yang disepakati. Status aktual fitur dicatat terpisah di §3.2 agar kebutuhan tidak disalahartikan sebagai bukti pengujian. Jika instruksi pemilik proyek yang lebih baru mengubah aturan, perbarui dokumen ini bersamaan dengan implementasinya.

## 2. Ringkasan produk dan ruang lingkup

### 2.1 Tujuan

**Diputuskan.** Bangun aplikasi wellness versi pertama untuk **satu perusahaan** yang memiliki halaman publik, dashboard sesuai peran, kelas, langganan, booking, pembayaran, saldo, kesehatan peserta, absensi, dan loker. Backend menjadi pemilik aturan bisnis dan menyediakan API yang dapat dipakai React maupun klien lain seperti PHP. Frontend pertama memakai React.

**Diputuskan.** Tujuan produk adalah membangun backend wellness yang dapat digunakan oleh beberapa perusahaan dengan klien UI berbeda. Implementasi versi pertama saat ini berfokus pada satu studio agar alur produk dan API dapat dijalankan serta didemokan. Pembayaran yang tersedia untuk demo memakai Midtrans Sandbox; uang nyata dan kesiapan produksi belum menjadi bagian implementasi yang tervalidasi.

### 2.2 Batas implementasi sekarang

- Implementasi versi pertama: satu perusahaan, satu lokasi, satu zona waktu perusahaan, satu manfaat keanggotaan, dan beberapa pilihan durasi serta harga paket.
- Belum ada pendaftaran perusahaan baru, pemetaan banyak perusahaan, dashboard operator platform, atau isolasi data antarperusahaan dalam implementasi saat ini.
- Perusahaan berikutnya adalah arah penggunaan ulang API dan kode. **Diputuskan sebagai arah masa depan:** satu instalasi backend bersama dengan isolasi data per perusahaan. Isolasi multi-perusahaan belum termasuk implementasi versi pertama.
- Tidak ada penagihan paket otomatis. Pelanggan memperpanjang secara manual.
- Tidak ada fitur daftar tunggu kelas yang disepakati. Jangan menambahkannya tanpa keputusan baru.

### 2.3 Ukuran keberhasilan versi pertama

1. Semua peran dapat mencoba alur utamanya melalui frontend React yang tersambung ke API.
2. Aturan booking dan uang memberikan hasil yang sama saat API dipanggil langsung tanpa React.
3. Pembayaran Sandbox dapat dimulai, diselesaikan, dan statusnya tercermin di booking atau paket melalui mekanisme backend yang aman.
4. OpenAPI dan contoh request memungkinkan pengembang lain mencoba API tanpa memahami kode React.
5. Kasus batas pada bagian 12 lolos pengujian; hasil yang belum dapat diuji dinyatakan secara terbuka.

### 2.4 Arah produk jangka panjang — belum diimplementasikan

**Diputuskan sebagai arah produk.** Pemilik proyek ingin membuat frontend baru per perusahaan, termasuk kemungkinan Next.js, Laravel/PHP, atau Astro, dengan kontrak API dan aturan bisnis yang dapat digunakan kembali. Tiap perusahaan memiliki domain, konten, akun, kelas, harga, pembayaran, saldo, dan fitur pilihan sendiri. Orang dengan email sama di dua perusahaan tidak otomatis berbagi akun, profil, atau saldo. Perusahaan berikutnya memakai satu instalasi backend bersama; isolasi data dan kredensial gateway per perusahaan harus ditegakkan di backend, sedangkan pemilik proyek sebagai operator menentukan fitur yang tersedia. **Tidak satu pun kemampuan multi-perusahaan ini dinyatakan sudah ada dalam implementasi satu perusahaan sekarang.**

## 3. Teknologi, lingkungan, dan tahapan

| Komponen | Keputusan |
| --- | --- |
| Frontend pertama | React + TypeScript, bahasa Indonesia, responsif pada ponsel dan desktop. |
| Backend | NestJS + TypeScript, API HTTP JSON. |
| Database | PostgreSQL. |
| Dokumentasi API | OpenAPI dengan contoh request dan respons. |
| Pembayaran pertama | Midtrans Snap Sandbox, dipanggil sungguhan dari backend. |
| Zona waktu perusahaan contoh | `Asia/Makassar`; rancangan waktu tidak mengunci semua perusahaan masa depan ke zona ini. |
| Deploy produksi | Belum diimplementasikan atau divalidasi. VPS Linux adalah kemungkinan lingkungan penggunaan kelak, bukan bukti kesiapan atau kapasitas produksi. |

### 3.1 Tahapan pelaksanaan

Urutan berikut adalah riwayat tahapan proyek, bukan daftar fitur yang masih harus dimulai:

1. **Prototipe frontend — selesai dan telah ditinjau.** Prototipe dipakai untuk memilih arah tampilan. Login, booking, atau pembayaran simulasi tidak menjadi bagian aplikasi yang berjalan.
2. **Fondasi API — telah diimplementasikan untuk satu perusahaan.** Mencakup sesi autentikasi, otorisasi peran, katalog, jadwal, paket, booking, jatah, dan kontrak OpenAPI.
3. **Pembayaran dan modul lanjutan — telah diimplementasikan pada cakupan versi pertama.** Mencakup Midtrans Sandbox, saldo, pembatalan, konten, kesehatan, absensi, loker, dan operasi admin.
4. **Integrasi dan demo — aplikasi React saat ini memakai API.** Skenario yang belum diverifikasi tetap dicatat sebagai belum diuji dan tidak boleh diasumsikan lulus hanya karena endpoint atau layar tersedia.

Urutan ini tidak berarti fitur tahap berikutnya opsional: seluruh fitur inti pada dokumen ini dituju sebagai hasil akhir tugas. Revisi prioritas hanya melalui keputusan baru dari pemilik proyek.

**Status implementasi saat ini:** tahap prototipe visual telah berakhir. React hanya menjalankan aplikasi yang terhubung ke API; jalur `/?demo=1`, login simulasi, booking simulasi, dan pembayaran simulasi telah dihapus. Struktur kode frontend dan backend dikelompokkan menurut fitur untuk pemeliharaan. Pada 26 September 2026, checkout kartu uji Midtrans Sandbox mencapai status `capture`: webhook HTTPS publik mengonfirmasi booking kelas, dan pemeriksaan status manual mengaktifkan paket. Status `settlement` dari penyedia belum diamati dalam uji tersebut. Lihat matriks implementasi berikut untuk membedakan fitur yang sudah ada dari verifikasi alurnya.

### 3.2 Status fitur yang diimplementasikan

Status ini mencatat keberadaan fitur di kode dan batas verifikasi yang diketahui. **Tersedia** tidak otomatis berarti seluruh variasi kasus penerimaan sudah lulus; gunakan bukti test atau alur demo terkait sebelum mengklaimnya terverifikasi.

| Area | Status implementasi | Batas atau catatan verifikasi |
| --- | --- | --- |
| Situs publik dan CMS | Tersedia: halaman studio, jadwal, paket, konten terbit, blok terstruktur, draf/pratinjau/publikasi, media gambar, dan kontak. | Media upload dibatasi tipe/ukuran; konten demo bukan klaim usaha nyata. |
| Autentikasi dan akun | Tersedia: pendaftaran pelanggan tanpa verifikasi email, login/logout sesi PostgreSQL, CSRF, ganti sandi, pembuatan staf, pencarian akun, reset offline dengan sandi sementara sekali tampil dan audit. | Akun seed penuh memakai sandi acak lokal di `backend/.qa/demo-accounts.json`; jangan menerbitkannya ke repository. |
| Katalog, sesi dan jadwal | Tersedia: tiga tingkat kelas, CRUD katalog/sesi, jadwal berulang hingga 180 hari, pengecualian/pembatalan, dan konfigurasi kebijakan. | Sesi yang sudah punya booking mengikuti aturan batal lalu buat pengganti. |
| Booking dan keanggotaan | Tersedia: validasi kelayakan di backend, kapasitas, kuota berdasarkan bulan sesi, kelas gratis, pembelian/perpanjangan paket manual, batas checkout 15 menit, dan refresh status. | Masa paket serta jatah prorata memakai aturan tanggal di §7; transaksi paket lunas tidak bisa dibatalkan/refund melalui aplikasi. |
| Midtrans dan saldo | Tersedia: Snap Sandbox, webhook terverifikasi, refresh status, checkout gabungan saldo/gateway, buku transaksi dan penanganan sukses terlambat. | Uji kartu Sandbox mencapai `capture`; status `settlement` belum diamati. Rahasia merchant harus milik masing-masing pengembang dan tidak masuk Git. |
| Kesehatan, pelatih, dan absensi | Tersedia: profil kesehatan dengan persetujuan, snapshot per sesi, pembatasan data bagi pelatih pengajar, pencatatan absensi dan koreksi admin beralasan. | Snapshot mengikuti retensi dan penghapusan pada §9.1. |
| Loker | Tersedia: pengelolaan nomor dan penetapan oleh admin, tampilan pelanggan, pelepasan otomatis saat paket yang mengikat penetapan berakhir, serta sakelar fitur. | Perpanjangan tidak menjamin nomor yang sama ditetapkan kembali. |
| Dashboard | Tersedia: shell navigasi bersama dengan sidebar per peran, topbar, area konten, menu mobile; administrasi katalog/sesi/akun memakai daftar dan dialog untuk form terkait. | Perubahan visual harus menjaga responsivitas, akses keyboard, dan pemakaian API yang sama. |
| API dan developer experience | Tersedia: HTTP JSON `/api/v1`, Swagger UI `/api/docs`, spesifikasi OpenAPI JSON `/api/docs-json`, serta contoh klien tanpa React di README backend. | Klien sesi harus menyimpan cookie `wellness.sid` dan mengambil token CSRF baru setelah login/registrasi. |
| Dataset lokal | Tersedia: `npm run demo:setup` membuat dataset Sora fiktif sembilan akun, sesi, booking, kesehatan, absensi, loker, CMS, dan media. | Seed penuh hanya menerima database lokal `127.0.0.1:55432`, nonproduksi dengan Midtrans Sandbox; seed menghapus/mengganti data aplikasi lokal dan membuat backup `.qa`. Jalankan hanya setelah memeriksa target database. |

**Di luar implementasi versi pertama:** isolasi banyak perusahaan dalam satu backend, tenant onboarding, operator platform, deployment/operasi produksi, kredensial merchant produksi, tagihan berulang otomatis, dan daftar tunggu. Jangan menggambarkannya sebagai fitur tersedia.

## 4. Peran dan hak akses

| Peran/status | Hak utama | Pembatasan utama |
| --- | --- | --- |
| Pengunjung | Melihat halaman publik, paket, dan jadwal kelas. | Harus mendaftar atau login sebelum booking; tidak melihat data peserta atau dashboard. |
| Pelanggan tanpa paket aktif | Mengelola profil dan riwayat kesehatan sendiri; booking kelas pemula; melihat booking, pembayaran, dan saldo sendiri. | Tidak dapat booking dua tingkat lanjutan. |
| Pelanggan dengan paket aktif (*member*) | Semua hak pelanggan, tiga tingkat kelas, jatah kelas bulanan, dan informasi loker yang ditetapkan. | Member adalah status langganan, bukan akun terpisah. Hak member dievaluasi pada tanggal kelas. |
| Pelatih | Melihat sesi yang dia ajar, peserta sesi tersebut, absensi, serta data kesehatan peserta yang diizinkan. | Tidak boleh melihat peserta kelas pelatih lain. |
| Admin perusahaan | Mengelola konten, staf, kelas, jadwal, kapasitas, harga, paket, aturan, loker, dan pengaturan pembayaran. | Kredensial rahasia gateway hanya tampil tersamarkan setelah disimpan. |

**Diputuskan.** Akun dan riwayat pelanggan tetap ada saat paket berakhir. Admin pertama disiapkan secara manual oleh pengelola proyek; admin perusahaan membuat akun staf lain secara manual.

### 4.1 Login dan pemulihan akun

- **Diputuskan:** pelanggan mendaftar dan masuk dengan email serta kata sandi. Login dengan nomor telepon, Google, atau penyedia identitas lain tidak diperlukan pada versi pertama. Email harus unik untuk akun di instalasi perusahaan ini; huruf besar/kecil pada email tidak membuat akun berbeda.
- **Diputuskan:** pendaftaran pelanggan tidak memerlukan verifikasi email. Pelanggan boleh langsung masuk dan booking setelah pendaftaran berhasil, selama aturan booking lainnya terpenuhi.
- **Diputuskan:** admin membuat akun pelatih/staf dengan kata sandi sementara dan menyerahkannya secara langsung. Tidak ada undangan atau tautan reset melalui email pada versi pertama.
- **Diputuskan:** pelanggan atau pelatih yang lupa kata sandi datang ke studio dan meminta reset kepada admin. Dashboard admin menyediakan pencarian/kelola akun dan aksi reset kata sandi setelah admin memeriksa identitas peminta secara tatap muka. Sistem membuat kata sandi sementara baru, hanya menampilkannya sekali kepada admin, lalu mewajibkan pengguna menggantinya saat login berikutnya. Admin tidak dapat membaca kata sandi lama. Semua sesi login lama akun tersebut dicabut dan tindakan reset dicatat dengan pelaku, akun sasaran, serta waktu; kata sandi tidak dicatat dalam log.
- **Diputuskan:** fitur menonaktifkan akun pelanggan atau pelatih tidak dibuat pada versi pertama. Reset kata sandi tidak mengubah data booking, paket, pembayaran, saldo, atau riwayat pengguna.
- **Diputuskan:** untuk reset offline, pelanggan harus menunjukkan akses langsung ke inbox dari email akun di hadapan admin. Pelatih diverifikasi sebagai staf yang dikenal admin. Bila bukti ini tidak ada, admin menolak reset. Admin tidak menyimpan salinan dokumen identitas. Pemeriksaan dan alasan reset dicatat tanpa merekam isi inbox atau kata sandi.
- **Keputusan teknis versi pertama:** login membuat sesi acak yang disimpan di PostgreSQL. Browser menerima pengenal sesi hanya melalui cookie `HttpOnly` dan `SameSite=Lax`; cookie memakai `Secure` pada HTTPS. Backend memeriksa sesi untuk setiap endpoint terproteksi dan melindungi operasi pengubah data dari CSRF. Logout dan reset kata sandi mencabut sesi terkait di server. React memanggil `/api/v1` pada origin yang sama melalui proxy saat pengembangan; klien lain dapat memakai kontrak HTTP serta cookie jar tanpa React. UI lintas domain di masa depan menggunakan proxy API pada domain UI atau meninjau ulang mekanisme autentikasi saat fitur multi-perusahaan benar-benar dikerjakan. Penyimpanan sesi bawaan dalam memori tidak digunakan.

## 5. Halaman dan alur frontend

### 5.1 Halaman publik

- Beranda menampilkan profil studio, logo, foto, teks, alamat, pilihan paket, kelas terdekat, serta tautan jadwal dan pendaftaran.
- Foto dan logo diunggah hanya oleh admin sebagai JPG, PNG, atau WebP, maksimal 5 MB per berkas. Berkas tersimpan pada server proyek; admin dapat menghapus berkas yang tidak lagi dipakai oleh konten aktif.
- Jadwal menampilkan tanggal, waktu, jenis/tingkat kelas, pelatih, kursi tersedia, dan harga satuan termasuk Rp0.
- Pengunjung dan pelanggan tanpa paket melihat sesi maksimal 7 hari ke depan; member maksimal 30 hari. Admin dapat mengubah kedua angka tersebut untuk perusahaan.
- Pengunjung yang memilih booking diarahkan ke pendaftaran atau login, lalu kembali ke kelas yang dipilih apabila sesi masih memenuhi syarat.

**Diputuskan untuk fase CMS setelah versi pertama.** Dashboard admin mengelola konten promosi empat halaman: Beranda, Jadwal, Paket, dan Kontak. Blok yang tersedia adalah judul utama, keunggulan, kelas, paket, galeri, testimoni, FAQ, ajakan booking, serta kontak/peta. Admin dapat mengubah isi, urutan, dan visibilitas blok dalam tata letak yang tetap terstruktur. Admin mengisi testimoni sendiri; aplikasi tidak menyatakan testimoni tersebut sebagai ulasan pelanggan terverifikasi. Nomor telepon, WhatsApp, email, jam operasional, tautan sosial, URL sematan Google Maps, dan teks footer dikelola dari dashboard. Formulir pesan pengunjung tidak termasuk fase ini.

**Diputuskan.** Konten disimpan sebagai draf, dapat dipratinjau hanya oleh admin, lalu diterbitkan sebagai satu versi utuh. Perubahan draf admin yang bersamaan tidak boleh saling menimpa tanpa konflik versi. Gambar yang dipakai draf atau versi terbit tidak dapat dihapus. Peta hanya menerima URL sematan Google Maps HTTPS, bukan HTML iframe mentah. Teks transaksi dan aturan akses tidak dapat diubah melalui CMS. Kelas serta paket unggulan dipilih admin, tetapi harga, kapasitas, jadwal, dan status aktif tetap berasal dari katalog serta API operasional. Bila pilihan unggulan kemudian tidak aktif, ia tidak ditawarkan sebagai unggulan.

**Diputuskan untuk tampilan public.** Beranda, Jadwal, dan Membership mengikuti export Stitch di `Referensi UI/stitch_zeira_sanctuary_desktop_landing_page`; Kontak memakai sistem visual yang sama. Urutan dan visibilitas blok tetap mengikuti CMS; urutan awal dokumen baru mengikuti desain Stitch. Harga, jatah, kelas, kursi, identitas studio, dan alamat berasal dari API/CMS. Konten contoh untuk blok keunggulan atau testimoni yang belum diisi ditandai **Konten demo** dan hilang ketika admin menambahkan konten. Klaim dan fitur di gambar referensi yang belum tersedia, seperti kelas unlimited dan pemilihan loker RFID, tidak ditampilkan sebagai kemampuan aplikasi.

**Diputuskan untuk tahap ini.** Satu studio tetap memakai kredensial Midtrans Sandbox yang dimasukkan admin di tab Midtrans. Lingkungan produksi dan isolasi beberapa merchant dalam satu backend merupakan fase tersendiri; tidak diklaim sudah tersedia.

### 5.2 Akun pelanggan

- Pendaftaran email/kata sandi tanpa verifikasi email, login, logout, penggantian kata sandi, profil, dan formulir riwayat kesehatan sederhana. Jika kata sandi sementara diberikan admin, dashboard meminta pengguna menggantinya sebelum operasi lain.
- Dashboard menampilkan status paket, tanggal aktif, jatah bulan terkait, booking mendatang dan lampau, pembayaran, saldo, serta loker bila ada.
- Alur booking memperlihatkan pilihan sumber pembayaran yang berlaku: jatah member atau pembelian satuan; pembelian satuan dapat menggunakan saldo dan membayar kekurangan melalui gateway.
- Status pending, sukses, gagal/kedaluwarsa, dan pembatalan harus terlihat jelas. UI tidak boleh menyatakan kursi pasti terpesan saat pembayaran masih pending.

### 5.3 Dashboard pelatih

- Daftar kelas yang dia ajar, detail sesi, daftar peserta terdaftar, absensi, dan data kesehatan yang diizinkan untuk peserta tersebut.
- Setelah sesi selesai, pelatih yang masih aktif tetap dapat melihat **data kesehatan yang tercatat saat sesi berlangsung** dari peserta kelas yang pernah dia ajar selama snapshot belum dihapus menurut §9.1. Perubahan profil kesehatan setelah sesi tidak ditampilkan sebagai data historis kelas tersebut.

### 5.4 Dashboard admin

- **Pola antarmuka yang disepakati dan sudah diterapkan pada halaman pengelolaan:** daftar lebar dengan pencarian/filter/paginasi, sedangkan form tambah/edit dibuka melalui dialog atau drawer. Jangan membiarkan form panjang membuat satu sisi halaman kosong dan daftar memanjang tanpa kendali.
- Semua dashboard memakai shell bersama: navigasi sidebar per peran, header halaman, area konten yang responsif, dan menu sidebar mobile. Sidebar boleh memiliki area scroll terpisah saat item navigasi melebihi tinggi layar; scrollbar mengikuti warna tema dan tidak membuat track putih yang menonjol.
- Editor konten publik; katalog jenis/tingkat kelas; jadwal berulang dan pengecualian sesi; penugasan pelatih; kapasitas; harga satuan; paket dan harga per durasi.
- Pengaturan jendela jadwal, batas booking, batas pembatalan, fitur loker, nomor dan penetapan loker, serta kredensial Midtrans Sandbox.
- Daftar booking, peserta, pembayaran, saldo, dan aksi membatalkan sesi oleh perusahaan dengan dampak pengembalian yang terlihat.
- Kelola akun pelanggan dan pelatih: cari akun, buat akun staf, serta reset kata sandi atas permintaan langsung setelah verifikasi identitas. Kata sandi sementara hanya tampil sekali dan reset tercatat untuk audit.

### 5.5 Data awal

**Diputuskan untuk implementasi saat ini.** Data studio, jenis kelas, paket, staf, dan jadwal contoh berasal dari seed database atau API. Seluruh login, booking, dan pembayaran pada React memakai backend. Tidak ada akun member terpisah atau mode transaksi simulasi pada aplikasi utama.

## 6. Kelas, sesi, dan jadwal

### 6.1 Katalog dan sesi

- **Diputuskan:** tiga tingkat kelas: pemula, lanjutan 1, lanjutan 2. Admin dapat mengatur jenis kelas, tingkat, deskripsi, pelatih, kapasitas, dan harga kelas satuan. Harga boleh Rp0.
- Jenis kelas berbeda dari **sesi**. Sesi mempunyai tanggal, waktu mulai/selesai, pelatih, kapasitas, status, dan harga yang berlaku. Perubahan katalog tidak boleh diam-diam mengubah nilai transaksi yang sudah dibuat.
- **Diputuskan:** admin dapat membuat pola jadwal mingguan dan pengecualian untuk mengubah atau membatalkan satu sesi tertentu. Sesi yang sudah memiliki booking tidak boleh dihapus tanpa menjalankan alur pembatalan perusahaan.
- **Diputuskan:** jika sesi sudah memiliki booking, admin tidak dapat langsung mengubah tanggal, waktu, pelatih, kapasitas, atau harga sesi itu. Admin membatalkan sesi sesuai alur pembatalan perusahaan, lalu membuat sesi pengganti; pelanggan memesan ulang bila menginginkannya. Nilai transaksi lama tidak diam-diam dipindahkan ke sesi baru.
- Satu perusahaan hanya memiliki satu lokasi pada implementasi pertama.

### 6.2 Jendela dan batas booking

- Jadwal publik dan pelanggan tanpa paket terlihat sampai 7 hari ke depan; member sampai 30 hari. Keduanya dapat diubah oleh admin.
- Booking ditutup **2 jam sebelum sesi dimulai** sebagai nilai awal; admin dapat mengubah jarak waktu ini. Semua pemeriksaan memakai zona waktu perusahaan.
- Tidak boleh membuat booking ketika sesi dibatalkan, sudah melewati batas booking, kapasitas tidak ada, atau pengguna tidak memenuhi syarat tingkat kelas.
- Pelanggan tanpa paket hanya boleh booking kelas pemula. Member dengan paket aktif pada **tanggal sesi** boleh booking semua tingkat. Member dapat memilih memakai jatah atau membeli kelas satuan, bahkan ketika jatah masih ada.

## 7. Langganan dan jatah kelas

### 7.1 Paket

- **Diputuskan:** hanya satu jenis manfaat keanggotaan per perusahaan. Admin menyediakan beberapa pilihan durasi dan harga, tetapi manfaat dan jatah kelas bulanan sama untuk semua durasi.
- Paket pertama mulai pada **tanggal lokal perusahaan saat pembayaran berhasil**. Perpanjangan manual yang dibayar sebelum paket lama habis mulai pada hari setelah tanggal aktif terakhir paket lama; tidak menggandakan jatah bulan berjalan.
- **Diputuskan:** checkout paket yang belum dibayar diberi waktu **15 menit** sejak transaksi Snap dibuat. Setelah waktunya lewat, backend memeriksa status resmi Midtrans; transaksi yang belum dimulai atau dinyatakan kedaluwarsa tidak membuat masa aktif paket. Pembayaran yang sudah berhasil sebelum batas tetap diproses walaupun notifikasinya datang terlambat.
- **Diputuskan:** perpanjangan manual baru boleh dibeli mulai 30 hari sebelum paket aktif terakhir berakhir dan paling banyak satu paket berikutnya boleh terjadwal. Paket yang sudah dibayar tidak memiliki fitur pembatalan atau pengembalian dana di aplikasi versi pertama. Transaksi pembelian yang masih menunggu pembayaran boleh kedaluwarsa tanpa membuat masa aktif paket.
- Paket memiliki tanggal aktif pertama dan tanggal aktif terakhir, keduanya inklusif untuk pemeriksaan pada tanggal sesi.
- Untuk durasi `N` bulan, jika tanggal padanan pada bulan tujuan ada, tanggal aktif terakhir adalah **sehari sebelum** tanggal padanan itu. Jika tanggal padanan tidak ada, tanggal aktif terakhir adalah **hari terakhir bulan tujuan**. Contoh yang diputuskan: 20 September untuk satu bulan aktif sampai 19 Oktober; 31 Januari untuk satu bulan pada tahun nonkabisat aktif sampai 28 Februari.
- Jangan mengubah aturan ujung bulan ini menjadi durasi tetap 30 hari.

### 7.2 Perhitungan jatah

- Jatah dihitung menurut **bulan kalender tempat sesi berlangsung**, bukan bulan saat booking dibuat. Jatah awal tiap bulan adalah `ceil(jatah_normal_bulanan × jumlah_hari_aktif_di_bulan / jumlah_hari_di_bulan)`.
- `jumlah_hari_aktif_di_bulan` menghitung hari unik yang dicakup paket pada bulan itu. Paket yang saling menyambung atau perpanjangan awal tidak boleh menghitung hari yang sama dua kali. Jatah tidak boleh melebihi jatah normal bulanan.
- Contoh keputusan: jatah normal 8 kelas, paket 20 September–19 Oktober menghasilkan `ceil(8 × 11/30) = 3` untuk September dan `ceil(8 × 19/31) = 5` untuk Oktober.
- Booking memakai jatah bulan sesi hanya jika paket aktif pada tanggal sesi dan jatah bulan itu masih ada. Booking yang dikonfirmasi **dengan pilihan jatah** memakai satu jatah; pembatalan tepat waktu atau pembatalan sesi oleh perusahaan mengembalikannya ke bulan sesi yang sama. Kelas Rp0 tidak memakai jatah.
- Ketika jatah habis, member masih dapat membeli kelas satuan dengan harga yang sama seperti pelanggan tanpa paket.
- **Diputuskan:** kelas dengan harga satuan Rp0 tidak mengurangi jatah member, meskipun pelanggan yang memesan adalah member.

## 8. Booking, pembayaran, pembatalan, dan saldo

### 8.1 Membuat booking

Backend harus memeriksa identitas dan sesi akun, tingkat kelas, masa paket pada tanggal sesi, jatah bulan sesi bila dipilih, batas booking, kapasitas, dan ketiadaan booking aktif ganda untuk pelanggan dan sesi yang sama. Pemeriksaan kapasitas dan pencatatan kursi harus aman saat dua orang booking bersamaan.

| Jalur | Hasil yang diputuskan |
| --- | --- |
| Harga kelas Rp0 | Booking dikonfirmasi tanpa gateway. |
| Member memilih jatah yang tersedia | Booking dikonfirmasi tanpa gateway; jatah bulan sesi terpakai. |
| Pembelian satuan tertutup penuh oleh saldo | Booking dikonfirmasi tanpa gateway; saldo berkurang dan tercatat. |
| Pembelian satuan atau paket memerlukan gateway | Backend membuat transaksi dan status pending; untuk kelas, kursi ditahan paling lama 15 menit. |

Ketika tahan kursi kedaluwarsa, kursi dilepas dan booking pending tidak dapat diperlakukan sebagai booking terkonfirmasi. Bukti pembayaran dari tampilan kembali pelanggan saja tidak cukup untuk mengonfirmasi; status harus diverifikasi oleh backend.

### 8.2 Midtrans Sandbox

- **Diputuskan:** gunakan akun Midtrans Sandbox perusahaan contoh. Admin memasukkan kredensial di dashboard; backend menyimpan Server Key secara aman, tidak mengembalikannya utuh pada API baca, dan tidak menaruhnya di frontend.
- Backend meminta token Snap dengan `order_id` unik dan jumlah IDR yang dihitung server. Status akhir ditetapkan dari notifikasi terverifikasi atau pemeriksaan status ke Midtrans, bukan dari klaim frontend.
- Proses notifikasi harus aman terhadap pengiriman duplikat, perubahan status yang datang tidak berurutan, dan retry. Setiap perubahan booking, paket, serta saldo akibat pembayaran dicatat paling banyak sekali.
- Jika gateway menyatakan pembayaran kelas berhasil **setelah** tahan kursi 15 menit habis, backend mencoba membuat booking baru hanya jika sesi masih memenuhi syarat dan kursi tersedia. Jika tidak, nilai pembayaran gateway menjadi saldo pelanggan di perusahaan itu. Pembayaran gabungan saldo mengikuti aturan pada butir berikutnya.
- **Diputuskan untuk pembayaran gabungan saldo + gateway yang terlambat:** saat tahan kursi kedaluwarsa, porsi saldo yang ditahan dilepas dan kembali tersedia. Jika gateway kemudian berhasil, backend hanya mencoba membuat booking baru apabila sesi masih layak, kursi tersedia, dan saldo pelanggan saat itu masih cukup untuk menutup porsi saldo semula. Jika salah satu syarat gagal, booking tidak dibuat dan hanya nilai yang benar-benar dibayar melalui gateway menjadi saldo pelanggan. Jangan menarik saldo lagi tanpa booking terkonfirmasi.
- **Keputusan teknis demo:** selama pengujian lokal, endpoint notifikasi Midtrans Sandbox dibuka ke internet melalui tunnel HTTPS sementara pada port publik standar, lalu URL tunnel diatur sebagai Notification URL Sandbox. Backend memverifikasi keaslian notifikasi dan tidak mempercayai permintaan hanya karena datang lewat tunnel. Bila demo kelak dijalankan di server publik, URL notifikasi dialihkan ke endpoint HTTPS server tersebut.

### 8.3 Saldo

- Saldo hanya berlaku di perusahaan asal, tidak kedaluwarsa, dan hanya dapat dipakai membeli kelas satuan; pembelian atau perpanjangan paket tidak boleh memakai saldo.
- Setiap kredit, debit, pelepasan reservasi, dan koreksi yang diperlukan harus dapat ditelusuri ke booking atau pembayaran asal. Saldo tidak boleh negatif.
- Cakupan dashboard admin versi pertama tidak mencakup penambahan saldo manual tanpa sumber booking atau pembayaran. Koreksi data bila terjadi kesalahan teknis harus dapat diaudit dan tidak menyamar sebagai transaksi pelanggan biasa.
- Bila saldo kurang, pelanggan boleh menggunakan sebagian saldo dan membayar sisanya melalui gateway. Nilai yang ditagih ke gateway dihitung di backend.
- **Diputuskan:** pelanggan memilih apakah memakai saldo pada pembelian kelas satuan. Jika memilih ya, backend memakai sebanyak mungkin saldo yang tersedia sampai sebesar harga kelas; pelanggan tidak memasukkan nominal saldo sendiri. Jika memilih tidak, seluruh harga dibayar melalui gateway.

### 8.4 Pembatalan

- Admin mengatur batas pembatalan pelanggan dengan nilai awal **24 jam** sebelum waktu mulai sesi. Perbandingan memakai waktu mulai sesi dan zona waktu perusahaan. Pembatalan tepat pada batas 24 jam termasuk terlambat; pengembalian hanya terjadi jika permintaan diterima lebih awal dari batas.
- Jika pelanggan membatalkan **sebelum** batas, jatah yang dipakai kembali ke bulan sesi. Untuk pembelian satuan yang sudah dibayar, nilai yang dibayar menjadi saldo, termasuk bagian yang sebelumnya berasal dari saldo.
- Jika pelanggan membatalkan **setelah** batas tetapi sebelum sesi dimulai, jatah tetap terpakai atau nilai pembelian satuan tidak menjadi saldo. Setelah sesi dimulai, pelanggan tidak dapat membatalkan booking; admin tetap dapat menangani pembatalan sesi perusahaan melalui alur tersendiri.
- Jika perusahaan membatalkan sesi, semua booking terkait ditangani tanpa batas pembatalan pelanggan: jatah dikembalikan atau nilai pembelian satuan menjadi saldo.
- Jika pelanggan sudah membatalkan terlambat sebelum perusahaan membatalkan sesi yang sama, jatah atau nilai pembelian satuan yang sebelumnya hangus ikut dipulihkan satu kali. Pengembalian yang sudah diberikan sebelumnya tidak diulang.
- Pembatalan booking pending yang belum dibayar tidak boleh menciptakan saldo atau pengembalian uang fiktif.

## 9. Kesehatan, absensi, dan loker

### 9.1 Riwayat kesehatan

- Pelanggan boleh mengisi, memperbarui, atau menghapus informasi kesehatan sederhana, misalnya kondisi pascamelahirkan atau riwayat patah tulang. Pengisian bersifat opsional dan memerlukan persetujuan jelas sebelum disimpan. Jangan meminta informasi yang tidak dibutuhkan untuk penyelenggaraan kelas.
- Sebelum sesi dimulai, pelatih hanya dapat melihat informasi kesehatan terkini milik peserta yang **masih terdaftar pada sesi yang dia ajar**, melalui daftar peserta atau absensi. Jika booking dibatalkan, akses berdasarkan booking itu berakhir.
- Simpan snapshot informasi yang relevan saat sesi berlangsung. Untuk sesi lampau, pelatih yang masih aktif mengajar dapat melihat snapshot sesi itu selama masih disimpan; ia tidak mendapat akses otomatis ke profil kesehatan terbaru peserta lama.
- Admin tidak boleh membaca isi riwayat kesehatan atau snapshot kelas. Snapshot dihapus paling lambat satu tahun setelah sesi, atau lebih awal ketika pelanggan meminta penghapusan data kesehatannya. Penghapusan atas permintaan pelanggan meliputi profil kesehatan terkini dan semua snapshot miliknya; catatan booking dan absensi nonkesehatan tetap ada.

### 9.2 Absensi

- Pelatih dapat menandai kehadiran peserta pada sesi yang dia ajar. Catatan harus terikat ke sesi dan peserta, serta dapat dibedakan dari status booking atau pembayaran.
- **Diputuskan:** peserta yang tidak hadir tetap memakai jatah atau pembayaran kelas. Pelatih boleh mengubah absensi sampai 24 jam setelah sesi selesai. Admin boleh mengoreksi absensi setelah itu dengan alasan yang dicatat bersama pelaku dan waktu koreksi; koreksi absensi tidak otomatis mengembalikan jatah atau pembayaran.

### 9.3 Loker

- Perusahaan boleh menonaktifkan fitur loker. Jika aktif, admin menetapkan nomor loker kepada member dan member melihat nomor tersebut di dashboard.
- Nomor yang sama tidak boleh ditetapkan kepada dua member aktif sekaligus. Saat langganan berakhir, penetapan dilepas otomatis. Perpanjangan tidak menjamin nomor lama kembali; admin menetapkan ulang.
- Pelanggan tanpa paket aktif tidak memperoleh penetapan loker baru.

## 10. Kontrak API dan data

### 10.1 Prinsip antarmuka

- API memakai HTTP JSON, versi kontrak yang jelas, kode status konsisten, validasi input, dan OpenAPI yang dapat diakses saat demo.
- Tidak ada aturan booking penting yang hanya hidup di React. Klien PHP atau alat request API harus mendapat keputusan dan pesan kesalahan yang sama untuk input yang sama.
- Autentikasi diperlukan untuk semua operasi pelanggan dan staf. Otorisasi diperiksa per endpoint dan per objek: pelanggan hanya pada datanya, pelatih hanya pada sesi yang dia ajar, admin pada sumber daya perusahaan pertama.
- Paginasi dan filter diperlukan untuk daftar yang dapat bertambah: sesi, booking, pembayaran, pelanggan, serta entri saldo.
- Identitas, nominal IDR, tanggal lokal, waktu berzona, status booking, dan status pembayaran harus mempunyai representasi yang konsisten pada OpenAPI. OpenAPI menjelaskan cookie sesi, proteksi CSRF, dan contoh penggunaan cookie jar tanpa React.

### 10.2 Kelompok endpoint yang wajib didokumentasikan

| Kelompok | Operasi minimum |
| --- | --- |
| Publik | Profil usaha, konten, paket, jenis kelas, dan jadwal terlihat. |
| Akun | Daftar, login, logout, profil sendiri, pembaruan kesehatan sendiri. |
| Pelanggan | Status paket/jatah, beli atau perpanjang paket, booking, pilih sumber bayar, riwayat booking/pembayaran, pembatalan, saldo dan buku transaksinya. |
| Pelatih | Sesi yang dia ajar, daftar peserta, snapshot kesehatan yang diizinkan, absensi. |
| Admin | Konten, staf, katalog, pola jadwal, pengecualian sesi, harga, paket, kebijakan, loker, pembayaran, serta pembatalan sesi. |
| Pembayaran | Pembuatan transaksi melalui backend, penerimaan notifikasi Midtrans, dan pembacaan status yang sudah diverifikasi. |

OpenAPI harus memuat contoh satu alur tanpa React: daftar/login → baca jadwal → buat booking → lihat status → batalkan; serta contoh pembelian paket dan callback pembayaran Sandbox. Jangan mencantumkan Server Key asli pada contoh.

### 10.3 Rancangan kontrak HTTP v1

Daftar berikut adalah **target antarmuka** untuk satu perusahaan. Nama operasi final harus dipertahankan konsisten di OpenAPI, frontend, dan contoh request; perubahan nama saat implementasi wajib memperbarui ketiganya. Semua path berada di bawah `/api/v1`. Endpoint terautentikasi menggunakan cookie sesi sesuai §4.1.

| Metode dan path | Akses | Input penting / hasil penting |
| --- | --- | --- |
| `GET /public/studio` | Publik | Profil, alamat, zona waktu, konten, logo/foto publik. |
| `GET /public/packages` | Publik | Manfaat dan jatah; daftar pilihan `durationMonths` dan `priceIdr`. |
| `GET /public/sessions` | Publik atau akun | Filter tanggal/tingkat; sesi, pelatih, kapasitas tersisa, `singlePriceIdr`, dan batas jadwal sesuai status pengguna. |
| `GET /public/sessions/{id}` | Publik atau akun | Detail sesi dan alasan bila booking tidak tersedia. |
| `POST /auth/register` dan `POST /auth/login` | Publik | Email/kata sandi pelanggan atau staf; pendaftaran pelanggan langsung aktif tanpa verifikasi email. Hasil autentikasi mengikuti mekanisme token/sesi yang dipilih. |
| `POST /auth/logout` | Akun | Mencabut sesi login saat ini di server dan menghapus cookie sesi. |
| `POST /auth/change-password` | Akun | Mengganti kata sandi sendiri; wajib sesudah masuk dengan kata sandi sementara. |
| `GET/PATCH /me` | Pelanggan/staf | Profil milik sendiri; hanya field yang diizinkan dapat diubah. |
| `GET/PUT/DELETE /me/health` | Pelanggan | Informasi kesehatan sendiri; `PUT` memerlukan persetujuan, `DELETE` menghapus profil dan snapshot milik pelanggan sesuai §9.1. Tidak menjadi endpoint baca untuk pengguna lain. |
| `GET /me/locker` | Pelanggan | Nomor loker bila fitur aktif dan masih ditetapkan pada paket yang berlaku. |
| `GET /me/membership` | Pelanggan | Status paket, tanggal aktif, jatah tiap bulan yang relevan, dan pemakaian. |
| `POST /me/membership-purchases` | Pelanggan | `packageOptionId`; hasil status pembelian dan langkah pembayaran Sandbox. |
| `GET /sessions/{id}/booking-options` | Pelanggan | Kelayakan quota/satuan, harga server, saldo tersedia, dan alasan pilihan yang tidak tersedia. |
| `POST /bookings` | Pelanggan | `sessionId` dan pilihan jatah atau satuan; hasil booking terkonfirmasi atau pending beserta waktu tahan kursi dan instruksi bayar. Penggunaan saldo mengikuti O-13. |
| `GET /bookings` dan `GET /bookings/{id}` | Pelanggan | Booking sendiri, sumber bayar, status, serta dampak pembatalan yang sudah tercatat. |
| `POST /bookings/{id}/cancel` | Pelanggan | Hasil status akhir dan pengembalian jatah/saldo sesuai batas pembatalan. |
| `GET /me/wallet` dan `GET /me/wallet/entries` | Pelanggan | Saldo terkini dan entri kredit/debit dengan referensi sumber. |
| `GET /coach/sessions` dan `GET /coach/sessions/{id}/participants` | Pelatih | Hanya sesi yang dia ajar; peserta dan akses kesehatan sesuai bagian 9. |
| `PUT /coach/sessions/{id}/attendance/{customerId}` | Pelatih | Status hadir peserta pada sesi yang dia ajar; batas edit mengikuti O-08. |
| `/admin/content`, `/admin/staff`, `/admin/class-types`, `/admin/schedule-rules`, `/admin/sessions` | Admin | Operasi baca/tulis sesuai sumber daya; pembatalan sesi memakai aksi khusus agar hak peserta dikembalikan. |
| `POST /admin/sessions/{id}/cancel` | Admin | Membatalkan sesi, menangani seluruh booking terkait, dan mencatat pengembalian jatah/saldo; sesi pengganti dibuat terpisah. |
| `GET /admin/bookings` | Admin | Daftar booking terfilter menurut nama/email, status, dan rentang tanggal kelas lokal; paginasi tanpa data kesehatan. |
| `GET /admin/payments` | Admin | Pembayaran kelas/paket terfilter menurut pelanggan/order, status, jenis, dan tanggal transaksi lokal; tanpa token Snap atau kunci gateway. |
| `GET /admin/wallets` dan `GET /admin/wallets/{customerId}/entries` | Admin | Saldo pelanggan dan buku kredit/debit beserta referensi dan saldo sesudah transaksi; pencarian, filter, serta paginasi. |
| `PUT /admin/sessions/{id}/attendance/{customerId}` | Admin | Koreksi absensi dengan alasan wajib, pelaku, dan waktu audit. |
| `GET/PUT /admin/content` | Admin | Baca/simpan nama, teks, alamat, logo, foto utama, dan urutan galeri. |
| `GET/PUT /admin/site` | Admin | Baca/simpan dokumen draf situs dengan `expectedVersion`; konflik versi menghasilkan HTTP 409. |
| `GET /admin/site/preview` dan `POST /admin/site/publish` | Admin | Baca draf untuk pratinjau, lalu terbitkan versi utuh dengan `expectedVersion`. |
| `GET /public/site` | Publik | Hanya dokumen situs yang sudah terbit; tidak memuat draf atau rahasia pembayaran. |
| `GET/POST /admin/media` dan `DELETE /admin/media/{id}` | Admin | Daftar/unggah gambar JPG/PNG/WebP maksimal 5 MB; hapus hanya gambar yang tidak dipakai konten aktif. |
| `GET /public/media/{id}` | Publik | Membaca gambar yang tersimpan dengan jenis konten yang benar. |
| `POST /admin/accounts/{id}/reset-password` | Admin | Reset setelah verifikasi identitas tatap muka; menghasilkan kata sandi sementara sekali tampil, mencabut sesi lama, dan mencatat audit tanpa rahasia. |
| `GET/POST /admin/lockers`, `GET /admin/lockers/eligible-customers`, `PUT/DELETE /admin/lockers/{id}/assignment` | Admin | Nomor, pencarian member aktif, penetapan, dan pelepasan loker dengan riwayat. |
| `/admin/package-options`, `/admin/policies`, `/admin/payment-settings` | Admin | Operasi baca/tulis konfigurasi; pembacaan kredensial rahasia selalu tersamarkan. |
| `POST /webhooks/midtrans` | Midtrans | Notifikasi mentah diverifikasi di backend; respons idempoten tanpa data rahasia. |

Respons yang memuat uang memakai satuan **rupiah bulat**, misalnya `priceIdr: 50000`, bukan string berformat `Rp50.000`. Waktu kejadian memakai timestamp berzona; tanggal aktif paket memakai tanggal lokal `YYYY-MM-DD`. ID bersifat opak bagi klien. Status booking minimal membedakan `pending_payment`, `confirmed`, `cancelled`, dan `expired`; status pembayaran internal minimal membedakan `pending`, `success`, `failed`, dan `expired`, serta menyimpan status mentah Midtrans untuk audit.

Semua kesalahan memakai bentuk konsisten yang setidaknya memuat `code`, `message`, dan `details` bila validasi field gagal. Bedakan autentikasi gagal, akses terlarang, objek tidak ditemukan, konflik kapasitas/booking ganda, dan pelanggaran aturan bisnis; jangan mengembalikan keberhasilan HTTP ketika operasi finansial atau booking sebenarnya gagal. Mutasi booking/pembayaran harus aman saat request diulang dengan identitas operasi yang sama, misalnya melalui kunci idempotensi yang dicatat backend.

### 10.4 Konsep data minimum

Perusahaan pertama dan pengaturannya; pengguna dan peran; profil pelanggan dan kesehatan; jenis kelas; pola jadwal dan sesi; paket/durasi/harga; pembelian dan masa aktif langganan; penggunaan jatah per bulan; booking dan sumber pembayarannya; transaksi Midtrans; buku transaksi saldo; absensi; loker dan riwayat penetapannya; serta konten halaman publik. Hubungan dan kendala unik harus mencegah booking aktif ganda, kursi berlebih, saldo negatif, serta penetapan loker ganda.

Desain tabel dan nama endpoint final ditentukan saat implementasi API, lalu dicatat dalam migrasi dan OpenAPI. Jangan memasukkan `company_id` ke semua tabel hanya untuk mengklaim fitur multi-perusahaan yang belum dikerjakan.

## 11. Kebutuhan nonfungsional

- **Keamanan:** kata sandi di-hash; hak akses diuji di backend; kredensial gateway dan data kesehatan dibatasi; rahasia tidak masuk commit atau log; nominal transaksi tidak dipercaya dari klien.
- **Konsistensi:** booking, kapasitas, jatah, dan saldo harus aman terhadap permintaan paralel dan retry. Webhook yang sama diproses idempoten.
- **Audit:** perubahan saldo dan status pembayaran dapat ditelusuri; perubahan kebijakan admin tidak mengubah histori transaksi yang sudah terjadi.
- **Waktu:** simpan waktu kejadian tanpa ambiguitas; tampilkan dan evaluasi tanggal bisnis menurut `Asia/Makassar` pada perusahaan contoh.
- **Observasi demo:** kesalahan API, kegagalan callback, serta pembayaran pending terlihat dalam log teknis tanpa membocorkan rahasia atau riwayat kesehatan.
- **Aksesibilitas dasar:** formulir berlabel, navigasi keyboard, kontras yang terbaca, serta status kesalahan/sukses yang dapat dipahami pada ponsel dan desktop.
- **Kapasitas:** deploy produksi dan target jumlah pengguna bukan kriteria tugas. Bila proyek kelak ditempatkan di VPS, ukur pemakaian sumber daya dan waktu respons sebelum menyatakan kapasitasnya memadai.

## 12. Kriteria penerimaan dan skenario uji

| ID | Skenario yang harus terbukti |
| --- | --- |
| AC-01 | Pengunjung melihat halaman, paket, dan jadwal 7 hari; tombol booking mengarah ke daftar/login. |
| AC-02 | Pelanggan nonmember hanya dapat booking kelas pemula; panggilan API langsung ke kelas lanjutan ditolak. |
| AC-03 | Member melihat jadwal 30 hari dan dapat booking ketiga tingkat ketika paket aktif pada tanggal sesi. |
| AC-04 | Admin mengubah jendela jadwal, batas booking, harga Rp0, kapasitas, jadwal berulang, dan satu pengecualian sesi; hasilnya terlihat di publik. |
| AC-05 | Paket mulai 20 September dengan jatah normal 8 menghasilkan jatah 3 September dan 5 Oktober; kelas Oktober mengurangi jatah Oktober meski dipesan September. |
| AC-06 | Paket satu bulan mulai 31 Januari tahun nonkabisat aktif sampai 28 Februari; perpanjangan awal tidak menggandakan jatah bulan berjalan. |
| AC-07 | Member dapat memilih memakai jatah atau membayar satuan; kelas Rp0 dan jatah tidak membuka gateway. |
| AC-08 | Dua permintaan pada kursi terakhir tidak menghasilkan dua booking terkonfirmasi; booking diblokir setelah batas 2 jam atau saat sesi dibatalkan. |
| AC-09 | Pembayaran kelas menahan kursi 15 menit. Kedaluwarsa melepas kursi; pembayaran terlambat membuat booking hanya bila masih layak dan ada kursi, selain itu menambah saldo sekali. |
| AC-10 | Midtrans Sandbox dapat memproses pembayaran; notifikasi palsu/duplikat tidak mengonfirmasi transaksi atau menggandakan saldo. |
| AC-11 | Pembelian kelas dengan saldo kurang menggunakan saldo dan menagih sisa lewat gateway; saldo tidak dapat membeli paket. |
| AC-12 | Pembatalan pelanggan sebelum batas mengembalikan jatah atau mengkredit saldo; setelah batas tidak. Pembatalan perusahaan selalu mengembalikan hak yang relevan. |
| AC-13 | Pelatih hanya melihat peserta dan snapshot kesehatan dari kelas yang dia ajar; perubahan kesehatan peserta setelah kelas tidak mengubah snapshot lama. Admin tidak dapat membaca isinya; snapshot hilang satu tahun setelah sesi atau lebih awal saat pelanggan meminta penghapusan. |
| AC-14 | Pelatih mencatat absensi; member melihat loker yang ditetapkan; loker dilepas ketika paket berakhir dan tidak dijanjikan kembali. |
| AC-15 | Semua alur inti berhasil melalui React dan request API independen sesuai OpenAPI; tidak ada respons yang memuat Server Key. |
| AC-16 | Pelanggan dapat booking tanpa verifikasi email; reset offline oleh admin mencabut sesi lama, hanya menampilkan kata sandi sementara sekali, mewajibkan penggantian, dan mencatat audit tanpa rahasia. |
| AC-17 | Hanya admin dapat mengunggah JPG/PNG/WebP hingga 5 MB dan menghapus media yang tidak dipakai; unggahan lain ditolak. |
| AC-18 | Kelas Rp0 tidak memakai jatah member; perubahan tanggal, waktu, pelatih, kapasitas, atau harga pada sesi yang sudah dipesan ditolak sampai sesi dibatalkan dan sesi pengganti dibuat. |
| AC-19 | Perpanjangan pada atau setelah 30 hari sebelum akhir paket diterima bila belum ada paket terjadwal; lebih awal atau paket terjadwal kedua ditolak. Paket lunas tidak menawarkan pembatalan/refund aplikasi. |
| AC-20 | Ketidakhadiran tetap memakai jatah/pembayaran; pelatih tidak dapat mengubah absensi setelah 24 jam, sedangkan koreksi admin memerlukan alasan dan tercatat untuk audit. |
| AC-21 | Pembatalan lebih dari 24 jam sebelum sesi mengembalikan hak; tepat 24 jam termasuk terlambat, dan setelah sesi dimulai permintaan pelanggan ditolak. |
| AC-22 | Pelanggan dapat memilih memakai saldo atau tidak; ketika dipakai, nominalnya otomatis sebesar nilai terkecil antara saldo tersedia dan harga kelas. |
| AC-23 | Setelah tahan kursi pembayaran gabungan habis, porsi saldo dilepas. Pembayaran gateway terlambat hanya mengonfirmasi booking baru bila kursi, kelayakan sesi, dan saldo saat itu masih cukup; jika tidak, nominal gateway dikreditkan sekali ke saldo tanpa booking. |
| AC-24 | Checkout pembelian paket berbayar memakai batas 15 menit di API dan Midtrans Sandbox. Paket pending yang kedaluwarsa tanpa pembayaran tidak aktif; pembayaran berhasil sebelum batas tetap dapat mengaktifkan paket meski callback diterima belakangan. |

Untuk prototipe, skenario boleh didemokan dengan data simulasi tetapi tidak boleh dilaporkan sebagai pengujian backend yang lulus. Saat implementasi, setiap perubahan keputusan harus memperbarui skenario terkait sebelum fitur dinyatakan selesai.

## 13. Daftar keputusan produk

| ID | Keputusan | Dampak pada cakupan |
| --- | --- | --- |
| O-01 | **Diputuskan sebagai arah masa depan:** satu backend bersama dengan isolasi data dan kredensial per perusahaan. Tidak dibangun pada implementasi satu perusahaan sekarang. | Bukan penghalang versi pertama. |
| O-02 | **Diputuskan:** admin mengunggah JPG/PNG/WebP maksimal 5 MB ke server proyek dan dapat menghapus berkas yang tidak dipakai. | Bukan penghalang lagi. |
| O-03 | **Diputuskan di §4.1:** email/kata sandi tanpa verifikasi email; reset offline setelah bukti akses ke inbox; sesi disimpan di PostgreSQL dan dikirim lewat cookie `HttpOnly` dengan proteksi CSRF. | Bukan penghalang lagi. |
| O-04 | **Diputuskan di §9.1:** pengisian kesehatan opsional dengan persetujuan, admin tidak membaca, pelanggan dapat menghapus, snapshot dihapus setelah satu tahun atau atas permintaan. | Bukan penghalang lagi. |
| O-05 | **Diputuskan di §8.2:** saldo dilepas saat tahan kursi habis; pembayaran gateway terlambat hanya membuat booking bila kursi dan porsi saldo masih tersedia, selain itu nominal gateway menjadi saldo. | Bukan penghalang lagi. |
| O-06 | **Diputuskan:** paket yang sudah dibayar tidak dapat dibatalkan atau dikembalikan melalui aplikasi versi pertama; transaksi pending boleh kedaluwarsa. | Bukan penghalang lagi. |
| O-07 | **Diputuskan di §8.4:** nilai awal 24 jam; tepat pada batas termasuk terlambat; setelah sesi dimulai pelanggan tidak boleh membatalkan. | Bukan penghalang lagi. |
| O-08 | **Diputuskan:** pelatih dapat mengubah absensi hingga 24 jam setelah sesi selesai; admin dapat mengoreksi dengan alasan dan audit. | Bukan penghalang lagi. |
| O-09 | **Diputuskan:** demo lokal memakai tunnel HTTPS sementara untuk endpoint callback; saat memakai server publik, gunakan URL HTTPS server. | Bukan penghalang lagi. |
| O-10 | **Diputuskan:** perpanjangan manual mulai 30 hari sebelum paket berakhir, maksimal satu paket berikutnya terjadwal. | Bukan penghalang lagi. |
| O-11 | **Diputuskan:** tidak ada fitur menonaktifkan akun pada versi pertama. Jangan membuat aksi nonaktif atau efek pembatalan otomatis pada booking/paket dari status akun. | Bukan penghalang versi pertama; tinjau ulang hanya bila ruang lingkup berubah. |
| O-12 | **Diputuskan:** ketidakhadiran tetap memakai jatah/pembayaran; koreksi absensi admin tidak otomatis mengembalikannya. | Bukan penghalang lagi. |
| O-13 | **Diputuskan di §8.3:** pelanggan memilih memakai saldo atau tidak; jika ya, backend otomatis memakai saldo maksimal hingga harga kelas. | Bukan penghalang lagi. |

Seluruh O-01 sampai O-13 telah memiliki keputusan untuk cakupan versi pertama atau arah masa depan yang dinyatakan jelas. Jika muncul kebutuhan produk baru di luar keputusan ini, catat perubahan pada bagian terkait dan kriteria penerimaannya sebelum perilaku baru dinyatakan selesai.

## 14. Rujukan integrasi yang perlu dicek saat implementasi

- [NestJS: sesi HTTP](https://docs.nestjs.com/http/session)
- [OWASP: pengelolaan sesi dan atribut cookie](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP: penyimpanan kata sandi](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Midtrans Snap: integrasi backend dan token pembayaran](https://docs.midtrans.com/docs/snap-snap-integration-guide)
- [Midtrans: notifikasi HTTP, verifikasi, dan duplikasi](https://docs.midtrans.com/docs/https-notification-webhooks)
- [Midtrans: pemeriksaan status transaksi](https://docs.midtrans.com/reference/get-transaction-status)

Rujukan ini menjelaskan API penyedia. Aturan produk pada bagian sebelumnya tetap berasal dari keputusan pemilik proyek.
