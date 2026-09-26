export function membershipEndDate(start: string, durationMonths: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !Number.isInteger(durationMonths) || durationMonths < 1) throw new Error('Tanggal atau durasi paket tidak valid');
  const [year, month, day] = start.split('-').map(Number);
  const original = new Date(Date.UTC(year, month - 1, day));
  if (original.toISOString().slice(0, 10) !== start) throw new Error('Tanggal awal paket tidak valid');
  const targetMonth = new Date(Date.UTC(year, month - 1 + durationMonths, 1));
  const lastTargetDay = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)).getUTCDate();
  const end = day <= lastTargetDay
    ? new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth(), day - 1))
    : new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth(), lastTargetDay));
  return end.toISOString().slice(0, 10);
}
