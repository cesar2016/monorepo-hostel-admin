import { Request, Response, NextFunction } from 'express';

export const listUnidades = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, error } = await req.supabase!
      .from('unidades_medida')
      .select('id, codigo, nombre, permite_decimales, activa')
      .eq('activa', true)
      .order('id');

    if (error) throw error;
    res.json({ data });
  } catch (error) {
    next(error);
  }
};
