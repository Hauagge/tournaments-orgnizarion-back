import {
  GenericEntityDateFilterType,
  GenericEntityFilterType,
} from 'src/core/types';

export interface IFindManyAdapter<Entity> {
  adaptFilter(
    dto: GenericEntityFilterType<Entity>,
  ): GenericEntityFilterType<Entity>;
  adaptSearch(
    dto: GenericEntityFilterType<Entity>,
  ): GenericEntityFilterType<Entity>[];
  adaptDateFilter(dto: GenericEntityDateFilterType<Entity>): any;
}
