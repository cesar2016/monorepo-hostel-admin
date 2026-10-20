import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useAuth } from '../../../features/auth/AuthContext';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { Alert } from '../../../components/ui/Alert';
import { formatDate, formatNumber } from '../../../lib/formatters';
import { NuevoEgresoModal } from './NuevoEgresoModal';
import { DetalleEgresoModal } from './DetalleEgresoModal';
import {
  ArrowUpFromLine,
  Plus,
  Search,
  User,
  FileText,
} from 'lucide-react';

interface EgresoListItem {
  id: string;
  area_id: string;
  producto_id: string;
  cantidad: number;
  fecha: string;
  motivo: string;
  created_at: string;
  productos?: {
    nombre: string;
    sku: string | null;
    unidades_medida?: { codigo: string; nombre: string };
  };
  areas?: { nombre: string };
  profiles?: { nombre: string };
}

export const EgresosPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isEncargado, effectiveAreaId } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [isNuevoOpen, setIsNuevoOpen] = useState(() => searchParams.get('nuevo') === 'true');
  const [selectedEgresoForDetail, setSelectedEgresoForDetail] = useState<EgresoListItem | null>(null);

  useEffect(() => {
    if (searchParams.get('nuevo') === 'true') {
      setIsNuevoOpen(true);
    }
  }, [searchParams]);

  const handleCloseNuevo = () => {
    setIsNuevoOpen(false);
    if (searchParams.get('nuevo')) {
      searchParams.delete('nuevo');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const {
    data: egresos = [],
    isLoading,
    error,
  } = useQuery<EgresoListItem[]>({
    queryKey: ['egresos', effectiveAreaId],
    queryFn: () =>
      api.get<EgresoListItem[]>('/egresos', {
        areaId: effectiveAreaId || undefined,
      }),
  });

  const filteredEgresos = useMemo(() => {
    return egresos.filter((eg) => {
      const matchSearch =
        (eg.productos?.nombre &&
          eg.productos.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (eg.motivo && eg.motivo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (eg.profiles?.nombre &&
          eg.profiles.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchSearch;
    });
  }, [egresos, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ArrowUpFromLine className="h-6 w-6 text-slate-700" />
            Egresos de Insumos
          </h1>
          <p className="text-sm text-slate-500">
            {isEncargado
              ? 'Control de salidas de insumos y consumos del área'
              : 'Registro general de egresos en las distintas áreas'}
          </p>
        </div>

        {isEncargado && (
          <Button onClick={() => setIsNuevoOpen(true)} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Registrar Egreso
          </Button>
        )}
      </div>

      {/* Barra de Filtros */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por producto, motivo o responsable..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="text-xs text-slate-500">
            Total egresos registrados: <strong className="text-slate-800">{filteredEgresos.length}</strong>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Egresos */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="p-6">
              <Alert variant="error" title="Error">
                {error instanceof Error ? error.message : 'Error al cargar los egresos'}
              </Alert>
            </div>
          ) : filteredEgresos.length === 0 ? (
            <div className="p-12 text-center">
              <ArrowUpFromLine className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No se encontraron egresos</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchTerm
                  ? 'Probá modificando el filtro de búsqueda'
                  : 'Aún no se registraron salidas de mercadería en esta área'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Fecha</th>
                    <th className="px-6 py-3.5">Producto</th>
                    <th className="px-6 py-3.5 text-right">Cantidad Retirada</th>
                    <th className="px-6 py-3.5">Motivo / Destino</th>
                    <th className="px-6 py-3.5">Área</th>
                    <th className="px-6 py-3.5">Responsable</th>
                    <th className="px-6 py-3.5 text-right">Comprobante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEgresos.map((eg) => {
                    const unidad = eg.productos?.unidades_medida?.codigo || 'u';

                    return (
                      <tr key={eg.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                          {formatDate(eg.fecha)}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900">
                            {eg.productos?.nombre || 'Producto'}
                          </p>
                          {eg.productos?.sku && (
                            <p className="text-[11px] text-slate-400 font-mono">
                              SKU: {eg.productos.sku}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-slate-900">
                            {formatNumber(eg.cantidad)}
                          </span>{' '}
                          <span className="text-xs text-slate-500">{unidad}</span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-700 max-w-xs">
                          {eg.motivo}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                          {eg.areas?.nombre || 'General'}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span>{eg.profiles?.nombre || 'Personal'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedEgresoForDetail(eg)}
                            className="gap-1.5 text-xs h-8"
                          >
                            <FileText className="h-3.5 w-3.5 text-slate-500" />
                            Ver Vale
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Registrar Egreso */}
      <NuevoEgresoModal isOpen={isNuevoOpen} onClose={handleCloseNuevo} />

      {/* Modal Detalle / Vale de Salida Imprimible */}
      <DetalleEgresoModal
        egreso={selectedEgresoForDetail}
        isOpen={!!selectedEgresoForDetail}
        onClose={() => setSelectedEgresoForDetail(null)}
      />
    </div>
  );
};
