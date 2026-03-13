import { GenericEntityFilterType } from '@/core/types';
import { FindOptionsOrder } from 'typeorm';

export type PagedRequestDTO<T> = {
  page: number;
  pageSize: number;
  search?: GenericEntityFilterType<T>;
  filter?: GenericEntityFilterType<T>;
  order?: FindOptionsOrder<T>;
  includes?: string[];
};
