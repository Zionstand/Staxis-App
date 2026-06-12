import * as z from 'zod';

export const LoginSchema = z.object({
  email: z.string().email({ message: 'Enter a valid email address' }),
  password: z.string().min(2, { message: 'Enter your password' }),
});

export type LoginSchemaType = z.infer<typeof LoginSchema>;

export const RegisterSchema = z
  .object({
    firstName: z
      .string()
      .min(2, { message: 'First name must be at least 2 characters' }),
    lastName: z
      .string()
      .min(2, { message: 'Last name must be at least 2 characters' }),
    email: z.string().email({ message: 'Enter a valid email address' }),
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters.' })
      .refine((val) => /[a-z]/.test(val), {
        message: 'Password must contain at least one lowercase letter.',
      })
      .refine((val) => /[A-Z]/.test(val), {
        message: 'Password must contain at least one uppercase letter.',
      })
      .refine((val) => /[0-9]/.test(val), {
        message: 'Password must contain at least one number.',
      })
      .refine((val) => /[!@#$%^&*(),.?":{}|<>]/.test(val), {
        message: 'Password must contain at least one special character.',
      }),
    confirmPassword: z.string().min(2, { message: 'Enter your password' }),
    phoneNumber: z.string().regex(/^(\+?\d{10,15})$/, {
      message: 'Enter a valid phone number.',
    }),
    acceptTerms: z.literal(true, {
      message: 'You must accept the Terms of Service and Privacy Policy.',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterSchemaType = z.infer<typeof RegisterSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Enter a valid email address' }),
});

export type ForgotPasswordSchemaType = z.infer<typeof ForgotPasswordSchema>;

export const VerifyCodeSchema = z.object({
  email: z.string().email().min(2, {
    message: 'Email must be at least 2 characters.',
  }),
  otp: z
    .string()
    .min(6, { message: 'Code must be 6 characters.' })
    .max(6, { message: 'Code must be 6 characters' }),
});

export type VerifyCodeSchemaType = z.infer<typeof VerifyCodeSchema>;

export const NewPasswordSchema = z
  .object({
    otp: z
      .string()
      .min(6, { message: 'Code must be 6 characters.' })
      .max(6, { message: 'Code must be 6 characters' }),
    email: z.string().email().min(2, {
      message: 'Email must be at least 2 characters.',
    }),
    newPassword: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters.' })
      .refine((val) => /[a-z]/.test(val), {
        message: 'Password must contain at least one lowercase letter.',
      })
      .refine((val) => /[A-Z]/.test(val), {
        message: 'Password must contain at least one uppercase letter.',
      })
      .refine((val) => /[0-9]/.test(val), {
        message: 'Password must contain at least one number.',
      })
      .refine((val) => /[!@#$%^&*(),.?":{}|<>]/.test(val), {
        message: 'Password must contain at least one special character.',
      }),
    confirmPassword: z.string().min(2, { message: 'Enter your password' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type NewPasswordSchemaType = z.infer<typeof NewPasswordSchema>;
