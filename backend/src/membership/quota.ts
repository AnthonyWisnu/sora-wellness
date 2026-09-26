export type DateRange = { starts_on: string; ends_on: string };

function dayNumber(value: string): number { return Math.floor(Date.parse(`${value.slice(0, 10)}T00:00:00Z`) / 86400000); }

export function monthlyQuota(normal: number, month: string, ranges: DateRange[]): number {
  const [year, number] = month.split('-').map(Number);
  const start = dayNumber(`${month}-01`);
  const end = dayNumber(new Date(Date.UTC(year, number, 0)).toISOString().slice(0, 10));
  const active = new Set<number>();
  for (const range of ranges) {
    for (let day = Math.max(start, dayNumber(range.starts_on)); day <= Math.min(end, dayNumber(range.ends_on)); day++) active.add(day);
  }
  return Math.min(normal, Math.ceil(normal * active.size / (end - start + 1)));
}
