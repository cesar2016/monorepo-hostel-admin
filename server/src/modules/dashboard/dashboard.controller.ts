import { Request, Response, NextFunction } from 'express';
import { getEffectiveAreaId } from '../../middlewares/authorize.js';
import { ROLES } from '@hotel/shared';

export const getDashboardSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const isEncargado = req.profile?.rol === ROLES.ENCARGADO;
    const effectiveAreaId = getEffectiveAreaId(req);

    // 1. Stock y alertas
    let stockQuery = req.supabase!.from('v_stock').select('*');
    if (effectiveAreaId) {
      stockQuery = stockQuery.eq('area_id', effectiveAreaId);
    }
    const { data: stockItems, error: stockError } = await stockQuery;
    if (stockError) throw stockError;

    const totalProductos = stockItems?.length || 0;
    const productosBajoMinimo = stockItems?.filter((s) => s.bajo_minimo) || [];
    const totalBajoMinimo = productosBajoMinimo.length;

    // 2. Últimos movimientos
    let movQuery = req.supabase!
      .from('v_movimientos')
      .select('*')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(8);

    if (effectiveAreaId) {
      movQuery = movQuery.eq('area_id', effectiveAreaId);
    }
    const { data: ultimosMovimientos, error: movError } = await movQuery;
    if (movError) throw movError;

    // 3. Si es Admin / Super Admin: áreas activas y resumen por área
    let areasSummary = null;
    if (!isEncargado) {
      const { data: areas, error: areasError } = await req.supabase!
        .from('areas')
        .select('id, nombre, activa')
        .order('nombre');

      if (!areasError && areas) {
        areasSummary = areas.map((a) => {
          const areaStock = stockItems?.filter((s) => s.area_id === a.id) || [];
          return {
            id: a.id,
            nombre: a.nombre,
            activa: a.activa,
            totalProductos: areaStock.length,
            bajoMinimo: areaStock.filter((s) => s.bajo_minimo).length,
          };
        });
      }
    }

    res.json({
      data: {
        rol: req.profile?.rol,
        areaId: effectiveAreaId,
        metricas: {
          totalProductos,
          totalBajoMinimo,
          productosCriticos: productosBajoMinimo.slice(0, 5),
        },
        ultimosMovimientos: ultimosMovimientos || [],
        areasSummary,
      },
    });
  } catch (error) {
    next(error);
  }
};
