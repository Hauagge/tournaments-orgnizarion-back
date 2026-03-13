import { FindOptionsWhere } from 'typeorm'
import { PagedRequestDTO } from '../classes'

export type FindManyOptionsType<T> = Partial<PagedRequestDTO<T>> & {
  businessRulesFilter?: FindOptionsWhere<T>
  permissionsFilter?: FindOptionsWhere<T>
}
