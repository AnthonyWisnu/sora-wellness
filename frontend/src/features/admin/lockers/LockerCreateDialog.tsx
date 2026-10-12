import { useState, type FormEvent } from 'react'
import { Layers, Plus } from 'lucide-react'
import { AdminDialog } from '../AdminDialog'

type Props = {
  open: boolean
  busy: boolean
  onClose: () => void
  onCreateSingle: (code: string) => Promise<void>
  onCreateBatch: (prefix: string, startNum: number, endNum: number) => Promise<void>
}

export function LockerCreateDialog({
  open,
  busy,
  onClose,
  onCreateSingle,
  onCreateBatch,
}: Props) {
  const [tab, setTab] = useState<'single' | 'batch'>('single')
  const [code, setCode] = useState('')
  const [prefix, setPrefix] = useState('A-')
  const [startNum, setStartNum] = useState(1)
  const [endNum, setEndNum] = useState(20)

  async function handleSubmitSingle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!code.trim()) return
    await onCreateSingle(code.trim())
    setCode('')
  }

  async function handleSubmitBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onCreateBatch(prefix.trim(), startNum, endNum)
  }

  const batchCount = Math.max(0, endNum - startNum + 1)

  return (
    <AdminDialog
      open={open}
      title="Tambah nomor loker"
      onClose={onClose}
    >
      <div className="admin-locker-dialog-tabs">
        <button
          type="button"
          className={`admin-locker-dialog-tab ${tab === 'single' ? 'active' : ''}`}
          onClick={() => setTab('single')}
        >
          <Plus size={14} /> Tambah Tunggal
        </button>
        <button
          type="button"
          className={`admin-locker-dialog-tab ${tab === 'batch' ? 'active' : ''}`}
          onClick={() => setTab('batch')}
        >
          <Layers size={14} /> Tambah Banyak (Batch)
        </button>
      </div>

      {tab === 'single' ? (
        <form className="live-form admin-dialog-form" onSubmit={(e) => void handleSubmitSingle(e)}>
          <label>
            Nomor atau kode loker
            <input
              required
              maxLength={32}
              pattern="[A-Za-z0-9][A-Za-z0-9-]*"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Contoh: A-01"
            />
            <small style={{ color: '#64748b', fontSize: '11px', marginTop: '2px', display: 'block' }}>
              Format bebas huruf dan angka (misal: A-01, VIP-12).
            </small>
          </label>
          <div className="admin-form-actions">
            <button className="button button-primary" disabled={busy || !code.trim()}>
              <Plus size={15} /> Tambah Loker
            </button>
            <button type="button" className="button button-text" onClick={onClose}>
              Batal
            </button>
          </div>
        </form>
      ) : (
        <form className="live-form admin-dialog-form" onSubmit={(e) => void handleSubmitBatch(e)}>
          <div className="live-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <label style={{ gridColumn: '1 / -1' }}>
              Awalan kode (Prefix)
              <input
                required
                maxLength={10}
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="Contoh: A- atau LOKER-"
              />
            </label>
            <label>
              Nomor awal
              <input
                type="number"
                min={1}
                max={999}
                required
                value={startNum}
                onChange={(e) => setStartNum(Number(e.target.value))}
              />
            </label>
            <label>
              Nomor akhir
              <input
                type="number"
                min={1}
                max={999}
                required
                value={endNum}
                onChange={(e) => setEndNum(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="admin-locker-batch-preview-pill">
            Akan membuat <strong>{batchCount} unit loker</strong> ({prefix}
            {String(startNum).padStart(2, '0')} s/d {prefix}
            {String(endNum).padStart(2, '0')}).
          </div>
          <div className="admin-form-actions">
            <button
              className="button button-primary"
              disabled={busy || startNum > endNum || batchCount > 100}
            >
              <Layers size={15} /> Buat {batchCount} Loker Sekaligus
            </button>
            <button type="button" className="button button-text" onClick={onClose}>
              Batal
            </button>
          </div>
        </form>
      )}
    </AdminDialog>
  )
}
