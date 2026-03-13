import { HttpStatus } from '@nestjs/common';
import {
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { In } from 'typeorm/find-options/operator/In';
import { TypeormFindManyAdapter } from '../adapters';
import { FindManyOptionsType } from '../types';
import { ExceptionReasonDTO } from '../classes/dtos';
import { ExceptionDTO } from '../classes/dtos/exception.dto';

export class BaseRepository<T extends ObjectLiteral> extends Repository<T> {
  protected resourceName = 'Resource';
  protected resourceLabel = 'Recurso';

  protected NotFound(ptMessage?: string) {
    return new ExceptionReasonDTO(
      `Find ${this.resourceName}`,
      `Could not to find ${this.resourceName.toLowerCase()}.`,
      ptMessage ?? `${this.resourceLabel} não encontrado(a).`,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }

  async assertEveryExistsByIds(ids: Array<any>): Promise<void> {
    const entities = await this.findBy({
      id: In(ids),
    } as unknown as FindOptionsWhere<T>);
    const notFoundIds = ids.filter(
      (id) => !entities.some((entity) => id == entity.id),
    );
    if (notFoundIds.length)
      throw ExceptionDTO.withWarnings(
        `Some entities were not found`,
        notFoundIds.map(
          (entity) =>
            new ExceptionReasonDTO(
              `Find ${this.resourceName}`,
              `Could not to find ${this.resourceName.toLowerCase()} with id ${entity.id}`,
              `${this.resourceLabel} não encontrado(a).`,
              undefined,
              HttpStatus.NOT_FOUND,
            ),
        ),
        HttpStatus.NOT_FOUND,
      );
  }

  override async findOneOrFail(options: FindOneOptions<T>): Promise<T> {
    const entity = await super.findOne(options);
    if (!entity) throw this.NotFound();
    return entity;
  }

  async findMany(
    query: FindManyOptionsType<T>,
    options: FindManyOptions<T> = {},
  ): Promise<[T[], number]> {
    const findManyAdapter = new TypeormFindManyAdapter();
    const skip = query.page;
    const take = query.pageSize;
    const order = query.order;
    const relations = query.includes?.map(String);

    const filters = new Array<FindOptionsWhere<T>>();
    if (query.filter) filters.push(findManyAdapter.adaptFilter(query.filter));
    if (query.permissionsFilter)
      filters.push(findManyAdapter.adaptFilter(query.permissionsFilter));

    const search = query.search
      ? findManyAdapter.adaptSearch(query.search)
      : [{}];
    const where = this.mergeFilters(search, filters);
    return super.findAndCount({
      ...options,
      where,
      relations,
      order,
      take,
      skip,
    });
  }

  private mergeFilters(
    searchOptions: FindOptionsWhere<T>[],
    filterOptions: FindOptionsWhere<any>[],
  ) {
    let combinedQuery = searchOptions;

    for (const filter of filterOptions) {
      const filterKeys = Object.keys(filter);

      combinedQuery = combinedQuery.map((searchOptions) => {
        for (const key of Object.keys(searchOptions)) {
          if (filterKeys.includes(key)) {
            filter[key] = { ...searchOptions[key], ...filter[key] };
          }
        }
        return Object.assign(searchOptions, filter);
      });
    }

    return combinedQuery;
  }
}
