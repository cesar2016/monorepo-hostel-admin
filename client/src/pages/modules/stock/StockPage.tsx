import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../../lib/api';
import { useAuth } from '../../../features/auth/AuthContext';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Spinner } from '../../../components/ui/Spinner';
import { Alert } from '../../../components/ui/Alert';
import { formatNumber } from '../../../lib/formatters';
import { NuevoEgresoModal } from '../egresos/NuevoEgresoModal';
import { NuevoIngresoModal } from '../ingresos/NuevoIngresoModal';
import {
  Layers,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpFromLine,
  ArrowDownToLine,
  Barcode,
} from 'lucide-react';

interface StockItem {
  producto_id: string;
  nombre?: string;
  producto_nombre?: string;
  sku: string | null;
  area_id: string;
  area_nombre: string;
  stock_actual: number;
  stock_minimo: number;
  unidad_codigo: string;
  unidad_nombre: string;
  bajo_minimo: boolean;
}

export const StockPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isEncargado, effectiveAreaId } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const filtroParam = searchParams.get('filtro');
  const [filterType, setFilterType] = useState<'todos' | 'criticos' | 'agotados'>(
    filtroParam === 'bajo' ? 'criticos' : 'todos'
  );

  // Modales de acción rápida
  const [egresoProductoId, setEgresoProductoId] = useState<string | null>(null);
  const [isIngresoModalOpen, setIsIngresoModalOpen] = useState(false);

  const {
    data: stockList = [],
    isLoading,
    error,
  } = useQuery<StockItem[]>({
    queryKey: ['stock', effectiveAreaId],
    queryFn: () =>
      api.get<StockItem[]>('/stock', {
        areaId: effectiveAreaId || undefined,
      }),
  });

  // Métricas
  const totalItems = stockList.length;
  const criticosCount = stockList.filter((s) => s.bajo_minimo && s.stock_actual > 0).length;
  const agotadosCount = stockList.filter((s) => s.stock_actual <= 0).length;
  const optimosCount = totalItems - criticosCount - agotadosCount;

  // Filtrado
  const filteredStock = useMemo(() => {
    return stockList.filter((s) => {
      const nombreProd = (s.producto_nombre || s.nombre || '').toLowerCase();
      const matchSearch =
        nombreProd.includes(searchTerm.toLowerCase()) ||
        Boolean(s.sku && s.sku.toLowerCase().includes(searchTerm.toLowerCase()));

      if (filterType === 'criticos') return matchSearch && s.bajo_minimo;
      if (filterType === 'agotados') return matchSearch && s.stock_actual <= 0;
      return matchSearch;
    });
  }, [stockList, searchTerm, filterType]);

  const handleFilterChange = (tipo: 'todos' | 'criticos' | 'agotados') => {
    setFilterType(tipo);
    if (tipo === 'criticos') setSearchParams({ filtro: 'bajo' });
    else setSearchParams({});
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Layers className="h-6 w-6 text-emerald-600" />
            Control de Stock en Tiempo Real
          </h1>
          <p className="text-sm text-slate-500">
            {isEncargado
              ? 'Niveles actuales de existencias y alertas de punto de reorden de tu área'
              : 'Existencias consolidadas calculadas a partir de ingresos y egresos'}
          </p>
        </div>

        {isEncargado && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsIngresoModalOpen(true)}
              className="gap-1.5 text-xs"
            >
              <ArrowDownToLine className="h-3.5 w-3.5" />
              Ingreso de Factura
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setEgresoProductoId('any')}
              className="gap-1.5 text-xs shadow-sm"
            >
              <ArrowUpFromLine className="h-3.5 w-3.5" />
              Registrar Egreso
            </Button>
          </div>
        )}
      </div>

      {/* Tarjetas Métricas de Stock */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div
          onClick={() => handleFilterChange('todos')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filterType === 'todos'
              ? 'bg-white border-emerald-500 shadow-sm ring-1 ring-emerald-500'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Ítems</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalItems}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Insumos activos</p>
        </div>

        <div
          onClick={() => handleFilterChange('todos')}
          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Stock Óptimo</p>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{optimosCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Por encima del mínimo</p>
        </div>

        <div
          onClick={() => handleFilterChange('criticos')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filterType === 'criticos'
              ? 'bg-amber-50/50 border-amber-500 shadow-sm ring-1 ring-amber-500'
              : 'bg-white border-amber-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Bajo Mínimo</p>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-1">{criticosCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Requiere reorden</p>
        </div>

        <div
          onClick={() => handleFilterChange('agotados')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filterType === 'agotados'
              ? 'bg-rose-50/50 border-rose-500 shadow-sm ring-1 ring-rose-500'
              : 'bg-white border-rose-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Agotados</p>
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-1">{agotadosCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Sin existencias (0)</p>
        </div>
      </div>

      {/* Buscador */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar insumo por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="text-xs text-slate-500">
            Mostrando: <strong className="text-slate-800">{filteredStock.length}</strong> de{' '}
            {totalItems} insumos
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Stock */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="p-6">
              <Alert variant="error" title="Error">
                {error instanceof Error ? error.message : 'Error al cargar el stock'}
              </Alert>
            </div>
          ) : filteredStock.length === 0 ? (
            <div className="p-12 text-center">
              <Layers className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No se encontraron productos</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchTerm
                  ? 'Probá modificando el filtro de búsqueda'
                  : 'No hay registros bajo el criterio seleccionado'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Producto</th>
                    <th className="px-6 py-3.5">Código / SKU</th>
                    <th className="px-6 py-3.5">Área</th>
                    <th className="px-6 py-3.5 text-right">Stock Actual</th>
                    <th className="px-6 py-3.5 text-right">Stock Mínimo</th>
                    <th className="px-6 py-3.5 text-center">Estado</th>
                    {isEncargado && <th className="px-6 py-3.5 text-right">Operar</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStock.map((item) => {
                    const isZero = item.stock_actual <= 0;
                    const isLow = item.bajo_minimo && !isZero;

                    return (
                      <tr
                        key={item.producto_id}
                        className={`transition-colors ${
                          isZero
                            ? 'bg-rose-50/30 hover:bg-rose-50/50'
                            : isLow
                            ? 'bg-amber-50/30 hover:bg-amber-50/50'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900">{item.producto_nombre || item.nombre}</p>
                        </td>

                        <td className="px-6 py-4">
                          {item.sku ? (
                            <span className="inline-flex items-center gap-1 font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                              <Barcode className="h-3 w-3 text-slate-400" />
                              {item.sku}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                          {item.area_nombre}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <span
                            className={`font-bold text-base font-mono ${
                              isZero
                                ? 'text-rose-600'
                                : isLow
                                ? 'text-amber-600'
                                : 'text-slate-900'
                            }`}
                          >
                            {formatNumber(item.stock_actual)}
                          </span>{' '}
                          <span className="text-xs text-slate-500 font-sans">
                            {item.unidad_codigo}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right text-xs text-slate-500">
                          {formatNumber(item.stock_minimo)} {item.unidad_codigo}
                        </td>

                        <td className="px-6 py-4 text-center">
                          {isZero ? (
                            <Badge variant="danger">Sin existencias</Badge>
                          ) : isLow ? (
                            <Badge variant="warning">Bajo Mínimo</Badge>
                          ) : (
                            <Badge variant="success">Normal</Badge>
                          )}
                        </td>

                        {isEncargado && (
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEgresoProductoId(item.producto_id)}
                                disabled={item.stock_actual <= 0}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                                title="Registrar egreso"
                              >
                                <ArrowUpFromLine className="h-3 w-3" />
                                Egresar
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Egreso Rápido */}
      {egresoProductoId && (
        <NuevoEgresoModal
          isOpen={!!egresoProductoId}
          onClose={() => setEgresoProductoId(null)}
          preselectedProductoId={egresoProductoId === 'any' ? null : egresoProductoId}
        />
      )}

      {/* Modal Ingreso */}
      <NuevoIngresoModal
        isOpen={isIngresoModalOpen}
        onClose={() => setIsIngresoModalOpen(false)}
      />
    </div>
  );
};
