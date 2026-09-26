import { initialSiteDocument, parseSiteDocument, SiteDocument, SiteItem, SiteSection } from '../src/content/site-document';

type Media = { logo: string; hero: string; yoga: string; pilates: string; reception: string; recovery: string };
type LocalContact = { phone?: string; whatsapp?: string; mapEmbedUrl?: string };

const item = (title: string, body: string, caption = '', mediaId: string | null = null): SiteItem => ({ title, body, caption, mediaId });

function block(document: SiteDocument, page: keyof SiteDocument['pages'], type: SiteSection['type']): SiteSection {
  const found = document.pages[page].find((section) => section.type === type);
  if (!found) throw new Error(`Blok ${type} pada ${page} tidak tersedia`);
  return found;
}

export function demoDocument(media: Media, classes: Record<string, string>, packages: Record<number, string>, local: LocalContact): SiteDocument {
  const document = initialSiteDocument({
    name: 'Sora Wellness',
    description: 'Ruang bergerak dengan perhatian pada ritme tubuh, napas, dan pemulihan. Kelas kecil untuk memulai, berkembang, dan kembali merasa nyaman bergerak.',
    address: 'Area Kampus Unud Jimbaran, Badung, Bali · titik lokasi demo',
    logoMediaId: media.logo,
    heroMediaId: media.hero,
    galleryMediaIds: [media.yoga, media.pilates, media.reception, media.recovery],
  });
  document.contact = {
    phone: local.phone ?? '',
    whatsapp: local.whatsapp ?? '',
    email: 'halo@sora.example.test',
    hours: 'Senin–Jumat 06.30–20.00 · Sabtu–Minggu 07.00–17.00 (jam contoh)',
    mapEmbedUrl: local.mapEmbedUrl ?? 'https://maps.google.com/maps?q=Fakultas%20Teknik%20Universitas%20Udayana%20Jimbaran&output=embed',
    socialLinks: [],
  };
  document.footer.tagline = 'Bergerak lebih sadar, pulang lebih ringan. Sora Wellness adalah studio fiktif untuk demonstrasi aplikasi.';

  const hero = block(document, 'home', 'hero');
  hero.title = 'Temukan ruang untuk kembali seimbang.';
  hero.body = 'Gerak yang berkesadaran, perhatian yang personal, dan waktu yang terasa sepenuhnya milik Anda.';
  hero.label = 'Jelajahi kelas';
  hero.link = '/jadwal';
  const sessions = block(document, 'home', 'sessions');
  sessions.title = 'Ritme terbaik dimulai dari satu kelas';
  sessions.body = 'Pilih sesi yang sesuai dengan energi dan pengalaman Anda. Jadwal serta kursi tersedia diperbarui langsung dari sistem.';
  sessions.featuredClassTypeIds = [classes['Gentle Flow'], classes['Pilates Foundation']];
  const plans = block(document, 'home', 'packages');
  plans.title = 'Ruang untuk berlatih rutin';
  plans.body = 'Satu manfaat keanggotaan, pilihan durasi yang mengikuti komitmen Anda.';
  plans.featuredPackageOptionIds = [packages[1], packages[3], packages[6]];
  const features = block(document, 'home', 'features');
  features.title = 'Yang membuat setiap sesi terasa dekat';
  features.body = 'Pengalaman studio dirancang supaya Anda tahu apa yang akan dijalani sejak memilih kelas.';
  features.items = [
    item('Kelas kecil dan terarah', 'Kapasitas tiap sesi terlihat sebelum reservasi, sehingga Anda dapat memilih waktu latihan dengan nyaman.', '01 / PENGALAMAN'),
    item('Pilihan sesuai kemampuan', 'Mulai dari kelas pemula, lalu lanjutkan ke latihan yang lebih menantang ketika siap.', '02 / PERJALANAN'),
    item('Jadwal dan biaya jelas', 'Harga kelas satuan, jatah member, dan status kursi diperiksa oleh sistem pada setiap booking.', '03 / KEJELASAN'),
  ];
  const gallery = block(document, 'home', 'gallery');
  gallery.title = 'Ruang yang mengundang Anda bernapas';
  gallery.body = 'Visual ilustrasi studio Sora: area latihan, ruang temu, dan sudut untuk beristirahat.';
  const testimonials = block(document, 'home', 'testimonials');
  testimonials.title = 'Cerita latihan bersama Sora';
  testimonials.body = 'Kutipan berikut adalah contoh fiktif untuk memperlihatkan tampilan testimoni.';
  testimonials.items = [
    item('Ayu Lestari', 'Saya suka bisa melihat jadwal dan tempat yang tersisa sebelum memutuskan ikut kelas. Mulai dari kelas pemula terasa lebih ringan.', 'TESTIMONI CONTOH · FIKTIF'),
    item('Dimas Saputra', 'Pilihan kelasnya jelas dan saya bisa menyesuaikan latihan dengan waktu luang. Semua booking tercatat di akun saya.', 'TESTIMONI CONTOH · FIKTIF'),
  ];
  const homeFaq = block(document, 'home', 'faq');
  homeFaq.title = 'Sebelum Anda datang';
  homeFaq.items = [
    item('Apakah saya harus menjadi member?', 'Tidak. Pelanggan tanpa paket dapat memesan kelas pemula secara satuan, termasuk kelas gratis yang tersedia.'),
    item('Apa yang perlu disiapkan untuk kelas pertama?', 'Datang beberapa menit lebih awal dan gunakan pakaian yang nyaman. Informasi kebutuhan khusus dapat dicatat secara opsional di akun Anda.'),
    item('Bagaimana jika rencana saya berubah?', 'Pembatalan mengikuti batas waktu yang tertera pada aturan studio. Jika memenuhi batas, pembayaran kelas satuan menjadi saldo untuk kelas berikutnya.'),
  ];
  const homeCta = block(document, 'home', 'cta');
  homeCta.title = 'Mulai dengan langkah yang terasa tepat';
  homeCta.body = 'Lihat jadwal terdekat dan pilih kelas pertama Anda.';
  homeCta.label = 'Lihat jadwal';
  homeCta.link = '/jadwal';

  const scheduleHero = block(document, 'schedule', 'hero');
  scheduleHero.title = 'Waktu yang Anda pilih, gerak yang Anda butuhkan.';
  scheduleHero.body = 'Temukan kelas dari ritme yang tenang hingga latihan yang lebih dinamis.';
  const scheduleList = block(document, 'schedule', 'sessions');
  scheduleList.title = 'Jadwal kelas studio';
  scheduleList.body = 'Kursi, pelatih, harga, dan tingkat kelas berasal dari jadwal aktif Sora.';
  scheduleList.featuredClassTypeIds = [classes['Gentle Flow'], classes['Pilates Foundation']];
  const scheduleCta = block(document, 'schedule', 'cta');
  scheduleCta.title = 'Lebih sering berlatih?';
  scheduleCta.body = 'Lihat manfaat dan pilihan durasi membership.';
  scheduleCta.label = 'Lihat membership';
  scheduleCta.link = '/membership';

  const membershipHero = block(document, 'membership', 'hero');
  membershipHero.title = 'Satu komitmen kecil untuk tubuh Anda.';
  membershipHero.body = 'Pilih durasi keanggotaan yang paling sesuai. Manfaat dan jatah kelasnya sama untuk setiap durasi.';
  const membershipPlans = block(document, 'membership', 'packages');
  membershipPlans.title = 'Pilihan durasi membership';
  membershipPlans.body = 'Harga yang tampil adalah total paket. Perpanjangan dilakukan manual dari akun Anda.';
  membershipPlans.featuredPackageOptionIds = [packages[3]];
  const membershipFeatures = block(document, 'membership', 'features');
  membershipFeatures.title = 'Manfaat yang mengikuti perjalanan Anda';
  membershipFeatures.items = [
    item('Akses semua tingkat', 'Selama paket aktif, member dapat mengikuti kelas pemula dan kedua tingkat lanjutan.'),
    item('Jatah per bulan kalender', 'Jatah dihitung sesuai hari aktif pada bulan kelas berlangsung dan diperbarui saat bulan berganti.'),
    item('Tetap leluasa memilih', 'Ketika jatah habis, Anda masih dapat membeli kelas satuan sesuai harga sesi.'),
  ];
  const membershipFaq = block(document, 'membership', 'faq');
  membershipFaq.title = 'Pertanyaan tentang membership';
  membershipFaq.items = [
    item('Apakah paket diperpanjang otomatis?', 'Tidak. Anda dapat membeli perpanjangan secara manual ketika sudah mendekati akhir masa aktif.'),
    item('Kapan jatah kelas dihitung?', 'Jatah mengikuti bulan kalender saat sesi berlangsung, bukan tanggal ketika Anda melakukan booking.'),
    item('Apakah jatah bulan pertama selalu penuh?', 'Jika paket dimulai di tengah bulan, jatah dihitung proporsional menurut hari aktif dan dibulatkan ke atas.'),
  ];
  const membershipCta = block(document, 'membership', 'cta');
  membershipCta.title = 'Lihat kelas yang menanti Anda';
  membershipCta.label = 'Buka jadwal';
  membershipCta.link = '/jadwal';

  const contactHero = block(document, 'contact', 'hero');
  contactHero.title = 'Kami dekat ketika Anda siap memulai.';
  contactHero.body = 'Tanyakan pilihan kelas atau lihat titik peta demo sebelum menjelajahi jadwal.';
  const contact = block(document, 'contact', 'contact');
  contact.title = 'Hubungi Sora Wellness';
  contact.body = 'Profil dan titik lokasi pada halaman ini adalah contoh demonstrasi. Nomor kontak di lingkungan lokal disediakan pemilik proyek.';
  const contactFaq = block(document, 'contact', 'faq');
  contactFaq.title = 'Bantuan singkat';
  contactFaq.items = [
    item('Bagaimana cara melakukan booking?', 'Buat akun atau masuk, buka Jadwal, lalu pilih sesi yang masih tersedia.'),
    item('Apakah pembayaran langsung di halaman Sora?', 'Untuk transaksi berbayar, Anda diarahkan ke halaman pembayaran Midtrans Sandbox pada lingkungan demonstrasi ini.'),
  ];

  return parseSiteDocument(document);
}
