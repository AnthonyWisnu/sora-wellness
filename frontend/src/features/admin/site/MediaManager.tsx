import { useState, type ChangeEvent } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { api, type MediaAsset, type SiteDocument } from '../../../shared/api'
import { errorMessage } from '../../../shared/errors'

type Props = {
  media: MediaAsset[]
  setMedia: (next: MediaAsset[]) => void
  document: SiteDocument
  show: (message: string) => void
}
export function MediaManager({ media, setMedia, document, show }: Props) {
  const [busy, setBusy] = useState(false)
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const asset = await api<MediaAsset>('/admin/media', { method: 'POST', body: form })
      setMedia([asset, ...media])
      show('Gambar diunggah. Pilih pemakaiannya dalam draf.')
    } catch (error) {
      show(errorMessage(error))
    } finally {
      setBusy(false)
      event.target.value = ''
    }
  }
  async function remove(asset: MediaAsset) {
    if (!window.confirm(`Hapus ${asset.filename}?`)) return
    setBusy(true)
    try {
      await api(`/admin/media/${asset.id}`, { method: 'DELETE' })
      setMedia(media.filter((item) => item.id !== asset.id))
      show('Gambar dihapus.')
    } catch (error) {
      show(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  const selected = new Set([
    document.profile.logoMediaId,
    document.profile.heroMediaId,
    ...document.profile.galleryMediaIds,
    ...Object.values(document.pages).flatMap((sections) =>
      sections.flatMap((section) => section.items.map((item) => item.mediaId)),
    ),
  ])
  return (
    <section className="panel live-form">
      <h3>Pustaka gambar</h3>
      <p>
        JPG, PNG, atau WebP maksimal 5 MB. Gambar yang dipakai draf atau situs terbit tidak dapat
        dihapus.
      </p>
      <label className="studio-upload-label">
        <ImagePlus size={18} /> Pilih gambar
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(event) => void upload(event)}
        />
      </label>
      <div className="site-media-list">
        {media.map((asset) => (
          <div className="site-media-item" key={asset.id}>
            <img src={asset.url} alt="" />
            <span>
              {asset.filename}
              <small>
                {asset.used || selected.has(asset.id) ? 'Digunakan' : 'Belum digunakan'}
              </small>
            </span>
            <button
              type="button"
              aria-label={`Hapus ${asset.filename}`}
              disabled={busy || asset.used || selected.has(asset.id)}
              onClick={() => void remove(asset)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
