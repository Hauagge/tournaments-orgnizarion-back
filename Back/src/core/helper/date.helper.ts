export function parseDateFromText(value: string): Date | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  const dayMonthYearFormat = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (dayMonthYearFormat) {
    const [, day, month, year] = dayMonthYearFormat;
    const normalizedDay = day.padStart(2, '0');
    const normalizedMonth = month.padStart(2, '0');
    const parsed = new Date(
      Date.UTC(
        Number(year),
        Number(normalizedMonth) - 1,
        Number(normalizedDay),
      ),
    );

    if (
      parsed.getUTCFullYear() === Number(year) &&
      parsed.getUTCMonth() === Number(normalizedMonth) - 1 &&
      parsed.getUTCDate() === Number(normalizedDay)
    ) {
      return parsed;
    }

    return null;
  }

  const isoDate = new Date(normalized);
  if (Number.isNaN(isoDate.getTime())) {
    return null;
  }

  return new Date(
    Date.UTC(
      isoDate.getUTCFullYear(),
      isoDate.getUTCMonth(),
      isoDate.getUTCDate(),
    ),
  );
}
