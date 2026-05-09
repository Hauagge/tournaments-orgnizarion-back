export function parseDateFromText(value: string): Date | null {
  if (!value) {
    console.log(`[0] No value provided for date parsing`); // Log the error for debugging
    return null;
  }

  const normalized = value.trim();
  const dayMonthYearFormat = normalized.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  );

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
    console.log(`[1] Failed to parse date from value: ${value}`); // Log the error for debugging
    return null;
  }

  const isoDate = new Date(normalized);
  if (Number.isNaN(isoDate.getTime())) {
    console.log(`[2] Failed to parse date from value: ${value}`); // Log the error for debugging
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
