// zod-validation.pipe.ts
import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
} from '@nestjs/common';
import { ZodSchema } from 'zod';
import { ValidationError } from 'src/shared/errors/validation.error';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema<any>) {}

  transform(value: any, metadata: ArgumentMetadata) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new ValidationError('Validation failed', result.error.format());
    }
    return result.data;
  }
}
