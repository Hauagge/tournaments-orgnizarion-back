import { Injectable } from '@nestjs/common';
import {
  buildHeaderAliasMap,
  getColumnValueByHeader,
  mapRowValuesByHeaders,
  normalizeCsvHeaders,
  parseCsvText,
} from '../../../../core/helper/csv.helper';
import { parseDateFromText } from '../../../../core/helper/date.helper';
import { parseMassToGrams } from '../../../../core/helper/measurement.helper';
import { normalizeWhitespace } from '../../../../core/helper/string.helper';

export type ParsedAthleteImportRow = {
  lineNumber: number;
  raw: Record<string, string>;
  athlete: {
    fullName: string;
    birthDate: Date;
    belt: string;
    declaredWeightGrams: number;
    academyName: string | null;
    phone: string | null;
    age: string | null;
  } | null;
  errors: string[];
};

type HeaderMap = {
  fullName: string | null;
  birthDate: string | null;
  belt: string | null;
  declaredWeightKg: string | null;
  academyName: string | null;
  phone: string | null;
  age: string | null;
};

@Injectable()
export class AthleteImportCsvService {
  parse(csvText: string): ParsedAthleteImportRow[] {
    const rows = parseCsvText(csvText);

    if (rows.length === 0) {
      return [];
    }

    const headers = normalizeCsvHeaders(rows[0]);
    const headerMap = this.buildHeaderMap(headers);

    return rows.slice(1).map((columns, index) => {
      const lineNumber = index + 2;
      const raw = mapRowValuesByHeaders(headers, columns);
      const errors: string[] = [];

      const fullName = normalizeWhitespace(
        getColumnValueByHeader(columns, headers, headerMap.fullName),
      );
      const birthDateInput = normalizeWhitespace(
        getColumnValueByHeader(columns, headers, headerMap.birthDate),
      );
      const belt = normalizeWhitespace(
        getColumnValueByHeader(columns, headers, headerMap.belt),
      );
      const declaredWeightKgInput = normalizeWhitespace(
        getColumnValueByHeader(columns, headers, headerMap.declaredWeightKg),
      );
      const academyNameValue = normalizeWhitespace(
        getColumnValueByHeader(columns, headers, headerMap.academyName),
      );
      const phoneValue = normalizeWhitespace(
        getColumnValueByHeader(columns, headers, headerMap.phone),
      );
      const ageValue = normalizeWhitespace(
        getColumnValueByHeader(columns, headers, headerMap.age),
      );

      if (!fullName) {
        errors.push('Nome e obrigatorio.');
      }

      const birthDate = parseDateFromText(birthDateInput);
      if (!birthDate) {
        errors.push('Data de nascimento invalida.');
      }

      if (!belt) {
        errors.push('Faixa e obrigatoria.');
      }

      const declaredWeightGrams = parseMassToGrams(declaredWeightKgInput);
      if (declaredWeightGrams === null) {
        errors.push('Peso invalido.');
      }

      return {
        lineNumber,
        raw,
        athlete:
          errors.length === 0 && birthDate && declaredWeightGrams !== null
            ? {
                fullName,
                birthDate,
                belt,
                declaredWeightGrams,
                academyName: academyNameValue || null,
                phone: phoneValue || null,
                age: ageValue || null,
              }
            : null,
        errors,
      };
    });
  }

  private buildHeaderMap(headers: string[]): HeaderMap {
    return buildHeaderAliasMap(headers, {
      fullName: ['FULLNAME', 'NOME', 'NAME'],
      birthDate: [
        'BIRTHDATE',
        'NASCIMENTO',
        'BIRTH_DATE',
        'DATADEANIVERSARIO',
        'DATA_DE_ANIVERSARIO',
        'DATADENASC',
      ],
      belt: ['BELT', 'FAIXA'],
      declaredWeightKg: [
        'DECLAREDWEIGHTKG',
        'DECLARED_WEIGHT_KG',
        'DECLAREDWEIGHT',
        'DECLARED_WEIGHT',
        'WEIGHT',
        'WIEGHT',
        'PESO',
      ],
      academyName: [
        'ACADEMYNAME',
        'ACADEMY_NAME',
        'ACADEMY',
        'TEAMNAME',
        'TEAM_NAME',
        'TEAM',
        'EQUIPE',
      ],
      phone: ['PHONE', 'PHONE_NUMBER', 'CELLPHONE', 'CELULAR', 'TELEFONE'],
      age: ['AGE', 'IDADE'],
    });
  }
}
