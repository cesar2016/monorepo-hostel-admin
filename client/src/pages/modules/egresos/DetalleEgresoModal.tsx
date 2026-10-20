import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { formatDate, formatNumber } from '../../../lib/formatters';
import { Printer, Hotel } from 'lucide-react';

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

interface Props {
  egreso: EgresoListItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DetalleEgresoModal: React.FC<Props> = ({ egreso, isOpen, onClose }) => {
  if (!egreso) return null;

  const unidad = egreso.productos?.unidades_medida?.codigo || 'u';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Vale de Salida y Consumo de Insumos"
      description={`Comprobante de egreso operativo N° ${egreso.id.slice(0, 8).toUpperCase()}`}
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Encabezado del comprobante */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Hotel className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">HOTEL - GESTIÓN DE INVENTARIO</h4>
              <p className="text-xs text-slate-500">Comprobante Interno de Retiro de Mercadería</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Vale N°</span>
            <p className="font-mono text-xs font-bold text-slate-800">
              {egreso.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>

        {/* Datos Principales */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div>
            <p className="text-slate-400 font-medium">Fecha de Emisión</p>
            <p className="font-semibold text-slate-800 mt-0.5">{formatDate(egreso.fecha)}</p>
          </div>

          <div>
            <p className="text-slate-400 font-medium">Área Emisora</p>
            <p className="font-semibold text-slate-800 mt-0.5">
              {egreso.areas?.nombre || 'General'}
            </p>
          </div>

          <div>
            <p className="text-slate-400 font-medium">Responsable del Retiro</p>
            <p className="font-semibold text-slate-800 mt-0.5">
              {egreso.profiles?.nombre || 'Personal'}
            </p>
          </div>
        </div>

        {/* Insumo retirado */}
        <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Producto / Insumo</p>
              <h5 className="font-bold text-slate-900 text-base mt-0.5">
                {egreso.productos?.nombre}
              </h5>
              {egreso.productos?.sku && (
                <p className="text-xs text-slate-500 font-mono">
                  Código SKU: {egreso.productos.sku}
                </p>
              )}
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase font-semibold">Cantidad Retirada</p>
              <div className="mt-0.5 flex items-baseline justify-end gap-1 font-mono font-bold text-xl text-slate-900">
                <span>{formatNumber(egreso.cantidad)}</span>
                <span className="text-xs font-sans text-slate-500 font-normal">{unidad}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs">
            <p className="font-semibold text-slate-700">Motivo / Destino Declarado:</p>
            <p className="text-slate-600 mt-0.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              {egreso.motivo}
            </p>
          </div>
        </div>

        {/* Firmas exclusivas para impresión */}
        <div className="hidden print:grid grid-cols-2 gap-12 pt-16 text-center text-xs">
          <div className="border-t border-slate-900 pt-2">
            <p className="font-semibold text-slate-900">Firma y Aclaración</p>
            <p className="text-slate-600">
              Solicitante / Responsable ({egreso.profiles?.nombre || 'Personal'})
            </p>
          </div>
          <div className="border-t border-slate-900 pt-2">
            <p className="font-semibold text-slate-900">Firma y Aclaración</p>
            <p className="text-slate-600">Encargado de Almacén</p>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-100 no-print">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 text-xs text-slate-700"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            Imprimir Vale de Salida
          </Button>

          <Button variant="primary" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
