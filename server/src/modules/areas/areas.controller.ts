import { Request, Response, NextFunction } from 'express';
import { CreateAreaInput, UpdateAreaInput } from '@hotel/shared';
import { NotFoundError } from '../../lib/errors.js';

export const listAreas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, error } = await req.supabase!
      .from('areas')
      .select('id, nombre, descripcion, activa, created_at, updated_at')
      .order('nombre');

    if (error) throw error;
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const getAreaById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { data, error } = await req.supabase!
      .from('areas')
      .select('id, nombre, descripcion, activa, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundError('Área no encontrada');
    }

    res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const createArea = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body as CreateAreaInput;
    const { data, error } = await req.supabase!
      .from('areas')
      .insert({
        nombre: body.nombre,
        descripcion: body.descripcion || null,
      })
      .select('id, nombre, descripcion, activa, created_at, updated_at')
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
};

export const updateArea = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body as UpdateAreaInput;

    const { data, error } = await req.supabase!
      .from('areas')
      .update({
        ...(body.nombre !== undefined && { nombre: body.nombre }),
        ...(body.descripcion !== undefined && { descripcion: body.descripcion }),
        ...(body.activa !== undefined && { activa: body.activa }),
      })
      .eq('id', id)
      .select('id, nombre, descripcion, activa, created_at, updated_at')
      .single();

    if (error || !data) {
      throw error || new NotFoundError('Área no encontrada');
    }

    res.json({ data });
  } catch (error) {
    next(error);
  }
};
