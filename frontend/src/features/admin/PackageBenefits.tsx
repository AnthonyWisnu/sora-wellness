import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ApiError, api, type SiteDraft, type SiteItem } from '../../shared/api'
import { errorMessage } from '../../shared/errors'
import { useConfirm } from '../../shared/confirm-context'

type Props = { show: (message: string) => void; onPublished: () => void }
const emptyItem = (): SiteItem => ({ title: '', body: '', caption: '', mediaId: null })

export function PackageBenefits({ show, onPublished }: Props) {
  const confirm = useConfirm()
  const [draft, setDraft] = useState<SiteDraft | null>(null)
  const [items, setItems] = useState<SiteItem[]>([])
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const load = useCallback(async () => {
    const next = await api<SiteDraft>('/admin/site')
    setDraft(next)
    setItems(
      next.document.pages.membership.find((section) => section.type === 'features')?.items ?? [],
    )
    setDirty(false)
    setConflict(false)
    setLoadError(false)
  }, [])
  useEffect(() => {
    void load().catch(() => setLoadError(true))
  }, [load])
  function change(next: SiteItem[]) {
    setItems(next)
    setDirty(true)
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft) return
    setBusy(true)
    try {
      const document = structuredClone(draft.document)
      const section = document.pages.membership.find((entry) => entry.type === 'features')
      if (!section) throw new Error('Blok manfaat Membership tidak tersedia.')
      section.items = items.map((item) => ({
        ...item,
        title: item.title.trim(),
        body: item.body.trim(),
      }))
      const next = await api<SiteDraft>('/admin/site', {
        method: 'PUT',
        body: { expectedVersion: draft.draftVersion, document },
      })
      setDraft(next)
      setItems(section.items)
      setDirty(false)
      show('Draf manfaat tersimpan. Publik belum berubah.')
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) setConflict(true)
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
        description:
          'Semua isi draf, termasuk halaman lain dan manfaat Membership, akan terlihat oleh pengunjung.',
        confirmLabel: 'Terbitkan situs',
      }))
    )
      return
    setBusy(true)
    try {
      setDraft(
        await api<SiteDraft>('/admin/site/publish', {
          method: 'POST',
          body: { expectedVersion: draft.draftVersion },
        }),
      )
      onPublished()
      show('Seluruh draf situs telah terbit.')
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) setConflict(true)
      show(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="panel package-benefits-editor">
      <div className="admin-workspace-head">
        <div>
          <span className="eyebrow">MANFAAT BERSAMA</span>
          <h2>Manfaat membership</h2>
          <p>
            Daftar ini berlaku untuk semua durasi paket. Tulis hanya manfaat yang sudah didukung
            sistem; hak kelas dan jatah tetap dihitung oleh API.
          </p>
        </div>
      </div>
      {loadError && (
        <div role="alert">
          Draf gagal dimuat.{' '}
          <button
            className="button button-outline"
            onClick={() => void load().catch(() => setLoadError(true))}
          >
            Coba lagi
          </button>
        </div>
      )}
      {!draft && !loadError && <p role="status">Memuat draf manfaat…</p>}
      {draft && (
        <>
          <p className="package-benefits-status">
            {dirty
              ? 'Perubahan belum disimpan'
              : draft.draftVersion === draft.publishedVersion
                ? 'Sudah terbit'
                : 'Draf belum terbit'}
          </p>
          {conflict && (
            <div role="alert" className="package-benefits-conflict">
              Draf situs berubah dari halaman lain. Muat ulang untuk melihat versi terbaru sebelum
              mengedit lagi.{' '}
              <button
                className="button button-outline"
                onClick={() => void load().catch((error) => show(errorMessage(error)))}
              >
                Muat ulang draf
              </button>
            </div>
          )}
          <form onSubmit={(event) => void save(event)} className="live-form">
            {items.map((item, index) => (
              <div className="package-benefit-row" key={index}>
                <label>
                  Judul manfaat{' '}
                  <input
                    required
                    maxLength={160}
                    value={item.title}
                    onChange={(event) =>
                      change(
                        items.map((entry, at) =>
                          at === index ? { ...entry, title: event.target.value } : entry,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Penjelasan{' '}
                  <textarea
                    rows={2}
                    maxLength={1000}
                    value={item.body}
                    onChange={(event) =>
                      change(
                        items.map((entry, at) =>
                          at === index ? { ...entry, body: event.target.value } : entry,
                        ),
                      )
                    }
                  />
                </label>
                <div className="admin-form-actions">
                  <button
                    type="button"
                    className="button button-outline"
                    disabled={index === 0}
                    onClick={() => {
                      const next = [...items]
                      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
                      change(next)
                    }}
                  >
                    Naik
                  </button>
                  <button
                    type="button"
                    className="button button-outline"
                    disabled={index === items.length - 1}
                    onClick={() => {
                      const next = [...items]
                      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
                      change(next)
                    }}
                  >
                    Turun
                  </button>
                  <button
                    type="button"
                    className="button button-text live-danger"
                    onClick={() => change(items.filter((_, at) => at !== index))}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
            <div className="admin-form-actions">
              <button
                type="button"
                className="button button-outline"
                disabled={items.length >= 12}
                onClick={() => change([...items, emptyItem()])}
              >
                Tambah manfaat
              </button>
              <button className="button button-primary" disabled={busy || !dirty || conflict}>
                Simpan draf
              </button>
            </div>
          </form>
          <div className="admin-form-actions package-benefits-actions">
            <button
              type="button"
              className="button button-outline"
              disabled={dirty}
              onClick={() => window.open('/membership?preview=1', '_blank', 'noopener,noreferrer')}
            >
              Pratinjau draf
            </button>
            <button
              type="button"
              className="button button-primary"
              disabled={busy || dirty || conflict || draft.draftVersion === draft.publishedVersion}
              onClick={() => void publish()}
            >
              Terbitkan seluruh draf situs
            </button>
          </div>
        </>
      )}
    </section>
  )
}
