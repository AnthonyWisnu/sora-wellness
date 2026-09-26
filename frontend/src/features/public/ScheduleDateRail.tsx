import { CalendarDays } from 'lucide-react'
import { formatDate } from '../../shared/format'

export function ScheduleDateRail({
  dates,
  selected,
  counts,
  weekIndex,
  onSelect,
  onWeek,
}: {
  dates: string[]
  selected: string
  counts: Map<string, number>
  weekIndex: number
  onSelect: (date: string) => void
  onWeek: (index: number) => void
}) {
  const weeks = Math.ceil(dates.length / 7)
  const shown = dates.slice(weekIndex * 7, weekIndex * 7 + 7)
  return (
    <div className="zeira-date-rail" aria-label="Pilih tanggal kelas">
      <div className="zeira-date-rail-heading">
        <CalendarDays size={17} /> Pilih tanggal
        {weeks > 1 && (
          <div className="zeira-week-navigation">
            <button
              type="button"
              disabled={weekIndex === 0}
              onClick={() => onWeek(weekIndex - 1)}
              aria-label="Pekan sebelumnya"
            >
              ‹
            </button>
            <span>
              Pekan {weekIndex + 1} dari {weeks}
            </span>
            <button
              type="button"
              disabled={weekIndex === weeks - 1}
              onClick={() => onWeek(weekIndex + 1)}
              aria-label="Pekan berikutnya"
            >
              ›
            </button>
          </div>
        )}
      </div>
      <div className="zeira-date-options">
        {shown.map((date) => (
          <button
            type="button"
            key={date}
            className={selected === date ? 'active' : ''}
            aria-pressed={selected === date}
            aria-label={`${formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}, ${counts.get(date) ?? 0} kelas`}
            onClick={() => onSelect(date)}
          >
            <span>{formatDate(date, { weekday: 'short' })}</span>
            <strong>{formatDate(date, { day: 'numeric' })}</strong>
            <small>{counts.get(date) ?? 0} kelas</small>
          </button>
        ))}
      </div>
    </div>
  )
}
