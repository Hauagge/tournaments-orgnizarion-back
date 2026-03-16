import { HttpStatus } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { NotFoundError } from './not-found.error';
import { ValidationError } from './validation.error';

describe('Shared errors', () => {
  it('should build NotFoundError payload', () => {
    const error = new NotFoundError('Missing resource', { id: 1 });

    expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(error.getResponse()).toEqual({
      data: null,
      error: {
        code: 'NOT_FOUND',
        message: 'Missing resource',
        details: { id: 1 },
      },
    });
  });

  it('should build ValidationError payload', () => {
    const error = new ValidationError('Invalid payload', { field: 'name' });

    expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect(error.getResponse()).toEqual({
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid payload',
        details: { field: 'name' },
      },
    });
  });

  it('should default details to null when omitted', () => {
    const notFoundError = new NotFoundError();
    const validationError = new ValidationError();

    expect(notFoundError.getResponse()).toEqual({
      data: null,
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
        details: null,
      },
    });

    expect(validationError.getResponse()).toEqual({
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: null,
      },
    });
  });
});
