import { z, ZodTypeAny } from 'zod';

export type GenericEntityFilterType<Entity> = { [x in keyof Entity]?: any };

export type GenericEntityDateFilterType<Entity> = {
  [x in keyof Entity]?: { from: Date; to: Date };
};

// 🔥 Adaptado para usar Zod
export type GenericEntitySchemaFilterType<Entity> = {
  [K in keyof Entity]?: ZodTypeAny | undefined;
};
