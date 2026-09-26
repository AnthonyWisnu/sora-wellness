import { useState } from 'react'
import { ArrowRight, Check, Sparkles } from 'lucide-react'
import type { SiteSection } from '../../shared/api'
import { levelName, money } from '../../shared/format'
import type { SiteBlockContext } from './public-types'

export function PublicPackages({ section, ctx }: { section: SiteSection; ctx: SiteBlockContext }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const options = [...(ctx.packages?.options ?? [])].sort(
    (a, b) => a.durationMonths - b.durationMonths,
  )
  const featured = section.featuredPackageOptionIds.length
    ? options.filter((option) => section.featuredPackageOptionIds.includes(option.id))
    : options
  const shown = ctx.page === 'home' ? featured : options
  const selected = shown.find((option) => option.id === selectedId) ?? shown[0]
  const quota = ctx.packages?.monthlyClassQuota ?? 0
  const levels = ctx.packages?.accessLevels.map(levelName).join(', ') ?? ''

  if (ctx.page === 'home') {
    return (
      <section className="zeira-section shell zeira-home-package">
        <div className="zeira-home-package-copy">
          <div className="zeira-package-kicker">
            <span className="zeira-overline">KEANGGOTAAN STUDIO</span>
            <span className="zeira-pass-badge">MEMBER PASS</span>
          </div>
          <h2>{section.title}</h2>
          <p>{section.body || 'Pilih durasi keanggotaan yang sesuai dengan ritme latihan Anda.'}</p>
          {shown.length > 0 && (
            <>
              <span className="zeira-field-label">PILIH DURASI</span>
              <div className="zeira-duration-pills" role="group" aria-label="Durasi paket">
                {shown.map((option) => (
                  <button
                    key={option.id}
                    className={selected?.id === option.id ? 'active' : ''}
                    aria-pressed={selected?.id === option.id}
                    onClick={() => setSelectedId(option.id)}
                  >
                    {option.durationMonths} bln
                  </button>
                ))}
              </div>
              <div className="zeira-package-price">
                <span className="zeira-field-label">HARGA TOTAL PAKET</span>
                <strong>{money(selected.priceIdr)}</strong>
                <small>untuk {selected.durationMonths} bulan · dibayar manual</small>
              </div>
            </>
          )}
          {!shown.length && <p>Belum ada paket yang tersedia.</p>}
        </div>
        <div className="zeira-package-benefits">
          <div className="zeira-package-benefits-head">
            <h3>Manfaat member</h3>
            <Sparkles size={19} />
          </div>
          <ul>
            <li>
              <Check size={16} /> {quota} jatah kelas per bulan kalender
            </li>
            {levels && (
              <li>
                <Check size={16} /> Akses kelas: {levels}
              </li>
            )}
            <li>
              <Check size={16} /> Pilihan durasi sesuai paket yang tersedia
            </li>
            <li>
              <Check size={16} /> Akun dan riwayat tetap ada setelah paket berakhir
            </li>
          </ul>
          <button className="zeira-btn zeira-btn-primary" onClick={() => ctx.go('/membership')}>
            Jelajahi membership <ArrowRight size={16} />
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="zeira-section shell zeira-membership-packages">
      <div className="zeira-membership-compare">
        <div className="zeira-section-heading">
          <div>
            <span className="zeira-overline">DUA CARA BERLATIH</span>
            <h2>Pilih ritme Anda</h2>
          </div>
        </div>
        <div className="zeira-compare-grid">
          <article>
            <span className="zeira-field-label">TANPA LANGGANAN</span>
            <h3>Kelas satuan</h3>
            <p>Pesan kelas pemula sesuai jadwal. Harga setiap sesi ditampilkan sebelum booking.</p>
            <button className="zeira-btn zeira-btn-outline" onClick={() => ctx.go('/jadwal')}>
              Lihat jadwal <ArrowRight size={15} />
            </button>
          </article>
          <article className="zeira-compare-member">
            <span className="zeira-field-label">MANFAAT MEMBER</span>
            <h3>Membership studio</h3>
            <p>
              {quota} jatah kelas per bulan kalender, dengan akses tingkat{' '}
              {levels || 'sesuai paket'} selama paket aktif.
            </p>
            <a href="#pilihan-paket">
              Lihat pilihan durasi <ArrowRight size={15} />
            </a>
          </article>
        </div>
      </div>
      <div id="pilihan-paket" className="zeira-package-options">
        <div className="zeira-section-heading">
          <div>
            <span className="zeira-overline">PILIHAN DURASI</span>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </div>
        </div>
        {options.length ? (
          <div className="zeira-plan-grid">
            {options.map((option) => (
              <article
                key={option.id}
                className={
                  section.featuredPackageOptionIds.includes(option.id) ? 'zeira-plan-featured' : ''
                }
              >
                <span className="zeira-field-label">
                  {section.featuredPackageOptionIds.includes(option.id)
                    ? 'PILIHAN STUDIO'
                    : 'MEMBER PASS'}
                </span>
                <h3>{option.durationMonths} bulan</h3>
                <strong>{money(option.priceIdr)}</strong>
                <small>Harga total untuk {option.durationMonths} bulan</small>
                <hr />
                <p>{quota} jatah kelas per bulan kalender</p>
                <p>Akses tingkat kelas member selama paket aktif</p>
                <button
                  className="zeira-btn zeira-btn-primary"
                  disabled={ctx.busy}
                  onClick={() => ctx.buyPackage(option.id)}
                >
                  Pilih paket <ArrowRight size={15} />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="zeira-empty">
            <h3>Belum ada paket</h3>
            <p>Hubungi studio untuk informasi keanggotaan.</p>
          </div>
        )}
        <p className="zeira-plan-note">
          Masa aktif dan jatah kelas dihitung oleh sistem setelah pembayaran berhasil.
        </p>
      </div>
    </section>
  )
}
