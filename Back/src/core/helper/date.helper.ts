export function parseDateFromText(value: string): Date | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  const dayMonthYearFormat = normalized.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  );

  if (dayMonthYearFormat) {
    const [, day, month, year] = dayMonthYearFormat;
    return buildLocalDate(
      Number(year),
      Number(month),
      Number(day),
    );
  }

  const isoYearMonthDayFormat = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})$/,
  );

  if (isoYearMonthDayFormat) {
    const [, year, month, day] = isoYearMonthDayFormat;
    return buildLocalDate(
      Number(year),
      Number(month),
      Number(day),
    );
  }

  return null;
}

function buildLocalDate(
  year: number,
  month: number,
  day: number,
): Date | null {
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}
