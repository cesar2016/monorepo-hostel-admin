import { Request, Response, NextFunction } from 'express';
import { anonClient, adminClient } from '../../lib/supabase.js';
import { UnauthorizedError } from '../../lib/errors.js';
import { LoginInput, RecoverPasswordInput } from '@hotel/shared';

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body as LoginInput;

    const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user || !authData.session) {
      throw new UnauthorizedError('Credenciales incorrectas');
    }

    // Cargar perfil
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, nombre, email, rol, area_id, activo')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      throw new UnauthorizedError('Perfil de usuario no encontrado');
    }

    if (!profile.activo) {
      throw new UnauthorizedError('Esta cuenta se encuentra inactiva. Contacte al administrador.');
    }

    res.json({
      data: {
        user: profile,
        session: {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
          expires_at: authData.session.expires_at,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json({ data: req.profile });
  } catch (error) {
    next(error);
  }
};

export const recoverPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body as RecoverPasswordInput;

    await anonClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${req.headers.origin || 'http://localhost:5173'}/restablecer-contrasena`,
    });

    res.json({
      message: 'Si el correo está registrado, recibirás un enlace de recuperación.',
    });
  } catch (error) {
    next(error);
  }
};
