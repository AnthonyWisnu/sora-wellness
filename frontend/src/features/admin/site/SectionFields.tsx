import type { MediaAsset, PublicClassType, SiteSection, SiteItem } from '../../../shared/api'
import { siteSectionNames } from '../../../shared/types/site'

type PackageOption = { id: string; duration_months: number; active: boolean }
type Props = {
  section: SiteSection
  media: MediaAsset[]
  classes: PublicClassType[]
  packages: PackageOption[]
  update: (next: SiteSection) => void
}
const itemNames: Record<string, [string, string, string]> = {
  features: ['Keunggulan', 'Penjelasan', 'Keterangan'],
  testimonials: ['Nama pemberi testimoni', 'Kutipan', 'Keterangan'],
  faq: ['Pertanyaan', 'Jawaban', 'Keterangan'],
}
export function SectionFields({ section, media, classes, packages, update }: Props) {
  function set<K extends keyof SiteSection>(key: K, value: SiteSection[K]) {
    update({ ...section, [key]: value })
  }
  function updateItem(index: number, key: keyof SiteItem, value: string | null) {
    set(
      'items',
      section.items.map((item, at) => (at === index ? { ...item, [key]: value } : item)),
    )
  }
  const names = itemNames[section.type]
  return (
    <div className="site-section-fields">
      <label>
        Judul bagian
        <input
          maxLength={160}
          value={section.title}
          onChange={(event) => set('title', event.target.value)}
        />
      </label>
      <label>
        Deskripsi
        <textarea
          rows={2}
          maxLength={1500}
          value={section.body}
          onChange={(event) => set('body', event.target.value)}
        />
      </label>
      {(section.type === 'hero' || section.type === 'cta') && (
        <div className="live-form-grid">
          <label>
            Teks tombol
            <input
              maxLength={80}
              value={section.label}
              onChange={(event) => set('label', event.target.value)}
            />
          </label>
          <label>
            Tujuan tombol
            <select value={section.link} onChange={(event) => set('link', event.target.value)}>
              <option value="">Tanpa tombol</option>
              <option value="/jadwal">Jadwal</option>
              <option value="/membership">Paket</option>
              <option value="/kontak">Kontak</option>
              <option value="/masuk">Masuk</option>
            </select>
          </label>
        </div>
      )}
      {section.type === 'sessions' && (
        <fieldset>
          <legend>Jenis kelas yang ditonjolkan</legend>
          <p>Kosongkan pilihan untuk menampilkan kelas terdekat dari semua jenis.</p>
          {classes.map((item) => (
            <label className="live-checkbox" key={item.id}>
              <input
                type="checkbox"
                checked={section.featuredClassTypeIds.includes(item.id)}
                onChange={(event) =>
                  set(
                    'featuredClassTypeIds',
                    event.target.checked
                      ? [...section.featuredClassTypeIds, item.id]
                      : section.featuredClassTypeIds.filter((id) => id !== item.id),
                  )
                }
              />{' '}
              {item.title}
            </label>
          ))}
        </fieldset>
      )}
      {section.type === 'packages' && (
        <fieldset>
          <legend>Paket yang ditonjolkan</legend>
          <p>Kosongkan pilihan untuk menampilkan semua paket aktif.</p>
          {packages
            .filter((item) => item.active)
            .map((item) => (
              <label className="live-checkbox" key={item.id}>
                <input
                  type="checkbox"
                  checked={section.featuredPackageOptionIds.includes(item.id)}
                  onChange={(event) =>
                    set(
                      'featuredPackageOptionIds',
                      event.target.checked
                        ? [...section.featuredPackageOptionIds, item.id]
                        : section.featuredPackageOptionIds.filter((id) => id !== item.id),
                    )
                  }
                />{' '}
                {item.duration_months} bulan
              </label>
            ))}
        </fieldset>
      )}
      {names && (
        <fieldset>
          <legend>{siteSectionNames[section.type]}</legend>
          {section.items.map((item, index) => (
            <div className="site-item" key={index}>
              <label>
                {names[0]}
                <input
                  maxLength={160}
                  value={item.title}
                  onChange={(event) => updateItem(index, 'title', event.target.value)}
                />
              </label>
              <label>
                {names[1]}
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={item.body}
                  onChange={(event) => updateItem(index, 'body', event.target.value)}
                />
              </label>
              {section.type === 'testimonials' && (
                <>
                  <label>
                    {names[2]}
                    <input
                      maxLength={120}
                      value={item.caption}
                      onChange={(event) => updateItem(index, 'caption', event.target.value)}
                    />
                  </label>
                  <label>
                    Foto opsional
                    <select
                      value={item.mediaId ?? ''}
                      onChange={(event) => updateItem(index, 'mediaId', event.target.value || null)}
                    >
                      <option value="">Tanpa foto</option>
                      {media.map((asset) => (
                        <option value={asset.id} key={asset.id}>
                          {asset.filename}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              <button
                className="button button-text live-danger"
                type="button"
                onClick={() =>
                  set(
                    'items',
                    section.items.filter((_, at) => at !== index),
                  )
                }
              >
                Hapus item
              </button>
            </div>
          ))}
          <button
            className="button button-outline"
            type="button"
            disabled={section.items.length >= 12}
            onClick={() =>
              set('items', [...section.items, { title: '', body: '', caption: '', mediaId: null }])
            }
          >
            Tambah item
          </button>
        </fieldset>
      )}
    </div>
  )
}
