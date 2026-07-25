import { z } from 'zod';

export const sendOtpSchema = z.object({
  mobile: z.string().min(10, 'A valid mobile number is required'),
});

export const verifyOtpSchema = z.object({
  mobile: z.string().min(10, 'A valid mobile number is required'),
  code: z.string().length(6, 'OTP must be 6 digits'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
