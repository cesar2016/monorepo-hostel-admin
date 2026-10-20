import { Request, Response, NextFunction } from 'express';
import exceljs from 'exceljs';
import { getEffectiveAreaId } from '../../middlewares/authorize.js';
import { FORMATOS_EXPORT } from '@hotel/shared';

function buildMovimientosQuery(req: Request) {
  const areaId = getEffectiveAreaId(req);
  const { desde, hasta, productoId, tipo, nroFactura, q } = req.query as Record<string, string | undefined>;

  let query = req.supabase!
    .from('v_movimientos')
    .select('*', { count: 'exact' });

  if (areaId) {
    query = query.eq('area_id', areaId);
  }

  if (desde) {
    query = query.gte('fecha', desde);
  }

  if (hasta) {
    query = query.lte('fecha', hasta);
  }

  if (productoId) {
    query = query.eq('producto_id', productoId);
  }

  if (tipo) {
    query = query.eq('tipo', tipo);
  }

  if (nroFactura) {
    query = query.ilike('nro_factura', `%${nroFactura}%`);
  }

  if (q) {
    query = query.or(`producto_nombre.ilike.%${q}%,nro_factura.ilike.%${q}%,proveedor_nombre.ilike.%${q}%`);
  }

  return query;
}

export const listMovimientos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || '20', 10)));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = buildMovimientosQuery(req);
    query = query.order('fecha', { ascending: false }).order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
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

export const exportMovimientos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const formato = req.query.formato === FORMATOS_EXPORT.CSV ? FORMATOS_EXPORT.CSV : FORMATOS_EXPORT.XLSX;

    let query = buildMovimientosQuery(req);
    query = query.order('fecha', { ascending: false }).order('created_at', { ascending: false }).limit(5000);

    const { data, error } = await query;
    if (error) throw error;

    const workbook = new exceljs.Workbook();
    workbook.creator = 'Sistema de Inventarios - Hotel';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Movimientos');

    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Tipo', key: 'tipo', width: 10 },
      { header: 'Área', key: 'area_nombre', width: 18 },
      { header: 'Producto', key: 'producto_nombre', width: 28 },
      { header: 'SKU', key: 'sku', width: 14 },
      { header: 'Cantidad', key: 'cantidad', width: 12 },
      { header: 'Unidad', key: 'unidad_codigo', width: 10 },
      { header: 'Costo Unitario ($)', key: 'costo_unitario', width: 16 },
      { header: 'N° Factura', key: 'nro_factura', width: 18 },
      { header: 'Proveedor', key: 'proveedor_nombre', width: 24 },
      { header: 'Motivo', key: 'motivo', width: 30 },
      { header: 'Registrado Por', key: 'created_by_nombre', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    (data || []).forEach((row) => {
      worksheet.addRow({
        fecha: row.fecha,
        tipo: row.tipo?.toUpperCase(),
        area_nombre: row.area_nombre,
        producto_nombre: row.producto_nombre,
        sku: row.sku || '-',
        cantidad: Number(row.cantidad),
        unidad_codigo: row.unidad_codigo,
        costo_unitario: row.costo_unitario ? Number(row.costo_unitario) : '-',
        nro_factura: row.nro_factura || '-',
        proveedor_nombre: row.proveedor_nombre || '-',
        motivo: row.motivo || row.observaciones || '-',
        created_by_nombre: row.created_by_nombre || '-',
      });
    });

    const timestamp = new Date().toISOString().slice(0, 10);

    if (formato === FORMATOS_EXPORT.CSV) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="movimientos_${timestamp}.csv"`);
      await workbook.csv.write(res);
      res.end();
      return;
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="movimientos_${timestamp}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};
