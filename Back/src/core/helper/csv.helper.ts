import { normalizeHeaderText, normalizeTextToUppercase } from './string.helper';

export function parseCsvText(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentField = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }

      currentRow.push(currentField);
      if (currentRow.some((field) => field.trim() !== '')) {
        rows.push(currentRow);
      }
      currentField = '';
      currentRow = [];
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((field) => field.trim() !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export function getColumnValueByHeader(
  columns: string[],
  headers: string[],
  headerName: string | null,
): string {
  if (!headerName) {
    return '';
  }

  const index = headers.indexOf(headerName);
  return index >= 0 ? (columns[index] ?? '') : '';
}

export function mapRowValuesByHeaders(
  headers: string[],
  columns: string[],
): Record<string, string> {
  return headers.reduce<Record<string, string>>((acc, header, index) => {
    if (!header) {
      return acc;
    }

    acc[header] = columns[index] ?? '';
    return acc;
  }, {});
}

export function findMatchingHeader(
  headers: string[],
  aliases: string[],
): string | null {
  const normalizedAliases = aliases.map((alias) =>
    normalizeTextToUppercase(alias),
  );

  return (
    headers.find((header) =>
      normalizedAliases.includes(normalizeTextToUppercase(header)),
    ) ?? null
  );
}

export function buildHeaderAliasMap<T extends string>(
  headers: string[],
  headerAliases: Record<T, string[]>,
): Record<T, string | null> {
  return (Object.entries(headerAliases) as [T, string[]][]).reduce(
    (acc, [key, aliases]) => {
      acc[key as T] = findMatchingHeader(headers, aliases);
      return acc;
    },
    {} as Record<T, string | null>,
  );
}

export function normalizeCsvHeaders(headers: string[]): string[] {
  return headers.map((header) => normalizeHeaderText(header));
}
