import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../../lib/api';
import { useAuth } from '../../../features/auth/AuthContext';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Alert } from '../../../components/ui/Alert';
import { formatNumber } from '../../../lib/formatters';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { getTodayArgentina } from '@hotel/shared';

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

const nuevoEgresoSchema = z.object({
  producto_id: z.string().uuid({ message: 'Seleccione un producto' }),
  cantidad: z.coerce.number().positive({ message: 'La cantidad debe ser mayor a 0' }),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Formato inválido (AAAA-MM-DD)' }),
  motivo: z
    .string()
    .trim()
    .min(3, { message: 'El motivo debe tener al menos 3 caracteres' })
    .max(500, { message: 'Máximo 500 caracteres' }),
});

type NuevoEgresoForm = z.infer<typeof nuevoEgresoSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  preselectedProductoId?: string | null;
}

export const NuevoEgresoModal: React.FC<Props> = ({
  isOpen,
  onClose,
  preselectedProductoId,
}) => {
  const queryClient = useQueryClient();
  const { effectiveAreaId } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  // Cargar stock disponible del área
  const { data: stockItems = [] } = useQuery<StockItem[]>({
    queryKey: ['stock', effectiveAreaId],
    queryFn: () =>
      api.get<StockItem[]>('/stock', {
        areaId: effectiveAreaId || undefined,
      }),
    enabled: isOpen,
  });

  const todayStr = getTodayArgentina();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NuevoEgresoForm>({
    resolver: zodResolver(nuevoEgresoSchema),
    defaultValues: {
      producto_id: preselectedProductoId || '',
      cantidad: 1,
      fecha: todayStr,
      motivo: '',
    },
  });

  const selectedProductoId = watch('producto_id');
  const watchedCantidad = Number(watch('cantidad')) || 0;

  const currentStockItem = useMemo(() => {
    return stockItems.find((s) => s.producto_id === selectedProductoId);
  }, [stockItems, selectedProductoId]);

  const stockDisponible = currentStockItem ? currentStockItem.stock_actual : 0;
  const isExcedido = currentStockItem ? watchedCantidad > stockDisponible : false;
  const stockRestante = currentStockItem ? stockDisponible - watchedCantidad : 0;

  const createMutation = useMutation({
    mutationFn: (data: NuevoEgresoForm) => api.post('/egresos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['egresos'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Egreso de mercadería registrado con éxito');
      reset();
      onClose();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Error al registrar egreso';
      setServerError(msg);
      toast.error(msg);
    },
  });

  const onSubmit = async (data: NuevoEgresoForm) => {
    if (isExcedido) {
      toast.error('La cantidad no puede superar el stock disponible');
      return;
    }
    setServerError(null);
    await createMutation.mutateAsync(data);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Egreso / Consumo de Insumo"
      description="Las salidas impactan inmediatamente en el stock del área"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <Alert variant="error" title="No se pudo registrar el egreso">
            {serverError}
          </Alert>
        )}

        <Select
          label="Producto a retirar"
          error={errors.producto_id?.message}
          {...register('producto_id')}
        >
          <option value="">Seleccione insumo...</option>
          {stockItems.map((item) => (
            <option key={item.producto_id} value={item.producto_id}>
              {item.producto_nombre || item.nombre} {item.sku ? `[${item.sku}]` : ''} — Stock: {formatNumber(item.stock_actual)}{' '}
              {item.unidad_codigo}
            </option>
          ))}
        </Select>

        {/* Indicador visual de stock disponible */}
        {currentStockItem && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
              stockDisponible <= 0
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : isExcedido
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <div>
              <p className="font-semibold">
                Stock disponible en almacén: {formatNumber(stockDisponible)}{' '}
                {currentStockItem.unidad_codigo}
              </p>
              {!isExcedido && watchedCantidad > 0 && (
                <p className="mt-0.5 opacity-80">
                  Stock posterior al egreso: {formatNumber(stockRestante)}{' '}
                  {currentStockItem.unidad_codigo}
                </p>
              )}
              {isExcedido && (
                <p className="mt-0.5 font-medium text-amber-900">
                  ⚠️ Atención: La cantidad solicitada supera las existencias disponibles.
                </p>
              )}
            </div>
            {stockDisponible > 0 && !isExcedido ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={`Cantidad a retirar (${currentStockItem?.unidad_codigo || 'unidades'})`}
            type="number"
            step="any"
            min="0.001"
            error={errors.cantidad?.message}
            {...register('cantidad')}
          />

          <Input
            label="Fecha del Egreso"
            type="date"
            error={errors.fecha?.message}
            {...register('fecha')}
          />
        </div>

        <Input
          label="Motivo o Destino del Consumo"
          placeholder="Ej: Desayuno salón principal, Limpieza habitaciones piso 3"
          helperText="Indicá claramente para qué área o tarea se destina el insumo"
          error={errors.motivo?.message}
          {...register('motivo')}
        />

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={!selectedProductoId || stockDisponible <= 0 || isExcedido}
          >
            Confirmar Egreso
          </Button>
        </div>
      </form>
    </Modal>
  );
};
