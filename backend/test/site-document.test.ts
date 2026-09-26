import assert from 'node:assert/strict';
import test from 'node:test';
import { initialSiteDocument, parseSiteDocument, referencedMedia } from '../src/content/site-document';

const profile = { name: 'Studio Uji', description: 'Latihan bersama', address: 'Jalan Uji', logoMediaId: null, heroMediaId: null, galleryMediaIds: [] };

test('dokumen situs menerima blok terstruktur yang diurutkan ulang', () => {
  const document = initialSiteDocument(profile);
  document.pages.home.reverse();
  document.contact.mapEmbedUrl = 'https://www.google.com/maps/embed?pb=test';
  const parsed = parseSiteDocument(document);
  assert.equal(parsed.pages.home[0].type, 'cta');
  assert.equal(parsed.contact.mapEmbedUrl, document.contact.mapEmbedUrl);
});

test('URL peta selain sematan Google ditolak', () => {
  const document = initialSiteDocument(profile);
  document.contact.mapEmbedUrl = 'https://example.com/map';
  assert.throws(() => parseSiteDocument(document), /Gunakan URL sematan/);
});

test('URL sematan Google Maps berbasis pencarian lokasi diterima', () => {
  const document = initialSiteDocument(profile);
  document.contact.mapEmbedUrl = 'https://maps.google.com/maps?q=Fakultas%20Teknik%20Universitas%20Udayana%20Jimbaran&output=embed';
  assert.equal(parseSiteDocument(document).contact.mapEmbedUrl, document.contact.mapEmbedUrl);
});

test('blok ganda dan tautan tombol sembarang ditolak', () => {
  const document = initialSiteDocument(profile);
  document.pages.home[1] = { ...document.pages.home[0] };
  assert.throws(() => parseSiteDocument(document), /Semua jenis blok/);
  document.pages.home = initialSiteDocument(profile).pages.home;
  document.pages.home[0].link = 'javascript:alert(1)';
  assert.throws(() => parseSiteDocument(document), /Tautan tombol/);
});

test('gambar dalam testimoni tercatat sebagai gambar terpakai', () => {
  const document = initialSiteDocument(profile);
  const mediaId = 'ff912739-9780-4d21-93c0-0398d39066a1';
  document.pages.home.find(section => section.type === 'testimonials')!.items.push({ title: 'Nia', body: 'Kelas nyaman', caption: '', mediaId });
  assert.deepEqual(referencedMedia(document), [mediaId]);
});
