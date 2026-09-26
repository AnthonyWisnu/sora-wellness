import { type AdminClassType } from '../../shared/api'
import { type Coach, type SessionForm, levelLabel } from './management-common'

export function SessionFields({
  form,
  setForm,
  classes,
  coaches,
  withDate = true,
}: {
  form: SessionForm
  setForm: (form: SessionForm) => void
  classes: AdminClassType[]
  coaches: Coach[]
  withDate?: boolean
}) {
  return (
    <>
      <div className="live-form-grid">
        <label>
          Jenis kelas
          <select
            required
            value={form.classTypeId}
            onChange={(event) => {
              const found = classes.find((row) => row.id === event.target.value)
              setForm({
                ...form,
                classTypeId: event.target.value,
                capacity: found?.default_capacity ?? form.capacity,
                priceIdr: found?.default_price_idr ?? form.priceIdr,
              })
            }}
          >
            <option value="">Pilih kelas</option>
            {classes.map((row) => (
              <option key={row.id} value={row.id}>
                {row.title} · {levelLabel[row.level]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Pelatih
          <select
            required
            value={form.coachId}
            onChange={(event) => setForm({ ...form, coachId: event.target.value })}
          >
            <option value="">Pilih pelatih</option>
            {coaches.map((row) => (
              <option key={row.id} value={row.id}>
                {row.fullName}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="live-form-grid">
        {withDate && (
          <label>
            Tanggal kelas
            <input
              type="date"
              required
              value={form.localDate}
              onChange={(event) => setForm({ ...form, localDate: event.target.value })}
            />
          </label>
        )}
        <label>
          Jam mulai
          <input
            type="time"
            required
            value={form.localStartTime}
            onChange={(event) => setForm({ ...form, localStartTime: event.target.value })}
          />
        </label>
      </div>
      <div className="live-form-grid">
        <label>
          Kapasitas
          <input
            type="number"
            required
            min={1}
            max={500}
            value={form.capacity}
            onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) })}
          />
        </label>
        <label>
          Harga satuan (Rp)
          <input
            type="number"
            required
            min={0}
            step={1}
            value={form.priceIdr}
            onChange={(event) => setForm({ ...form, priceIdr: Number(event.target.value) })}
          />
        </label>
      </div>
    </>
  )
}
