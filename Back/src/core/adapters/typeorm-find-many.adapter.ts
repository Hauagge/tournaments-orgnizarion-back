import {
  Between,
  FindOperator,
  FindOptionsWhere,
  ILike,
  In,
  IsNull,
  LessThanOrEqual,
  Like,
  MoreThanOrEqual,
} from 'typeorm';
import { IFindManyAdapter } from './interfaces/find-many.adapter.interface';

export class TypeormFindManyAdapter<Entity>
  implements IFindManyAdapter<Entity>
{
  adaptFilter(filter: { [x in keyof Entity]?: any }): FindOptionsWhere<Entity> {
    const where: FindOptionsWhere<Entity> = {};

    for (const [key, value] of Object.entries(filter)) {
      if (value === undefined) continue;

      if (value === null) where[key] = IsNull();
      // else if (isArrayOfObjects(value) && Array.isArray(value)) where[key] = In(value.map((item) => this.adaptFilter(item)))
      else if (Array.isArray(value)) where[key] = In(value);
      else if (this.isFindOperator(value)) where[key] = value;
      else if (this.isValueDateFilter(value))
        where[key] = this.adaptDateFilter(value);
      else if (typeof value === 'object')
        where[key] = this.adaptFilter(filter[key]);
      else if (typeof value === 'string') where[key] = Like(`%${value}%`);
      else where[key] = value;
    }
    return where;
  }

  adaptSearch(search: {
    [x in keyof Entity]?: any;
  }): FindOptionsWhere<Entity>[] {
    function extractPaths(obj: any, parent?: string, res = {}) {
      for (const key in obj) {
        const propName = parent ? parent + '.' + key : key;
        if (obj[key] === undefined) continue;

        if (typeof obj[key] == 'object') {
          extractPaths(obj[key], propName, res);
        } else if (typeof obj[key] == 'string') {
          res[propName] = ILike(`%${obj[key]}%`);
        } else {
          res[propName] = obj[key];
        }
      }
      return res;
    }

    function pathToObject(path: string, value: any, obj = {}) {
      const allKeys = path.split('.');
      const [key] = path.split('.');
      const remainingKeys = allKeys.splice(1);

      if (remainingKeys.length) {
        obj[key] = {};
        pathToObject(remainingKeys.join('.'), value, obj[key]);
      } else obj[key] = value;
      return obj;
    }

    const objectPathsMap = extractPaths(search);
    return Object.entries(objectPathsMap).map(([key, value]) =>
      pathToObject(key, value),
    );
  }

  private isValueDateFilter(value: any): boolean {
    return value['to'] || value['from'];
  }

  private isFindOperator(value: unknown): value is FindOperator<Entity> {
    return (
      typeof value == 'object' &&
      Object.getPrototypeOf(value)?.constructor?.name == 'FindOperator'
    );
  }

  adaptDateFilter(value: any): any {
    if (value['to'] && value['from'])
      return Between(value['from'], value['to']);
    if (value['from']) return MoreThanOrEqual(value['from']);
    return LessThanOrEqual(value['to']);
  }
}
