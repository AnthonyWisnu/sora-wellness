export function studioToday(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function scheduleDates(first: string, count: number): string[] {
  const date = new Date(`${first}T12:00:00Z`)
  return Array.from({ length: Math.max(0, count) }, (_, index) => {
    const day = new Date(date)
    day.setUTCDate(day.getUTCDate() + index)
    return day.toISOString().slice(0, 10)
  })
}
