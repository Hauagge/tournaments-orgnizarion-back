import {
  FindManyOptions,
  Like,
  FindOptionsWhere,
  Between,
  In,
  Equal,
  FindOptionsOrder,
} from 'typeorm';

type DateInput = string | Date;
type DateRange = [DateInput, DateInput];
type RelationKey<T> = Extract<keyof T, string>;
type DateLike = string | number | Date;

type BuildFindOptionsInput<T> = {
  search?: string;
  filter?: Partial<Record<keyof T, any>>;
  order?: FindOptionsOrder<T>;
  includes?: RelationKey<T>[];
  searchField?: keyof T; // campo usado para busca textual
  page?: number;
  pageSize?: number;
};
export function buildFindOptions<T>(
  input: BuildFindOptionsInput<T>,
): FindManyOptions<T> {
  const options: FindManyOptions<T> = {};

  const {
    filter,
    order,
    includes,
    search,
    searchField = 'name' as keyof T,
    page = 1,
    pageSize = 10,
  } = input;
  options.skip = (page - 1) * pageSize;
  options.take = pageSize;
  // Relations
  if (includes?.length) {
    options.relations = includes;
  }

  // Order
  if (order) {
    options.order = order;
  }

  // Where
  const where: FindOptionsWhere<T> = {};

  if (filter) {
    for (const [key, value] of Object.entries(filter)) {
      if (value === undefined || value === null) continue;

      const typedKey = key as keyof T;

      if (Array.isArray(value)) {
        if (isDateRange(value)) {
          where[typedKey] = Between(
            new Date(value[0]),
            new Date(value[1]),
          ) as any;
        } else {
          where[typedKey] = In(value) as any;
        }
      } else if (isDateLike(value)) {
        where[typedKey] = Equal(toDate(value)) as any;
      } else {
        where[typedKey] = value as any;
      }
    }
  }

  // Search (apenas se o campo existir)
  if (search) {
    where[searchField] = Like(`%${search}%`) as any;
  }

  if (Object.keys(where).length > 0) {
    options.where = where;
  }

  return options;
}

function isDateLike(v: unknown): v is DateLike {
  if (v instanceof Date) return !Number.isNaN(v.getTime());
  if (typeof v === 'string' || typeof v === 'number') {
    return !Number.isNaN(new Date(v).getTime());
  }
  return false;
}

function isDate(value: any): boolean {
  return (
    typeof value === 'string' &&
    !isNaN(Date.parse(value)) &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  );
}

function toDate(v: DateLike): Date {
  return v instanceof Date ? v : new Date(v);
}

function isDateRange(value: any): value is DateRange {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    isDate(value[0]) &&
    isDate(value[1])
  );
}
