import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Image as ImageIcon, Trash2, Upload } from 'lucide-react'

type Props = {
  file: File | null
  onChange: (file: File | null) => void
  disabled?: boolean
}

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function TransferProofInput({ file, onChange, disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setError(null)
    const selected = e.target.files?.[0]
    if (!selected) return

    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError('Hanya format JPG, PNG, atau WebP yang diperbolehkan.')
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    if (selected.size > MAX_BYTES) {
      setError('Ukuran berkas tidak boleh melebihi 5 MB.')
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    onChange(selected)
  }

  function handleRemove() {
    setError(null)
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div style={{ marginTop: '12px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
        Bukti Transfer Fisik (Opsional jika nomor referensi diisi)
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        disabled={disabled}
      />

      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '16px',
            border: '1px dashed #cbd5e1',
            borderRadius: '10px',
            background: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            color: '#475569',
          }}
        >
          <Upload size={20} color="#64748b" />
          <span style={{ fontSize: '12.5px', fontWeight: 600 }}>Pilih atau seret berkas bukti transfer</span>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Format JPG, PNG, atau WebP (Maksimal 5 MB)</span>
        </button>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Pratinjau bukti transfer"
                style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
              />
            ) : (
              <ImageIcon size={24} color="#64748b" />
            )}
            <div style={{ overflow: 'hidden', textAlign: 'left' }}>
              <div
                style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#1e293b',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {file.name}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                {(file.size / 1024).toFixed(0)} KB · Siap diunggah
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '6px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '6px',
            }}
            title="Hapus berkas"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

      {error && (
        <div style={{ color: '#dc2626', fontSize: '11.5px', marginTop: '6px' }}>
          {error}
        </div>
      )}
    </div>
  )
}
