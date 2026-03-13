import {
  FindManyOptions,
  Like,
  FindOptionsWhere,
  Between,
  In,
  Equal,
} from 'typeorm';

type GenericOrder<T> = Partial<Record<keyof T, 'asc' | 'desc'>>;
type DateRange = [string | Date, string | Date];

type BuildFindOptionsInput<T> = {
  search?: string;
  filter?: Partial<Record<keyof T, any>>;
  order?: GenericOrder<T>;
  includes?: (keyof T)[];
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
      } else if (isDate(value)) {
        where[typedKey] = Equal(new Date(value)) as any;
      } else {
        where[typedKey] = value;
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

function isDate(value: any): boolean {
  return (
    typeof value === 'string' &&
    !isNaN(Date.parse(value)) &&
    value.match(/^\d{4}-\d{2}-\d{2}/)
  );
}

function isDateRange(value: any): value is DateRange {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    isDate(value[0]) &&
    isDate(value[1])
  );
}
