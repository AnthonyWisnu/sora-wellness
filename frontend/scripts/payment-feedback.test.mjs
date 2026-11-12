import assert from 'node:assert/strict'
import test from 'node:test'
import { paymentFeedback } from '../src/features/booking/payment-feedback.ts'

test('provider paid tidak menjanjikan tiket pada booking expired/cancelled', () => {
  for (const bookingStatus of ['expired', 'cancelled', 'pending_payment', undefined]) {
    const result = paymentFeedback('booking', { bookingStatus, paymentStatus: 'success' })
    assert.equal(result.terminal, true)
    assert.match(result.message, /booking belum aktif/)
    assert.doesNotMatch(result.message, /Tiket.*tersedia/)
  }
})

test('hanya booking confirmed menyatakan tiket tersedia', () => {
  assert.match(paymentFeedback('booking', { bookingStatus: 'confirmed' }).message, /Tiket kelas Anda sudah tersedia/)
})

test('paket lunas tidak mengklaim masa aktif dimulai sekarang', () => {
  assert.match(paymentFeedback('package', { purchaseStatus: 'paid', paymentStatus: 'success' }).message, /Lihat masa berlaku/)
})

test('pending dan respons kosong tidak ditampilkan sebagai sukses', () => {
  for (const status of [{}, { paymentStatus: 'pending' }]) {
    const result = paymentFeedback('booking', status)
    assert.equal(result.terminal, false)
    assert.match(result.message, /belum terkonfirmasi/)
  }
})

test('pembayaran event yang dikreditkan ke wallet tidak menjanjikan tiket', () => {
  const feedback=paymentFeedback('event',{paymentStatus:'success',eventStatus:'credited'})
  assert.equal(feedback.terminal,true)
  assert.match(feedback.message,/dikreditkan ke wallet/)
  assert.doesNotMatch(feedback.message,/Tiket.*tersedia/)
})

test('tiket event tersedia setelah pendaftaran dikonfirmasi', () => {
  assert.match(paymentFeedback('event',{paymentStatus:'success',eventStatus:'registered'}).message,/Tiket kegiatan Anda sudah tersedia/)
})
