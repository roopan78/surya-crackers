import { z } from 'zod';

const emailSchema = z.string().email('A valid email address is required');
const mobileSchema = z.string().regex(/^[0-9]{10}$/, 'Mobile number must be 10 digits');

export const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Please enter your name').max(100),
  mobile: mobileSchema.optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const googleLoginSchema = z.object({
  idToken: z.string().min(1, 'Google credential is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100),
  mobile: mobileSchema.optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
