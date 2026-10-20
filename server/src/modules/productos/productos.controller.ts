import { Request, Response, NextFunction } from 'express';
import { CreateProductoInput, UpdateProductoInput, ROLES } from '@hotel/shared';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';
import { getEffectiveAreaId } from '../../middlewares/authorize.js';

export const listProductos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const areaId = getEffectiveAreaId(req);
    const activo = req.query.activo as string | undefined;
    const q = req.query.q as string | undefined;

    let query = req.supabase!
      .from('productos')
      .select('id, area_id, nombre, sku, unidad_id, stock_minimo, activo, created_at, updated_at, unidades_medida(codigo, nombre, permite_decimales)')
      .order('nombre');

    if (areaId) {
      query = query.eq('area_id', areaId);
    }

    if (activo !== undefined) {
      query = query.eq('activo', activo === 'true');
    }

    if (q) {
      query = query.ilike('nombre', `%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const getProductoById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { data, error } = await req.supabase!
      .from('productos')
      .select('id, area_id, nombre, sku, unidad_id, stock_minimo, activo, created_at, updated_at, unidades_medida(codigo, nombre, permite_decimales)')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundError('Producto no encontrado');
    }

    res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const createProducto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.profile?.rol !== ROLES.ENCARGADO || !req.profile.area_id) {
      throw new ForbiddenError('Solo el encargado del área puede registrar productos');
    }

    const body = req.body as CreateProductoInput;
    const { data, error } = await req.supabase!
      .from('productos')
      .insert({
        area_id: req.profile.area_id,
        nombre: body.nombre,
        sku: body.sku || null,
        unidad_id: body.unidad_id,
        stock_minimo: body.stock_minimo ?? 0,
      })
      .select('id, area_id, nombre, sku, unidad_id, stock_minimo, activo, created_at, updated_at, unidades_medida(codigo, nombre, permite_decimales)')
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
};

export const updateProducto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body as UpdateProductoInput;

    const { data, error } = await req.supabase!
      .from('productos')
      .update({
        ...(body.nombre !== undefined && { nombre: body.nombre }),
        ...(body.sku !== undefined && { sku: body.sku || null }),
        ...(body.unidad_id !== undefined && { unidad_id: body.unidad_id }),
        ...(body.stock_minimo !== undefined && { stock_minimo: body.stock_minimo }),
        ...(body.activo !== undefined && { activo: body.activo }),
      })
      .eq('id', id)
      .select('id, area_id, nombre, sku, unidad_id, stock_minimo, activo, created_at, updated_at, unidades_medida(codigo, nombre, permite_decimales)')
      .single();

    if (error || !data) {
      throw error || new NotFoundError('Producto no encontrado o sin permisos');
    }

    res.json({ data });
  } catch (error) {
    next(error);
  }
};
