import { Request, Response, NextFunction } from 'express';
import { getEffectiveAreaId } from '../../middlewares/authorize.js';

export const listStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const areaId = getEffectiveAreaId(req);
    const soloBajoMinimo = req.query.soloBajoMinimo === 'true';
    const q = req.query.q as string | undefined;

    let query = req.supabase!
      .from('v_stock')
      .select('*')
      .order('nombre');

    if (areaId) {
      query = query.eq('area_id', areaId);
    }

    if (soloBajoMinimo) {
      query = query.eq('bajo_minimo', true);
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
