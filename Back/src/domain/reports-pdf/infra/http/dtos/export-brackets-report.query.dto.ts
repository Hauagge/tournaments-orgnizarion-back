import { z } from 'zod';

const booleanLike = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return false;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    return value.toLowerCase() === 'true';
  });

export const ExportBracketsReportQuerySchema = z.object({
  includeResults: booleanLike,
  categoryId: z.coerce.number().int().positive().optional(),
  areaId: z.coerce.number().int().positive().optional(),
});

export type ExportBracketsReportQueryDto = z.infer<
  typeof ExportBracketsReportQuerySchema
>;
