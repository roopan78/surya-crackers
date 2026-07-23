import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodEffects } from 'zod';
import { ApiError } from '../utils/ApiError';

type Schema = AnyZodObject | ZodEffects<AnyZodObject>;

/** Validates and replaces req.body/query/params with their parsed (and coerced/defaulted) values. */
export function validate(schema: Schema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      throw ApiError.badRequest('Validation failed', result.error.flatten().fieldErrors);
    }
    req[source] = result.data;
    next();
  };
}
