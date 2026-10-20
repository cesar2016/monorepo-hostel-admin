import { Request, Response, NextFunction } from 'express';
import { adminClient } from '../../lib/supabase.js';
import { NotFoundError, AppError } from '../../lib/errors.js';
import { CreateUsuarioInput, UpdateUsuarioInput, ROLES, Database } from '@hotel/shared';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export const listUsuarios = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, error } = await req.supabase!
      .from('profiles')
      .select('id, nombre, email, rol, area_id, activo, created_at, updated_at, areas:profiles_area_id_fkey(nombre)')
      .order('nombre');

    if (error) throw error;
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const createUsuario = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body as CreateUsuarioInput;

    // Crear usuario en Supabase Auth usando adminClient (service_role)
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        nombre: body.nombre,
      },
      app_metadata: {
        rol: body.rol,
        area_id: body.rol === ROLES.ENCARGADO ? body.area_id : null,
      },
    });

    if (authError || !authUser.user) {
      throw new AppError(authError?.message || 'Error al crear el usuario en el servicio de autenticación', 400);
    }

    // Asegurar que el perfil quede activo y con los campos correctos
    await adminClient
      .from('profiles')
      .update({
        nombre: body.nombre,
        rol: body.rol,
        area_id: body.rol === ROLES.ENCARGADO ? body.area_id : null,
        activo: true,
      })
      .eq('id', authUser.user.id);

    // Consultamos el perfil para devolverlo
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, nombre, email, rol, area_id, activo, created_at, updated_at, areas:profiles_area_id_fkey(nombre)')
      .eq('id', authUser.user.id)
      .single();

    if (profileError) throw profileError;

    res.status(201).json({ data: profile });
  } catch (error) {
    next(error);
  }
};

export const updateUsuario = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body as UpdateUsuarioInput;

    // 1. Actualizar perfil en la base de datos (aplica las reglas y triggers de Postgres)
    const updatePayload: ProfileUpdate = {};
    if (body.nombre !== undefined) updatePayload.nombre = body.nombre;
    if (body.rol !== undefined) {
      updatePayload.rol = body.rol;
      updatePayload.area_id = body.rol === ROLES.ENCARGADO ? body.area_id : null;
    } else if (body.area_id !== undefined) {
      updatePayload.area_id = body.area_id;
    }
    if (body.activo !== undefined) updatePayload.activo = body.activo;

    const { data: updatedProfile, error: profileError } = await req.supabase!
      .from('profiles')
      .update(updatePayload)
      .eq('id', id)
      .select('id, nombre, email, rol, area_id, activo, created_at, updated_at, areas:profiles_area_id_fkey(nombre)')
      .single();

    if (profileError || !updatedProfile) {
      throw profileError || new NotFoundError('Usuario no encontrado');
    }

    // 2. Sincronizar contraseña o metadata en Supabase Auth si cambiaron
    const authUpdatePayload: Record<string, unknown> = {};
    if (body.password) {
      authUpdatePayload.password = body.password;
    }
    if (body.nombre || body.rol) {
      authUpdatePayload.user_metadata = { nombre: updatedProfile.nombre };
      authUpdatePayload.app_metadata = {
        rol: updatedProfile.rol,
        area_id: updatedProfile.area_id,
      };
    }

    if (Object.keys(authUpdatePayload).length > 0) {
      await adminClient.auth.admin.updateUserById(id, authUpdatePayload);
    }

    res.json({ data: updatedProfile });
  } catch (error) {
    next(error);
  }
};

export const listAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || '30', 10)));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await req.supabase!
      .from('audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    res.json({
      data: data || [],
      pagination: {
        page,
        pageSize,
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
};
