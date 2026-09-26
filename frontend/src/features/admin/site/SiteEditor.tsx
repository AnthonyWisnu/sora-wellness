import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  api,
  type MediaAsset,
  type PublicClassType,
  type SiteDocument,
  type SiteDraft,
  type SitePageKey,
  type SiteSection,
} from '../../../shared/api'
import { sitePageNames, siteSectionNames } from '../../../shared/types/site'
import { errorMessage } from '../../../shared/errors'
import { SectionFields } from './SectionFields'
import { MediaManager } from './MediaManager'
import { useConfirm } from '../../../shared/confirm-context'
import './SiteEditor.css'

type PackageOption = { id: string; duration_months: number; active: boolean }
type Props = { show: (message: string) => void; onChanged: () => void }
type Tab = 'profile' | 'pages' | 'contact' | 'media'

export function SiteEditor({ show, onChanged }: Props) {
  const confirm = useConfirm()
  const [draft, setDraft] = useState<SiteDraft | null>(null)
  const [media, setMedia] = useState<MediaAsset[]>([])
  const [classes, setClasses] = useState<PublicClassType[]>([])
  const [packages, setPackages] = useState<PackageOption[]>([])
  const [tab, setTab] = useState<Tab>('profile')
  const [page, setPage] = useState<SitePageKey>('home')
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    const [nextDraft, nextMedia, nextClasses, nextPackages] = await Promise.all([
      api<SiteDraft>('/admin/site'),
      api<MediaAsset[]>('/admin/media'),
      api<PublicClassType[]>('/public/class-types'),
      api<PackageOption[]>('/admin/package-options'),
    ])
    setDraft(nextDraft)
    setMedia(nextMedia)
    setClasses(nextClasses)
    setPackages(nextPackages)
    setDirty(false)
  }, [])
  useEffect(() => {
    void load().catch((error) => show(errorMessage(error)))
  }, [load, show])
  function change(update: (document: SiteDocument) => void) {
    setDraft((current) => {
      if (!current) return current
      const document = structuredClone(current.document)
      update(document)
      return { ...current, document }
    })
    setDirty(true)
  }
  function setProfile<K extends keyof SiteDocument['profile']>(
    key: K,
    value: SiteDocument['profile'][K],
  ) {
    change((document) => {
      document.profile[key] = value
    })
  }
  function setContact<K extends keyof SiteDocument['contact']>(
    key: K,
    value: SiteDocument['contact'][K],
  ) {
    change((document) => {
      document.contact[key] = value
    })
  }
  function changeSection(index: number, section: SiteSection) {
    change((document) => {
      document.pages[page][index] = section
    })
  }
  function moveSection(index: number, offset: number) {
    change((document) => {
      const sections = document.pages[page]
      const [item] = sections.splice(index, 1)
      sections.splice(index + offset, 0, item)
    })
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft) return
    setBusy(true)
    try {
      const result = await api<SiteDraft>('/admin/site', {
        method: 'PUT',
        body: { expectedVersion: draft.draftVersion, document: draft.document },
      })
      setDraft(result)
      setDirty(false)
      show('Draf tersimpan. Perubahan belum tampil untuk pengunjung.')
      setMedia(await api<MediaAsset[]>('/admin/media'))
    } catch (error) {
      show(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  async function publish() {
    if (!draft || dirty) return
    if (
      !(await confirm({
        title: 'Terbitkan seluruh situs?',
        description: 'Semua isi draf akan terlihat oleh pengunjung setelah diterbitkan.',
        confirmLabel: 'Terbitkan situs',
      }))
    )
      return
    setBusy(true)
    try {
      const result = await api<SiteDraft>('/admin/site/publish', {
        method: 'POST',
        body: { expectedVersion: draft.draftVersion },
      })
      setDraft(result)
      onChanged()
      show('Versi situs terbaru sudah terbit.')
    } catch (error) {
      show(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  if (!draft) return <p>Memuat editor situs...</p>
  const document = draft.document
  const emptySections = (Object.entries(document.pages) as [SitePageKey, SiteSection[]][]).flatMap(
    ([pageKey, sections]) =>
      sections
        .filter(
          (section) =>
            section.visible &&
            ((['features', 'testimonials', 'faq'].includes(section.type) &&
              !section.items.length) ||
              (section.type === 'gallery' && !document.profile.galleryMediaIds.length)),
        )
        .map((section) => `${sitePageNames[pageKey]}: ${siteSectionNames[section.type]}`),
  )
  return (
    <section className="admin-workspace site-editor">
      <div className="admin-workspace-head">
        <div>
          <span className="eyebrow">SITUS PUBLIK</span>
          <h2>Kelola konten situs</h2>
          <p>Atur konten dalam draf, periksa pratinjau, lalu terbitkan seluruh perubahan.</p>
        </div>
      </div>
      <div className="site-editor-toolbar">
        <span
          className={
            dirty || draft.draftVersion !== draft.publishedVersion
              ? 'site-status-draft'
              : 'site-status-live'
          }
        >
          {dirty
            ? 'Perubahan belum disimpan'
            : draft.draftVersion !== draft.publishedVersion
              ? 'Draf belum terbit'
              : 'Semua perubahan sudah terbit'}
        </span>
        <button
          type="button"
          className="button button-outline"
          disabled={dirty}
          onClick={() => window.open('/?preview=1', '_blank', 'noopener,noreferrer')}
        >
          Pratinjau draf
        </button>
        <button
          type="button"
          className="button button-primary"
          disabled={busy || dirty || draft.draftVersion === draft.publishedVersion}
          onClick={() => void publish()}
        >
          Terbitkan situs
        </button>
      </div>
      {emptySections.length > 0 && (
        <p className="site-editor-empty-notice">
          Blok aktif yang belum berisi konten akan disembunyikan dari situs:{' '}
          {emptySections.join(', ')}.
        </p>
      )}
      <div className="filter-list site-editor-tabs">
        {(
          [
            ['profile', 'Profil & galeri'],
            ['pages', 'Halaman'],
            ['contact', 'Kontak & footer'],
            ['media', 'Pustaka gambar'],
          ] as const
        ).map(([key, label]) => (
          <button
            type="button"
            key={key}
            className={tab === key ? 'selected' : ''}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'media' ? (
        <MediaManager media={media} setMedia={setMedia} document={document} show={show} />
      ) : (
        <form className="site-editor-form" onSubmit={(event) => void save(event)}>
          {tab === 'profile' && (
            <div className="panel live-form">
              <h3>Identitas studio</h3>
              <label>
                Nama studio
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={document.profile.name}
                  onChange={(event) => setProfile('name', event.target.value)}
                />
              </label>
              <label>
                Deskripsi studio
                <textarea
                  rows={4}
                  maxLength={3000}
                  value={document.profile.description}
                  onChange={(event) => setProfile('description', event.target.value)}
                />
              </label>
              <label>
                Alamat
                <textarea
                  rows={2}
                  maxLength={500}
                  value={document.profile.address}
                  onChange={(event) => setProfile('address', event.target.value)}
                />
              </label>
              <div className="live-form-grid">
                {(
                  [
                    ['logoMediaId', 'Logo', 'studio-profile-logo'],
                    ['heroMediaId', 'Foto utama', 'studio-profile-hero'],
                  ] as const
                ).map(([key, label, selectId]) => (
                  <label key={key} htmlFor={selectId}>
                    {label}
                    <select
                      id={selectId}
                      aria-label={label}
                      value={document.profile[key] ?? ''}
                      onChange={(event) => setProfile(key, event.target.value || null)}
                    >
                      <option value="">Tanpa gambar</option>
                      {media.map((asset) => (
                        <option value={asset.id} key={asset.id}>
                          {asset.filename}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <fieldset>
                <legend>Galeri foto (maksimal 12)</legend>
                {media.map((asset) => (
                  <label className="live-checkbox" key={asset.id}>
                    <input
                      type="checkbox"
                      checked={document.profile.galleryMediaIds.includes(asset.id)}
                      onChange={(event) =>
                        setProfile(
                          'galleryMediaIds',
                          event.target.checked
                            ? [...document.profile.galleryMediaIds, asset.id]
                            : document.profile.galleryMediaIds.filter((id) => id !== asset.id),
                        )
                      }
                    />{' '}
                    {asset.filename}
                  </label>
                ))}
              </fieldset>
            </div>
          )}
          {tab === 'pages' && (
            <>
              <div className="filter-list site-page-tabs">
                {(Object.keys(sitePageNames) as SitePageKey[]).map((key) => (
                  <button
                    type="button"
                    className={page === key ? 'selected' : ''}
                    key={key}
                    onClick={() => setPage(key)}
                  >
                    {sitePageNames[key]}
                  </button>
                ))}
              </div>
              <p>
                Urutan di bawah mengikuti urutan bagian pada halaman. Data harga, kursi, dan jadwal
                tetap berasal dari sistem.
              </p>
              {document.pages[page].map((section, index) => (
                <details className="panel site-section-panel" key={section.type}>
                  <summary>
                    <strong>{siteSectionNames[section.type]}</strong>
                    <span>
                      {!section.visible
                        ? 'Disembunyikan'
                        : (['features', 'testimonials', 'faq'].includes(section.type) &&
                              !section.items.length) ||
                            (section.type === 'gallery' && !document.profile.galleryMediaIds.length)
                          ? 'Menunggu isi'
                          : 'Ditampilkan'}
                    </span>
                  </summary>
                  <div className="site-section-actions">
                    <label className="live-checkbox">
                      <input
                        type="checkbox"
                        checked={section.visible}
                        onChange={(event) =>
                          changeSection(index, { ...section, visible: event.target.checked })
                        }
                      />{' '}
                      Tampilkan bagian
                    </label>
                    <button
                      type="button"
                      className="button button-outline"
                      disabled={index === 0}
                      onClick={() => moveSection(index, -1)}
                    >
                      Naik
                    </button>
                    <button
                      type="button"
                      className="button button-outline"
                      disabled={index === document.pages[page].length - 1}
                      onClick={() => moveSection(index, 1)}
                    >
                      Turun
                    </button>
                  </div>
                  <SectionFields
                    section={section}
                    media={media}
                    classes={classes}
                    packages={packages}
                    update={(next) => changeSection(index, next)}
                  />
                </details>
              ))}
            </>
          )}
          {tab === 'contact' && (
            <div className="panel live-form">
              <h3>Kontak dan footer</h3>
              <div className="live-form-grid">
                <label>
                  Telepon
                  <input
                    maxLength={30}
                    value={document.contact.phone}
                    onChange={(event) => setContact('phone', event.target.value)}
                  />
                </label>
                <label>
                  WhatsApp (angka, awali 62)
                  <input
                    maxLength={20}
                    value={document.contact.whatsapp}
                    onChange={(event) => setContact('whatsapp', event.target.value)}
                  />
                </label>
              </div>
              <label>
                Email
                <input
                  type="email"
                  maxLength={254}
                  value={document.contact.email}
                  onChange={(event) => setContact('email', event.target.value)}
                />
              </label>
              <label>
                Jam operasional
                <textarea
                  rows={2}
                  maxLength={500}
                  value={document.contact.hours}
                  onChange={(event) => setContact('hours', event.target.value)}
                />
              </label>
              <label>
                URL sematan Google Maps
                <input
                  type="url"
                  placeholder="https://www.google.com/maps/embed?..."
                  value={document.contact.mapEmbedUrl}
                  onChange={(event) => setContact('mapEmbedUrl', event.target.value)}
                />
              </label>
              <p>
                Di Google Maps pilih Bagikan → Sematkan peta, lalu salin hanya URL pada atribut src.
              </p>
              <fieldset>
                <legend>Media sosial</legend>
                {document.contact.socialLinks.map((link, index) => (
                  <div className="site-social-row" key={index}>
                    <input
                      aria-label="Nama media sosial"
                      maxLength={40}
                      placeholder="Instagram"
                      value={link.label}
                      onChange={(event) =>
                        change((doc) => {
                          doc.contact.socialLinks[index].label = event.target.value
                        })
                      }
                    />
                    <input
                      aria-label="URL media sosial"
                      type="url"
                      placeholder="https://..."
                      value={link.url}
                      onChange={(event) =>
                        change((doc) => {
                          doc.contact.socialLinks[index].url = event.target.value
                        })
                      }
                    />
                    <button
                      className="button button-text live-danger"
                      type="button"
                      onClick={() =>
                        change((doc) => {
                          doc.contact.socialLinks.splice(index, 1)
                        })
                      }
                    >
                      Hapus
                    </button>
                  </div>
                ))}
                <button
                  className="button button-outline"
                  type="button"
                  disabled={document.contact.socialLinks.length >= 8}
                  onClick={() =>
                    change((doc) => {
                      doc.contact.socialLinks.push({ label: '', url: '' })
                    })
                  }
                >
                  Tambah tautan
                </button>
              </fieldset>
              <label>
                Tagline footer
                <textarea
                  rows={2}
                  maxLength={300}
                  value={document.footer.tagline}
                  onChange={(event) =>
                    change((doc) => {
                      doc.footer.tagline = event.target.value
                    })
                  }
                />
              </label>
            </div>
          )}
          <button className="button button-primary site-save" disabled={busy || !dirty}>
            Simpan draf
          </button>
        </form>
      )}
    </section>
  )
}
