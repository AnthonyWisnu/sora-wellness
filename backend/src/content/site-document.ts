import { BadRequestException } from '@nestjs/common';

export const pageSections = {
  home: ['hero', 'features', 'sessions', 'packages', 'gallery', 'testimonials', 'faq', 'cta'],
  schedule: ['hero', 'sessions', 'cta'],
  membership: ['hero', 'packages', 'features', 'faq', 'cta'],
  contact: ['hero', 'contact', 'faq'],
} as const;

export type SectionType = typeof pageSections[keyof typeof pageSections][number];
export type SiteItem = { title: string; body: string; caption: string; mediaId: string | null; link?: string };
export type SiteSection = {
  type: SectionType; visible: boolean; title: string; body: string; label: string;
  link: string; items: SiteItem[]; featuredClassTypeIds: string[]; featuredPackageOptionIds: string[];
};
export type SiteDocument = {
  profile: { name: string; description: string; address: string; logoMediaId: string | null; heroMediaId: string | null; galleryMediaIds: string[] };
  contact: { phone: string; whatsapp: string; email: string; hours: string; mapEmbedUrl: string; socialLinks: { label: string; url: string }[] };
  footer: { tagline: string };
  pages: { home: SiteSection[]; schedule: SiteSection[]; membership: SiteSection[]; contact: SiteSection[] };
};

function fail(message: string): never { throw new BadRequestException(message); }
function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} tidak valid`);
  return value as Record<string, unknown>;
}
function string(value: unknown, max: number, label: string, min = 0): string {
  if (typeof value !== 'string') fail(`${label} harus berupa teks`);
  const result = (value as string).trim();
  if (result.length < min || result.length > max) fail(`${label} harus ${min}-${max} karakter`);
  return result;
}
function list(value: unknown, max: number, label: string): unknown[] {
  if (!Array.isArray(value) || value.length > max) fail(`${label} maksimal ${max} item`);
  return value;
}
function uuid(value: unknown, label: string): string {
  const result = string(value, 36, label);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result)) fail(`${label} tidak valid`);
  return result;
}
function mediaId(value: unknown): string | null { return value == null || value === '' ? null : uuid(value, 'Gambar'); }
function ids(value: unknown, max: number, label: string): string[] {
  const result = list(value, max, label).map(item => uuid(item, label));
  if (new Set(result).size !== result.length) fail(`${label} tidak boleh berulang`);
  return result;
}
function httpsUrl(value: unknown, label: string): string {
  const result = string(value, 800, label);
  if (!result) return '';
  try { if (new URL(result).protocol !== 'https:') fail(`${label} harus HTTPS`); }
  catch { fail(`${label} bukan URL yang valid`); }
  return result;
}
function mapUrl(value: unknown): string {
  const result = httpsUrl(value, 'URL peta');
  if (!result) return '';
  const url = new URL(result);
  const sharedEmbed = url.hostname === 'www.google.com' && /^\/maps\/embed(?:\/|$)/.test(url.pathname);
  const queryEmbed = url.hostname === 'maps.google.com' && url.pathname === '/maps' && url.searchParams.get('output') === 'embed' && Boolean(url.searchParams.get('q'));
  if (!sharedEmbed && !queryEmbed) fail('Gunakan URL sematan dari Google Maps');
  return result;
}

export function parseSiteDocument(value: unknown): SiteDocument {
  const root = object(value, 'Konten situs');
  const profile = object(root.profile, 'Profil');
  const contact = object(root.contact, 'Kontak');
  const footer = object(root.footer, 'Footer');
  const pages = object(root.pages, 'Halaman');
  const phone = string(contact.phone, 30, 'Nomor telepon');
  const whatsapp = string(contact.whatsapp, 30, 'Nomor WhatsApp');
  if (phone && !/^\+?[0-9 ()-]{6,30}$/.test(phone)) fail('Nomor telepon tidak valid');
  if (whatsapp && !/^[0-9]{8,20}$/.test(whatsapp)) fail('Nomor WhatsApp hanya boleh berisi angka');
  const email = string(contact.email, 254, 'Email');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Email tidak valid');
  const socialLinks = list(contact.socialLinks, 8, 'Tautan sosial').map((entry) => {
    const item = object(entry, 'Tautan sosial');
    const url = httpsUrl(item.url, 'Tautan sosial');
    if (!url) fail('Tautan sosial wajib diisi');
    return { label: string(item.label, 40, 'Nama sosial', 1), url };
  });
  const resultPages = {} as SiteDocument['pages'];
  for (const page of Object.keys(pageSections) as (keyof typeof pageSections)[]) {
    const allowed: readonly string[] = pageSections[page];
    const sections = list(pages[page], allowed.length, `Blok ${page}`).map((raw) => {
      const section = object(raw, 'Blok');
      const type = string(section.type, 30, 'Jenis blok') as SectionType;
      if (!allowed.includes(type)) fail(`Blok ${type} tidak tersedia di ${page}`);
      if (typeof section.visible !== 'boolean') fail('Visibilitas blok tidak valid');
      const link = string(section.link, 40, 'Tautan tombol');
      if (link && !['/jadwal', '/membership', '/kontak', '/masuk'].includes(link)) fail('Tautan tombol tidak tersedia');
      const items = list(section.items, 12, 'Isi blok').map((rawItem) => {
        const item = object(rawItem, 'Isi blok');
        const link = item.link != null && item.link !== '' ? string(item.link, 40, 'Tautan item') : '';
        if (link && !['/jadwal', '/membership', '/kontak', '/masuk'].includes(link)) fail('Tautan item tidak tersedia');
        return {
          title: string(item.title, 160, 'Judul item'),
          body: string(item.body, 1000, 'Isi item'),
          caption: string(item.caption, 120, 'Keterangan item'),
          mediaId: mediaId(item.mediaId),
          link,
        };
      });
      return {
        type, visible: section.visible as boolean, title: string(section.title, 160, 'Judul blok'),
        body: string(section.body, 1500, 'Deskripsi blok'), label: string(section.label, 80, 'Label tombol'), link,
        items, featuredClassTypeIds: ids(section.featuredClassTypeIds, 20, 'Jenis kelas unggulan'),
        featuredPackageOptionIds: ids(section.featuredPackageOptionIds, 20, 'Paket unggulan'),
      };
    });
    if (sections.length !== allowed.length || new Set(sections.map(s => s.type)).size !== allowed.length) fail(`Semua jenis blok ${page} harus tersedia sekali`);
    resultPages[page] = sections;
  }
  return {
    profile: {
      name: string(profile.name, 120, 'Nama studio', 2), description: string(profile.description, 3000, 'Deskripsi studio'),
      address: string(profile.address, 500, 'Alamat'), logoMediaId: mediaId(profile.logoMediaId),
      heroMediaId: mediaId(profile.heroMediaId), galleryMediaIds: ids(profile.galleryMediaIds, 12, 'Foto galeri'),
    },
    contact: { phone, whatsapp, email, hours: string(contact.hours, 500, 'Jam operasional'), mapEmbedUrl: mapUrl(contact.mapEmbedUrl), socialLinks },
    footer: { tagline: string(footer.tagline, 300, 'Tagline footer') },
    pages: resultPages,
  };
}

export function validatePublishedDocument(document: SiteDocument): void {
  for (const [page, sections] of Object.entries(document.pages)) {
    for (const section of sections) {
      if (!section.visible) continue;
      const populated = !['features', 'testimonials', 'faq', 'gallery'].includes(section.type)
        || (section.type === 'gallery' ? document.profile.galleryMediaIds.length > 0 : section.items.length > 0);
      if (populated && !section.title.trim()) fail(`Judul blok ${section.type} pada halaman ${page} wajib diisi sebelum terbit`);
      if (page === 'membership' && section.type === 'features' && section.items.some(item => !item.title.trim())) fail('Setiap manfaat membership wajib memiliki judul');
    }
  }
}

export function referencedMedia(document: SiteDocument): string[] {
  const values = [document.profile.logoMediaId, document.profile.heroMediaId, ...document.profile.galleryMediaIds];
  for (const sections of Object.values(document.pages)) for (const section of sections) for (const item of section.items) values.push(item.mediaId);
  return [...new Set(values.filter((id): id is string => Boolean(id)))];
}

function section(type: SectionType, title: string, body = '', label = '', link = ''): SiteSection {
  return { type, visible: true, title, body, label, link, items: [], featuredClassTypeIds: [], featuredPackageOptionIds: [] };
}
export function initialSiteDocument(profile: SiteDocument['profile']): SiteDocument {
  return {
    profile,
    contact: { phone: '', whatsapp: '', email: '', hours: '', mapEmbedUrl: '', socialLinks: [] },
    footer: { tagline: profile.description },
    pages: {
      home: [section('hero', profile.name, profile.description, 'Temukan kelas', '/jadwal'), section('sessions', 'Jadwal kelas studio', 'Pilih sesi sesuai waktu dan tingkat latihan Anda.'), section('packages', 'Pilihan membership'), section('testimonials', 'Cerita dari studio'), section('features', 'Mengapa berlatih bersama kami?'), section('gallery', 'Ruang kami'), section('faq', 'Pertanyaan umum'), section('cta', 'Mulai perjalanan Anda', '', 'Lihat jadwal', '/jadwal')],
      schedule: [section('hero', 'Temukan ritme yang tepat untuk Anda.', 'Pilih kelas dan waktu yang cocok.'), section('sessions', 'Jadwal kelas'), section('cta', 'Siap berlatih?', '', 'Lihat paket', '/membership')],
      membership: [section('hero', 'Satu ruang. Banyak cara bertumbuh.', 'Temukan pilihan durasi membership.'), section('packages', 'Pilihan paket studio'), section('features', 'Manfaat keanggotaan'), section('faq', 'Pertanyaan tentang paket'), section('cta', 'Temukan kelas Anda', '', 'Lihat jadwal', '/jadwal')],
      contact: [section('hero', 'Hubungi studio kami', 'Kami siap membantu Anda.'), section('contact', 'Kontak dan lokasi'), section('faq', 'Pertanyaan umum')],
    },
  };
}
