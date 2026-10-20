import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { Alert } from '../../../components/ui/Alert';
import { formatDate, formatCurrency, formatNumber } from '../../../lib/formatters';
import { Printer } from 'lucide-react';

interface IngresoDetalle {
  id: string;
  area_id: string;
  proveedor_id: string;
  nro_factura: string;
  fecha: string;
  observaciones: string | null;
  created_at: string;
  created_by: string;
  proveedores?: { nombre: string; cuit: string | null };
  areas?: { nombre: string };
  profiles?: { nombre: string };
  items: Array<{
    id: string;
    producto_id: string;
    cantidad: number;
    costo_unitario: number;
    productos?: {
      nombre: string;
      sku: string | null;
      unidades_medida?: { codigo: string; nombre: string };
    };
  }>;
}

interface Props {
  ingresoId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DetalleIngresoModal: React.FC<Props> = ({ ingresoId, isOpen, onClose }) => {
  const { data: ingreso, isLoading, error } = useQuery<IngresoDetalle>({
    queryKey: ['ingresos', ingresoId],
    queryFn: () => api.get<IngresoDetalle>(`/ingresos/${ingresoId}`),
    enabled: isOpen && !!ingresoId,
  });

  const totalFactura =
    ingreso?.items.reduce((acc, item) => acc + item.cantidad * item.costo_unitario, 0) || 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Factura: ${ingreso?.nro_factura || 'Detalle de Ingreso'}`}
      description="Comprobante y detalle de mercadería recepcionada"
      maxWidth="2xl"
    >
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <Alert variant="error" title="Error al cargar comprobante">
          {error instanceof Error ? error.message : 'No se pudo cargar el ingreso'}
        </Alert>
      ) : ingreso ? (
        <div className="space-y-5">
          {/* Ficha de Cabecera */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <p className="text-slate-400 font-medium">Proveedor</p>
              <p className="font-semibold text-slate-800 mt-0.5">
                {ingreso.proveedores?.nombre || '-'}
              </p>
              {ingreso.proveedores?.cuit && (
                <p className="text-[11px] text-slate-500 font-mono">
                  CUIT: {ingreso.proveedores.cuit}
                </p>
              )}
            </div>

            <div>
              <p className="text-slate-400 font-medium">Fecha Emisión</p>
              <p className="font-semibold text-slate-800 mt-0.5">{formatDate(ingreso.fecha)}</p>
            </div>

            <div>
              <p className="text-slate-400 font-medium">Área Destino</p>
              <p className="font-semibold text-slate-800 mt-0.5">
                {ingreso.areas?.nombre || 'General'}
              </p>
            </div>

            <div>
              <p className="text-slate-400 font-medium">Registrado por</p>
              <p className="font-semibold text-slate-800 mt-0.5">
                {ingreso.profiles?.nombre || 'Personal'}
              </p>
            </div>
          </div>

          {ingreso.observaciones && (
            <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-3 text-xs text-amber-900">
              <span className="font-semibold">Observaciones: </span>
              {ingreso.observaciones}
            </div>
          )}

          {/* Tabla de ítems */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-2.5">Producto</th>
                  <th className="px-3 py-2.5 text-right">Cantidad</th>
                  <th className="px-3 py-2.5 text-right">Costo Unit.</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {ingreso.items.map((item) => {
                  const subtotal = item.cantidad * item.costo_unitario;
                  const unidad = item.productos?.unidades_medida?.codigo || 'u';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{item.productos?.nombre}</p>
                        {item.productos?.sku && (
                          <p className="text-[10px] text-slate-400 font-mono">
                            SKU: {item.productos.sku}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-800">
                        {formatNumber(item.cantidad)} <span className="text-slate-400 font-normal">{unidad}</span>
                      </td>
                      <td className="px-3 py-3 text-right text-slate-600 font-mono">
                        {formatCurrency(item.costo_unitario)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono">
                        {formatCurrency(subtotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 font-semibold border-t border-slate-200">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right text-xs uppercase text-slate-500">
                    Total Facturado:
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-emerald-700 font-bold font-mono">
                    {formatCurrency(totalFactura)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Firmas exclusivas para impresión */}
          <div className="hidden print:grid grid-cols-2 gap-12 pt-12 text-center text-xs">
            <div className="border-t border-slate-900 pt-2">
              <p className="font-semibold text-slate-900">Firma y Aclaración</p>
              <p className="text-slate-600">Recepción Almacén ({ingreso.profiles?.nombre || 'Personal'})</p>
            </div>
            <div className="border-t border-slate-900 pt-2">
              <p className="font-semibold text-slate-900">Firma y Aclaración</p>
              <p className="text-slate-600">Proveedor / Entrega ({ingreso.proveedores?.nombre || 'Transporte'})</p>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100 no-print">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 text-xs text-slate-700"
            >
              <Printer className="h-4 w-4 text-slate-500" />
              Imprimir Comprobante
            </Button>
            <Button variant="primary" size="sm" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};
