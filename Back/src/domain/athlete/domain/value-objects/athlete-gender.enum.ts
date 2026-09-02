export enum AthleteGender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

const GENDER_ALIASES: Record<string, AthleteGender> = {
  M: AthleteGender.MALE,
  MALE: AthleteGender.MALE,
  MAS: AthleteGender.MALE,
  MASC: AthleteGender.MALE,
  MASCULINO: AthleteGender.MALE,
  H: AthleteGender.MALE,
  HOMEM: AthleteGender.MALE,
  F: AthleteGender.FEMALE,
  FEM: AthleteGender.FEMALE,
  FEMALE: AthleteGender.FEMALE,
  FEMININO: AthleteGender.FEMALE,
  MULHER: AthleteGender.FEMALE,
};

/** Aceita as grafias usadas nas planilhas ("M", "Masculino", "F", ...). */
export function parseAthleteGender(value: unknown): AthleteGender | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toUpperCase();

  return GENDER_ALIASES[normalized] ?? null;
}
