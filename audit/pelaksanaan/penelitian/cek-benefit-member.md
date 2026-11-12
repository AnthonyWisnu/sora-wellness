# Verifikasi benefit member

Tanggal: 12 November 2026. Pemeriksaan kode, browser Playwright dengan Edge, API lokal, dan database fixture terpisah. Kode aplikasi tidak diubah pada pemeriksaan ini. Hasil ini tidak memverifikasi deployment produksi.

| Benefit | Backend dan UI | Bukti |
| --- | --- | --- |
| Kelas berbayar memakai jatah paket tanpa biaya tambahan | Tersedia. Konfigurasi fixture adalah 8 jatah normal per bulan kalender. Kuota bulan parsial dihitung prorata, bukan selalu 8. Browser berhasil booking kelas Lanjutan 2 dengan kuota, wallet tidak berkurang, tagihan gateway nol, dan tidak dibuat payment intent. Saat kuota habis, pilihan kuota hilang dan permintaan API langsung ditolak HTTP 409. | `backend/src/booking/bookings.ts:94`, `backend/src/booking/bookings.ts:167`, `backend/src/membership/quota.ts`, `frontend/src/features/booking/BookingModal.tsx:59`; hasil `quotaBooking` dan `quotaExhausted` di JSON. |
| Melihat dan memesan jadwal hingga 30 hari ke depan | Tersedia. UI member menampilkan 30 hari, pelanggan reguler 7 hari. Backend menentukan batas hari berdasarkan membership aktif. Ketersediaan kursi, batas waktu booking, serta masa aktif paket pada tanggal kelas tetap berlaku. | `backend/src/booking/bookings.ts:156`, `frontend/src/features/public/PublicSessions.tsx:15`; hasil `memberWindowUi` dan `guestWindowUi`. |
| Akses kelas Pemula, Lanjutan 1, dan Lanjutan 2 | Tersedia dalam kontrak paket dan aturan eligibility. Booking kelas Lanjutan 2 oleh member berhasil. Pelanggan reguler diblokir di UI dan API dengan HTTP 409. | `backend/src/catalog/public.ts`, `backend/src/booking/bookings.ts:167`, `frontend/src/features/public/PublicPackages.tsx:84`; hasil `levelRestriction` dan `quotaBooking`. |
| Loker pribadi selama memenuhi syarat membership dan tersedia | Tersedia melalui penetapan admin, sesuai konfirmasi pemilik pada 12 November 2026. Endpoint admin memeriksa membership aktif dan ketersediaan. Nomor yang telah ditetapkan berhasil tampil di UI member. | `backend/src/lockers/lockers.ts:140`, `backend/src/lockers/lockers.ts:152`, `frontend/src/features/customer/Locker.tsx:56`; hasil `locker`. |
| Pengembalian jatah setelah pembatalan yang memenuhi batas waktu | Tersedia. Pembatalan booking uji mengembalikan pemakaian kuota dari 2 menjadi 1. Pembatalan terlambat mengikuti aturan retensi kuota backend. | `backend/src/booking/cancellations.ts`, hasil `quotaReturn`. |

## Kekurangan yang terkonfirmasi

Halaman penawaran `/membership` menjelaskan jatah bulanan dan tingkat kelas, tetapi pada render fixture yang diuji belum menjelaskan benefit booking 30 hari dan loker. Konten CMS manfaat keanggotaan pada fixture juga belum memiliki item. Bukti: `frontend/src/features/public/PublicPackages.tsx:128` dan hasil `offer` serta `cmsBenefits`.

Penetapan loker oleh admin adalah perilaku yang benar, bukan kekurangan atau kebutuhan pemilihan mandiri oleh member.

## Batas verifikasi

- Pengujian ini memeriksa prototipe lokal, bukan produksi.
- Uji lanjutan `check-schedule-window.cjs` menelusuri kelima pekan kalender di desktop 1280px dan ponsel 375px. Keduanya memiliki 30 tanggal unik, termasuk hari ini sampai hari ini + 29. Sesi pada tanggal terakhir tampil dan dialog booking dapat dibuka. API menyatakan tanggal terakhir dapat dipesan dan tanggal di luar jendela tidak dapat dipesan. Pelanggan reguler hanya memiliki 7 tanggal dan menerima HTTP 404 untuk sesi pada tanggal terakhir member. Transaksi booking pada tanggal terakhir tidak dikirim.
- Akses tingkat Lanjutan 1 diperiksa melalui kontrak paket dan aturan kode. Transaksi browser tambahan untuk tingkat tersebut tidak dijalankan dalam skrip ini.
- Penetapan serta pelepasan loker saat membership habis diperiksa melalui kode; skrip ini memverifikasi pembacaan dan tampilan penetapan yang sudah ada.
- Jatah paket bukan kelas tanpa batas. Event berbayar memiliki checkout terpisah dan tidak otomatis termasuk jatah kelas reguler.

## Bukti pengujian

- Perintah: `node audit/pelaksanaan/penelitian/check-member-benefits.cjs`, hasil PASS.
- [Hasil terstruktur](member-benefits-results.json).
- [Skrip verifikasi](check-member-benefits.cjs).
- [Screenshot booking memakai kuota](screenshots/benefit-kuota-lanjutan-2.png).
- [Hasil uji batas jadwal 30 hari](schedule-window-results.json) dan [skrip](check-schedule-window.cjs).
- [Screenshot dialog booking hari ke-30 pada ponsel](screenshots/benefit-jadwal-hari-ke-30.png).
- Data kelas, sesi, dan pemakaian tambahan dibuat khusus pada fixture dan dibersihkan oleh skrip.

Kesimpulan: fungsi benefit utama tersedia, termasuk kalender member 30 tanggal dan loker yang ditetapkan admin. Penjelasan benefit pada halaman paket belum lengkap.
