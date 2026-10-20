import { Request, Response, NextFunction } from 'express';
import { CreateIngresoInput, UpdateIngresoInput } from '@hotel/shared';
import { NotFoundError } from '../../lib/errors.js';
import { getEffectiveAreaId } from '../../middlewares/authorize.js';

export const listIngresos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const areaId = getEffectiveAreaId(req);

    let query = req.supabase!
      .from('ingresos')
      .select('id, area_id, proveedor_id, nro_factura, fecha, observaciones, created_at, updated_at, created_by, proveedores(nombre, cuit), areas(nombre), profiles:created_by(nombre)')
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

export const getIngresoById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: ingreso, error: ingresoError } = await req.supabase!
      .from('ingresos')
      .select('id, area_id, proveedor_id, nro_factura, fecha, observaciones, created_at, updated_at, created_by, proveedores(nombre, cuit), areas(nombre), profiles:created_by(nombre)')
      .eq('id', id)
      .single();

    if (ingresoError || !ingreso) {
      throw new NotFoundError('Ingreso no encontrado');
    }

    const { data: items, error: itemsError } = await req.supabase!
      .from('ingreso_items')
      .select('id, producto_id, cantidad, costo_unitario, productos(nombre, sku, unidad_id, unidades_medida(codigo, nombre))')
      .eq('ingreso_id', id);

    if (itemsError) throw itemsError;

    res.json({
      data: {
        ...ingreso,
        items: items || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createIngreso = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body as CreateIngresoInput;

    const { data, error } = await req.supabase!.rpc('registrar_ingreso', {
      p_proveedor_id: body.proveedor_id,
      p_nro_factura: body.nro_factura,
      p_fecha: body.fecha,
      p_observaciones: body.observaciones || '',
      p_items: body.items,
    });

    if (error) throw error;
    res.status(201).json({ data: { id: data } });
  } catch (error) {
    next(error);
  }
};

export const updateIngreso = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body as UpdateIngresoInput;

    const { data, error } = await req.supabase!.rpc('actualizar_ingreso', {
      p_ingreso_id: id,
      p_proveedor_id: body.proveedor_id,
      p_nro_factura: body.nro_factura,
      p_fecha: body.fecha,
      p_observaciones: body.observaciones || '',
      p_items: body.items,
    });

    if (error) throw error;
    res.json({ data: { id: data } });
  } catch (error) {
    next(error);
  }
};
