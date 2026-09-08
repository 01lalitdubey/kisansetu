import { z, ZodSchema } from 'zod';
import { ApiError } from './response';

/**
 * Parse `data` with `schema`; on failure throw a 400 ApiError carrying the
 * flattened field errors. Controllers call this on req.body / req.params /
 * req.query so the frontend is never trusted.
 */
export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ApiError(400, 'Validation failed', result.error.flatten().fieldErrors);
  }
  return result.data;
}

// Reusable primitives -------------------------------------------------------

export const idSchema = z.string().min(1, 'id is required');

export const mobileSchema = z
  .string()
  .trim()
  .regex(/^[0-9+\- ]{10,15}$/, 'mobile must be 10-15 digits');

export const quantitySchema = z
  .number({ invalid_type_error: 'quantity must be a number' })
  .positive('quantity must be greater than 0')
  .max(100000, 'quantity is unrealistically large');

export const languageSchema = z.enum(['en', 'hi', 'hinglish']).default('en');

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
