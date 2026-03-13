import { ExceptionReasonDTO } from '../dtos';

export class GenericCTO {
  totalElements?: number;
  exceptionReasonDTOs?: Array<ExceptionReasonDTO>;

  constructor(
    totalElements?: number,
    exceptionReasonDTOs?: Array<ExceptionReasonDTO>,
  ) {
    if (totalElements) this.totalElements = totalElements;
    if (exceptionReasonDTOs) this.exceptionReasonDTOs = exceptionReasonDTOs;
  }
}
