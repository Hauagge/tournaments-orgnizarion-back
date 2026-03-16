import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ValidationError } from 'src/shared/errors/validation.error';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  it('should return parsed data on success', () => {
    const pipe = new ZodValidationPipe(
      z.object({
        id: z.coerce.number().int().positive(),
      }),
    );

    const result = pipe.transform(
      { id: '10' },
      {
        type: 'param',
        metatype: Object,
        data: 'id',
      },
    );

    expect(result).toEqual({ id: 10 });
  });

  it('should throw ValidationError on invalid input', () => {
    const pipe = new ZodValidationPipe(
      z.object({
        id: z.coerce.number().int().positive(),
      }),
    );

    expect(() =>
      pipe.transform(
        { id: '0' },
        {
          type: 'param',
          metatype: Object,
          data: 'id',
        },
      ),
    ).toThrow(ValidationError);
  });
});
