import { HttpException, HttpStatus } from '@nestjs/common';

export class ValidationError extends HttpException {
  constructor(message = 'Validation failed', details?: unknown) {
    super(
      {
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message,
          details: details ?? null,
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
