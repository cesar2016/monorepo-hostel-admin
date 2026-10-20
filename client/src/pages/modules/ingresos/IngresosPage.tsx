import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useAuth } from '../../../features/auth/AuthContext';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { Alert } from '../../../components/ui/Alert';
import { formatDate } from '../../../lib/formatters';
import { NuevoIngresoModal } from './NuevoIngresoModal';
import { DetalleIngresoModal } from './DetalleIngresoModal';
import {
  ArrowDownToLine,
  Plus,
  Search,
  Eye,
  Receipt,
} from 'lucide-react';

interface IngresoListItem {
  id: string;
  area_id: string;
  proveedor_id: string;
  nro_factura: string;
  fecha: string;
  observaciones: string | null;
  created_at: string;
  proveedores?: { nombre: string; cuit: string | null };
  areas?: { nombre: string };
  profiles?: { nombre: string };
}

export const IngresosPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isEncargado, effectiveAreaId } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [isNuevoOpen, setIsNuevoOpen] = useState(() => searchParams.get('nuevo') === 'true');
  const [selectedIngresoId, setSelectedIngresoId] = useState<string | null>(null);

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
    data: ingresos = [],
    isLoading,
    error,
  } = useQuery<IngresoListItem[]>({
    queryKey: ['ingresos', effectiveAreaId],
    queryFn: () =>
      api.get<IngresoListItem[]>('/ingresos', {
        areaId: effectiveAreaId || undefined,
      }),
  });

  const filteredIngresos = useMemo(() => {
    return ingresos.filter((ing) => {
      const matchSearch =
        ing.nro_factura.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ing.proveedores?.nombre &&
          ing.proveedores.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ing.observaciones && ing.observaciones.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchSearch;
    });
  }, [ingresos, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ArrowDownToLine className="h-6 w-6 text-emerald-600" />
            Ingresos de Mercadería
          </h1>
          <p className="text-sm text-slate-500">
            {isEncargado
              ? 'Recepción de mercadería e insumos respaldados por factura'
              : 'Historial de comprobantes de ingreso en las distintas áreas'}
          </p>
        </div>

        {isEncargado && (
          <Button onClick={() => setIsNuevoOpen(true)} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Nuevo Ingreso
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
              placeholder="Buscar por N° de factura, proveedor u observaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="text-xs text-slate-500">
            Total comprobantes: <strong className="text-slate-800">{filteredIngresos.length}</strong>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Ingresos */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="p-6">
              <Alert variant="error" title="Error">
                {error instanceof Error ? error.message : 'Error al cargar los ingresos'}
              </Alert>
            </div>
          ) : filteredIngresos.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No se encontraron ingresos</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchTerm
                  ? 'Probá modificando el filtro de búsqueda'
                  : 'Aún no se registraron ingresos con factura en esta área'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">N° Factura</th>
                    <th className="px-6 py-3.5">Fecha</th>
                    <th className="px-6 py-3.5">Proveedor</th>
                    <th className="px-6 py-3.5">Área</th>
                    <th className="px-6 py-3.5">Registrado por</th>
                    <th className="px-6 py-3.5 text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredIngresos.map((ing) => (
                    <tr key={ing.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>{ing.nro_factura}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-700">
                        {formatDate(ing.fecha)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-800">
                          {ing.proveedores?.nombre || 'Proveedor'}
                        </p>
                        {ing.proveedores?.cuit && (
                          <p className="text-[11px] text-slate-400 font-mono">
                            CUIT: {ing.proveedores.cuit}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {ing.areas?.nombre || 'General'}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {ing.profiles?.nombre || 'Usuario'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedIngresoId(ing.id)}
                          className="gap-1.5 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver Ítems
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Nuevo Ingreso */}
      <NuevoIngresoModal isOpen={isNuevoOpen} onClose={handleCloseNuevo} />

      {/* Modal Detalle de Ingreso */}
      <DetalleIngresoModal
        ingresoId={selectedIngresoId}
        isOpen={!!selectedIngresoId}
        onClose={() => setSelectedIngresoId(null)}
      />
    </div>
  );
};
