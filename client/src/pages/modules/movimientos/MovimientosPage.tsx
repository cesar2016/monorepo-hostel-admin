import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useAuth } from '../../../features/auth/AuthContext';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { Alert } from '../../../components/ui/Alert';
import { formatDate, formatNumber } from '../../../lib/formatters';
import {
  History,
  FileSpreadsheet,
  FileText,
  Search,
  ArrowDownToLine,
  ArrowUpFromLine,
  X,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

interface MovimientoItem {
  id: string;
  tipo: 'INGRESO' | 'EGRESO';
  fecha: string;
  area_id: string;
  area_nombre: string;
  producto_id: string;
  producto_nombre: string;
  sku: string | null;
  unidad_codigo: string;
  cantidad: number;
  nro_factura: string | null;
  proveedor_nombre: string | null;
  motivo: string | null;
  usuario_id: string;
  usuario_nombre: string;
  created_at: string;
}

interface MovimientosResponse {
  data: MovimientoItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const MovimientosPage: React.FC = () => {
  const { isEncargado, effectiveAreaId } = useAuth();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [tipo, setTipo] = useState<'' | 'INGRESO' | 'EGRESO'>('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [q, setQ] = useState('');
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // Parámetros de consulta
  const queryParams = {
    page,
    pageSize,
    areaId: effectiveAreaId || undefined,
    tipo: tipo || undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
    q: q.trim() || undefined,
  };

  const {
    data: response,
    isLoading,
    error,
  } = useQuery<MovimientosResponse>({
    queryKey: ['movimientos', queryParams],
    queryFn: () => api.get<MovimientosResponse>('/movimientos', queryParams),
  });

  const movimientos = response?.data || [];
  const pagination = response?.pagination;

  // Exportar Excel
  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      const filename = `movimientos_${new Date().toISOString().split('T')[0]}.xlsx`;
      await api.download(
        '/movimientos/export/excel',
        {
          areaId: effectiveAreaId || undefined,
          tipo: tipo || undefined,
          desde: desde || undefined,
          hasta: hasta || undefined,
          q: q.trim() || undefined,
        },
        filename
      );
      toast.success('Reporte Excel descargado');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al descargar archivo');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Exportar CSV
  const handleExportCsv = async () => {
    try {
      setIsExportingCsv(true);
      const filename = `movimientos_${new Date().toISOString().split('T')[0]}.csv`;
      await api.download(
        '/movimientos/export/csv',
        {
          areaId: effectiveAreaId || undefined,
          tipo: tipo || undefined,
          desde: desde || undefined,
          hasta: hasta || undefined,
          q: q.trim() || undefined,
        },
        filename
      );
      toast.success('Reporte CSV descargado');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al descargar archivo');
    } finally {
      setIsExportingCsv(false);
    }
  };

  const clearFilters = () => {
    setTipo('');
    setDesde('');
    setHasta('');
    setQ('');
    setPage(1);
  };

  const hasActiveFilters = tipo !== '' || desde !== '' || hasta !== '' || q !== '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <History className="h-6 w-6 text-emerald-600" />
            Historial de Movimientos
          </h1>
          <p className="text-sm text-slate-500">
            {isEncargado
              ? 'Trazabilidad y auditoría completa de ingresos y egresos de tu área'
              : 'Historial consolidado de movimientos de inventario del hotel'}
          </p>
        </div>

        {/* Acciones de Exportación */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            isLoading={isExportingCsv}
            className="gap-1.5 text-xs text-slate-700"
          >
            <FileText className="h-4 w-4 text-slate-500" />
            CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportExcel}
            isLoading={isExportingExcel}
            className="gap-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-200" />
            Exportar a Excel (.xlsx)
          </Button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por producto, factura o motivo..."
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Tipo */}
            <div>
              <select
                value={tipo}
                onChange={(e) => {
                  setTipo(e.target.value as '' | 'INGRESO' | 'EGRESO');
                  setPage(1);
                }}
                className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Todos los tipos (Ingresos y Egresos)</option>
                <option value="INGRESO">Solo Ingresos (con Factura)</option>
                <option value="EGRESO">Solo Egresos / Consumos</option>
              </select>
            </div>

            {/* Fecha Desde */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Desde:</span>
              <input
                type="date"
                value={desde}
                onChange={(e) => {
                  setDesde(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 rounded-lg border border-slate-300 px-2 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Fecha Hasta */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Hasta:</span>
              <input
                type="date"
                value={hasta}
                onChange={(e) => {
                  setHasta(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 rounded-lg border border-slate-300 px-2 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">Filtros aplicados</span>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700"
              >
                <X className="h-3.5 w-3.5" />
                Limpiar filtros
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla de Movimientos */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="p-6">
              <Alert variant="error" title="Error">
                {error instanceof Error ? error.message : 'Error al cargar los movimientos'}
              </Alert>
            </div>
          ) : movimientos.length === 0 ? (
            <div className="p-12 text-center">
              <History className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No se encontraron movimientos</p>
              <p className="text-xs text-slate-400 mt-1">
                {hasActiveFilters
                  ? 'Probá ajustando o limpiando los filtros seleccionados'
                  : 'Aún no se han registrado operaciones en esta área'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Fecha</th>
                    <th className="px-6 py-3.5">Tipo</th>
                    <th className="px-6 py-3.5">Producto</th>
                    <th className="px-6 py-3.5 text-right">Cantidad</th>
                    <th className="px-6 py-3.5">Comprobante / Motivo</th>
                    <th className="px-6 py-3.5">Área</th>
                    <th className="px-6 py-3.5">Responsable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movimientos.map((mov) => {
                    const isIngreso = mov.tipo === 'INGRESO';

                    return (
                      <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                          {formatDate(mov.fecha)}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isIngreso
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isIngreso ? (
                              <ArrowDownToLine className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <ArrowUpFromLine className="h-3 w-3 text-slate-500" />
                            )}
                            {isIngreso ? 'Ingreso' : 'Egreso'}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900">{mov.producto_nombre}</p>
                          {mov.sku && (
                            <p className="text-[11px] text-slate-400 font-mono">SKU: {mov.sku}</p>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <span
                            className={`font-bold font-mono text-sm ${
                              isIngreso ? 'text-emerald-600' : 'text-slate-800'
                            }`}
                          >
                            {isIngreso ? '+' : '-'}
                            {formatNumber(mov.cantidad)}
                          </span>{' '}
                          <span className="text-xs text-slate-400 font-sans">
                            {mov.unidad_codigo}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-xs">
                          {isIngreso ? (
                            <div>
                              <p className="font-medium text-slate-900">
                                Fact. {mov.nro_factura || '-'}
                              </p>
                              {mov.proveedor_nombre && (
                                <p className="text-[11px] text-slate-400">
                                  {mov.proveedor_nombre}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-slate-700">{mov.motivo || 'Consumo general'}</p>
                          )}
                        </td>

                        <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                          {mov.area_nombre}
                        </td>

                        <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span>{mov.usuario_nombre || 'Usuario'}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Paginación */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-600">
                  <div>
                    Página <strong className="text-slate-900">{pagination.page}</strong> de{' '}
                    <strong className="text-slate-900">{pagination.totalPages}</strong> (
                    {pagination.total} movimientos totales)
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                      disabled={pagination.page <= 1}
                      className="text-xs px-2.5 py-1"
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
                      disabled={pagination.page >= pagination.totalPages}
                      className="text-xs px-2.5 py-1"
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
