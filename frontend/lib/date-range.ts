export function localDateBounds(from: string, to: string) {
  const start = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
  const nextDay = to ? new Date(`${to}T00:00:00`) : null;
  if (nextDay) nextDay.setDate(nextDay.getDate() + 1);
  return { start, end: nextDay?.getTime() ?? Infinity };
}
