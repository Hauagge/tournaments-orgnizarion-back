import { HttpException, HttpStatus } from '@nestjs/common';

export class NotFoundError extends HttpException {
  constructor(message = 'Resource not found', details?: unknown) {
    super(
      {
        data: null,
        error: {
          code: 'NOT_FOUND',
          message,
          details: details ?? null,
        },
      },
      HttpStatus.NOT_FOUND,
    );
  }
}
