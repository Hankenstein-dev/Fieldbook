export function seasonSummary(months: number[], month: number) {
  const total = months.reduce((a, b) => a + b, 0),
    peak = Math.max(...months, 0);
  if (total < 24 || months.filter((n) => n > 0).length < 3)
    return { label: 'Not enough records for a seasonal pattern', bonus: 0, total };
  const current = months[month] ?? 0;
  if (current >= peak * 0.8)
    return { label: 'Often recorded at this time of year', bonus: 6, total };
  if (current < peak * 0.2)
    return { label: 'Fewer records at this time of year', bonus: -2, total };
  return { label: 'Recorded at this time of year', bonus: 1, total };
}
