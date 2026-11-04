import { z } from 'zod';
import { passwordSchema } from '@/lib/password-policy';

export const resetScopeSchema = z.enum(['resident', 'admin', 'clinic']);
export type ResetScope = z.infer<typeof resetScopeSchema>;
export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email('Enter a valid email address.')),
  scope: resetScopeSchema,
});
export const verifyResetOtpSchema = z.object({ otp: z.string().regex(/^\d{6}$/, 'Enter the six-digit code.') });
export const resetPasswordSchema = z.object({
  // bcrypt accepts at most 72 UTF-8 bytes. Avoid silently truncated new credentials.
  password: passwordSchema.refine(value => new TextEncoder().encode(value).length <= 72, 'Password must be at most 72 bytes.'),
  confirmPassword: z.string().min(1, 'Please confirm your password.'),
}).refine(value => value.password === value.confirmPassword, {
  message: 'Passwords do not match.', path: ['confirmPassword'],
});
export const resetLoginPaths = { resident: '/Login', admin: '/AdminLogin', clinic: '/ClinicLogin' } as const;
