import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email({ message: 'El correo electrónico no es válido' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const recoverPasswordSchema = z.object({
  email: z.string().trim().email({ message: 'El correo electrónico no es válido' }),
});

export type RecoverPasswordInput = z.infer<typeof recoverPasswordSchema>;

export const resetPasswordSchema = z.object({
  password: z.string().min(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' }),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
