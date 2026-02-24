export type ReservationRange = {
  check_in_date: string;
  check_out_date: string;
};

export function addIsoDaysUtc(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return isoDate;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isDateRangeOverlap(
  leftStart: string,
  leftEndExclusive: string,
  rightStart: string,
  rightEndExclusive: string
) {
  return leftStart < rightEndExclusive && leftEndExclusive > rightStart;
}

export function findFirstOverlappingRange<T extends ReservationRange>(
  ranges: T[],
  checkInDate: string,
  checkOutDate: string
) {
  return (
    ranges.find((x) =>
      isDateRangeOverlap(x.check_in_date, x.check_out_date, checkInDate, checkOutDate)
    ) ?? null
  );
}

export function deriveReservedUntilForDate<T extends ReservationRange>(
  ranges: T[],
  dayIso: string
) {
  const matches = ranges
    .filter((x) => x.check_in_date <= dayIso && x.check_out_date >= dayIso)
    .map((x) => x.check_out_date)
    .sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
  return matches[0] ?? null;
}

