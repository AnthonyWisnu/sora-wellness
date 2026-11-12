export type PaymentStatusResponse = {
  bookingStatus?: string
  purchaseStatus?: string
  paymentStatus?: string
  eventStatus?: string
}

export function paymentFeedback(kind: 'booking' | 'package' | 'event', status: PaymentStatusResponse) {
  if (kind === 'event' && ['registered','attended'].includes(status.eventStatus ?? '')) {
    return { terminal: true, message: 'Pendaftaran dikonfirmasi. Tiket kegiatan Anda sudah tersedia.' }
  }
  if (kind === 'event' && status.eventStatus === 'credited') {
    return { terminal: true, message: 'Pembayaran diterima dan dikreditkan ke wallet. Tiket kegiatan tidak diterbitkan. Periksa riwayat saldo Anda.' }
  }
  if (kind === 'booking' && status.bookingStatus === 'confirmed') {
    return { terminal: true, message: 'Booking dikonfirmasi. Tiket kelas Anda sudah tersedia.' }
  }
  if (kind === 'package' && status.purchaseStatus === 'paid') {
    return { terminal: true, message: 'Pembayaran paket dikonfirmasi. Lihat masa berlaku paket di akun Anda.' }
  }
  if (status.paymentStatus === 'success') {
    return {
      terminal: true,
      message: kind === 'booking'
        ? 'Pembayaran diterima, tetapi booking belum aktif. Periksa saldo dan riwayat transaksi Anda.'
        : 'Pembayaran diterima. Status paket masih perlu diperiksa melalui riwayat transaksi.',
    }
  }
  if ([status.bookingStatus, status.purchaseStatus, status.paymentStatus, status.eventStatus]
    .some(value => value && ['cancelled', 'expired', 'failed'].includes(value))) {
    return { terminal: true, message: 'Pesanan telah berakhir atau dibatalkan. Periksa riwayat sebelum membuat pesanan baru.' }
  }
  return { terminal: false, message: 'Pembayaran belum terkonfirmasi. Anda dapat memeriksa statusnya kembali.' }
}
