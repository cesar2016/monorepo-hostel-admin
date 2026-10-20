import { Request, Response, NextFunction } from 'express';
import { CreateProveedorInput, UpdateProveedorInput, ROLES } from '@hotel/shared';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';
import { getEffectiveAreaId } from '../../middlewares/authorize.js';

export const listProveedores = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const areaId = getEffectiveAreaId(req);

    let query = req.supabase!
      .from('proveedores')
      .select('id, area_id, nombre, cuit, contacto, telefono, email, activo, created_at, updated_at')
      .order('nombre');

    if (areaId) {
      query = query.eq('area_id', areaId);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const getProveedorById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { data, error } = await req.supabase!
      .from('proveedores')
      .select('id, area_id, nombre, cuit, contacto, telefono, email, activo, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundError('Proveedor no encontrado');
    }

    res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const createProveedor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.profile?.rol !== ROLES.ENCARGADO || !req.profile.area_id) {
      throw new ForbiddenError('Solo el encargado del área puede registrar proveedores');
    }

    const body = req.body as CreateProveedorInput;
    const { data, error } = await req.supabase!
      .from('proveedores')
      .insert({
        area_id: req.profile.area_id,
        nombre: body.nombre,
        cuit: body.cuit || null,
        contacto: body.contacto || null,
        telefono: body.telefono || null,
        email: body.email || null,
      })
      .select('id, area_id, nombre, cuit, contacto, telefono, email, activo, created_at, updated_at')
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
};

export const updateProveedor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body as UpdateProveedorInput;

    const { data, error } = await req.supabase!
      .from('proveedores')
      .update({
        ...(body.nombre !== undefined && { nombre: body.nombre }),
        ...(body.cuit !== undefined && { cuit: body.cuit || null }),
        ...(body.contacto !== undefined && { contacto: body.contacto || null }),
        ...(body.telefono !== undefined && { telefono: body.telefono || null }),
        ...(body.email !== undefined && { email: body.email || null }),
        ...(body.activo !== undefined && { activo: body.activo }),
      })
      .eq('id', id)
      .select('id, area_id, nombre, cuit, contacto, telefono, email, activo, created_at, updated_at')
      .single();

    if (error || !data) {
      throw error || new NotFoundError('Proveedor no encontrado o sin permisos');
    }

    res.json({ data });
  } catch (error) {
    next(error);
  }
};
