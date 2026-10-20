import { Request, Response, NextFunction } from 'express';
import { CreateEgresoInput, UpdateEgresoInput, ROLES } from '@hotel/shared';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';
import { getEffectiveAreaId } from '../../middlewares/authorize.js';

export const listEgresos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const areaId = getEffectiveAreaId(req);

    let query = req.supabase!
      .from('egresos')
      .select('id, area_id, producto_id, cantidad, fecha, motivo, created_at, updated_at, created_by, productos(nombre, sku, unidad_id, unidades_medida(codigo, nombre)), areas(nombre), profiles:created_by(nombre)')
      .order('fecha', { ascending: false });

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

export const getEgresoById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const { data, error } = await req.supabase!
      .from('egresos')
      .select('id, area_id, producto_id, cantidad, fecha, motivo, created_at, updated_at, created_by, productos(nombre, sku, unidad_id, unidades_medida(codigo, nombre)), areas(nombre), profiles:created_by(nombre)')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundError('Egreso no encontrado');
    }

    res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const createEgreso = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.profile?.rol !== ROLES.ENCARGADO || !req.profile.area_id) {
      throw new ForbiddenError('Solo el encargado del área puede registrar egresos');
    }

    const body = req.body as CreateEgresoInput;

    const { data, error } = await req.supabase!
      .from('egresos')
      .insert({
        area_id: req.profile.area_id,
        producto_id: body.producto_id,
        cantidad: body.cantidad,
        fecha: body.fecha,
        motivo: body.motivo,
      })
      .select('id, area_id, producto_id, cantidad, fecha, motivo, created_at, updated_at, created_by')
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
};

export const updateEgreso = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body as UpdateEgresoInput;

    const { data, error } = await req.supabase!
      .from('egresos')
      .update({
        producto_id: body.producto_id,
        cantidad: body.cantidad,
        fecha: body.fecha,
        motivo: body.motivo,
      })
      .eq('id', id)
      .select('id, area_id, producto_id, cantidad, fecha, motivo, created_at, updated_at, created_by')
      .single();

    if (error || !data) {
      throw error || new NotFoundError('Egreso no encontrado o sin permisos');
    }

    res.json({ data });
  } catch (error) {
    next(error);
  }
};
