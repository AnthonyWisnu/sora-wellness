import { useRef, useState, type ChangeEvent } from 'react'
import { Camera, Trash2, User } from 'lucide-react'
import { api } from '../../shared/api'
import { errorMessage } from '../../shared/errors'
import { useConfirm } from '../../shared/confirm-context'

type AvatarUploadProps = {
  currentAvatarUrl?: string | null
  fullName: string
  onAvatarChanged: (url: string | null) => void
  show: (text: string) => void
}

export function AvatarUpload({
  currentAvatarUrl,
  fullName,
  onAvatarChanged,
  show,
}: AvatarUploadProps) {
  const confirm = useConfirm()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      show('Ukuran berkas maksimal 2 MB.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setBusy(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api<{ avatarUrl: string }>('/me/avatar', {
        method: 'POST',
        body: formData,
      })
      onAvatarChanged(res.avatarUrl)
      show('Foto profil berhasil diperbarui.')
    } catch (error) {
      show(errorMessage(error))
    } finally {
      setBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDeleteAvatar() {
    if (
      !(await confirm({
        title: 'Hapus foto profil?',
        description: 'Foto profil akan dihapus dan kembali menggunakan inisial nama.',
        confirmLabel: 'Hapus foto',
        tone: 'danger',
      }))
    ) {
      return
    }

    setBusy(true)
    try {
      await api('/me/avatar', { method: 'DELETE' })
      onAvatarChanged(null)
      show('Foto profil berhasil dihapus.')
    } catch (error) {
      show(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="avatar-upload-card">
      <div className="avatar-preview-wrapper">
        {currentAvatarUrl ? (
          <img
            src={currentAvatarUrl}
            alt={fullName}
            className="avatar-preview-img"
          />
        ) : (
          <div className="avatar-placeholder" aria-label={fullName}>
            {fullName ? fullName.charAt(0).toUpperCase() : <User size={28} />}
          </div>
        )}
      </div>
      <div className="avatar-upload-info">
        <span className="eyebrow">FOTO PROFIL</span>
        <p className="avatar-upload-hint">
          Format JPG, PNG, atau WebP, maks. 2 MB. Membantu pelatih mengenali Anda di atas matras kelas.
        </p>
        <div className="avatar-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={(e) => void handleFileChange(e)}
          />
          <button
            type="button"
            className="button button-outline"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera size={15} /> {currentAvatarUrl ? 'Ganti foto' : 'Unggah foto'}
          </button>
          {currentAvatarUrl && (
            <button
              type="button"
              className="button button-text live-danger"
              disabled={busy}
              onClick={() => void handleDeleteAvatar()}
            >
              <Trash2 size={15} /> Hapus foto
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
