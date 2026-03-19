export function parseMassToGrams(value: string): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/g, '');
  const isGrams = normalized.endsWith('g');
  const isKilograms = normalized.endsWith('kg');
  const numericText = normalized.replace(/kg|g/g, '').replace(',', '.');

  if (!/^\d+(\.\d+)?$/.test(numericText)) {
    return null;
  }

  const numericValue = Number(numericText);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  if (isGrams) {
    return Math.round(numericValue);
  }

  if (isKilograms || numericValue < 500) {
    return Math.round(numericValue * 1000);
  }

  return Math.round(numericValue);
}
