import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../../lib/api';
import { useAuth } from '../../../features/auth/AuthContext';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Alert } from '../../../components/ui/Alert';
import { formatCurrency } from '../../../lib/formatters';
import { Plus, Trash2, ReceiptText } from 'lucide-react';
import { toast } from 'sonner';
import { getTodayArgentina } from '@hotel/shared';

interface ProveedorOption {
  id: string;
  nombre: string;
  cuit: string | null;
  activo: boolean;
}

interface ProductoOption {
  id: string;
  nombre: string;
  sku: string | null;
  activo: boolean;
  unidades_medida?: {
    codigo: string;
    nombre: string;
  };
}

const itemSchema = z.object({
  producto_id: z.string().uuid({ message: 'Seleccione un producto' }),
  cantidad: z.coerce.number().positive({ message: 'La cantidad debe ser mayor a 0' }),
  costo_unitario: z.coerce.number().min(0, { message: 'El costo no puede ser negativo' }),
});

const nuevoIngresoSchema = z.object({
  proveedor_id: z.string().uuid({ message: 'Debe seleccionar un proveedor' }),
  nro_factura: z
    .string()
    .trim()
    .min(1, { message: 'El N° de factura es obligatorio' })
    .max(50, { message: 'Máximo 50 caracteres' }),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Formato inválido (AAAA-MM-DD)' }),
  observaciones: z.string().trim().max(1000).optional().or(z.literal('')),
  items: z
    .array(itemSchema)
    .min(1, { message: 'Debe agregar al menos un ítem al ingreso' })
    .refine(
      (items) => {
        const ids = items.map((i) => i.producto_id);
        return new Set(ids).size === ids.length;
      },
      { message: 'No puede haber productos repetidos en el mismo ingreso' }
    ),
});

type NuevoIngresoForm = z.infer<typeof nuevoIngresoSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NuevoIngresoModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const { effectiveAreaId } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  // Cargar proveedores del área
  const { data: proveedores = [] } = useQuery<ProveedorOption[]>({
    queryKey: ['proveedores', effectiveAreaId],
    queryFn: () =>
      api.get<ProveedorOption[]>('/proveedores', {
        areaId: effectiveAreaId || undefined,
      }),
    enabled: isOpen,
  });

  // Cargar productos activos del área
  const { data: productos = [] } = useQuery<ProductoOption[]>({
    queryKey: ['productos', effectiveAreaId, 'activos'],
    queryFn: () =>
      api.get<ProductoOption[]>('/productos', {
        areaId: effectiveAreaId || undefined,
        activo: 'true',
      }),
    enabled: isOpen,
  });

  const todayStr = getTodayArgentina();

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NuevoIngresoForm>({
    resolver: zodResolver(nuevoIngresoSchema),
    defaultValues: {
      proveedor_id: '',
      nro_factura: '',
      fecha: todayStr,
      observaciones: '',
      items: [
        {
          producto_id: '',
          cantidad: 1,
          costo_unitario: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items') || [];

  // Calcular total de la factura
  const totalFactura = watchedItems.reduce((acc, item) => {
    const qty = Number(item.cantidad) || 0;
    const cost = Number(item.costo_unitario) || 0;
    return acc + qty * cost;
  }, 0);

  const createMutation = useMutation({
    mutationFn: (data: NuevoIngresoForm) => api.post('/ingresos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingresos'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Ingreso de mercadería registrado con éxito');
      reset();
      onClose();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Error al registrar el ingreso';
      setServerError(msg);
      toast.error(msg);
    },
  });

  const onSubmit = async (data: NuevoIngresoForm) => {
    setServerError(null);
    await createMutation.mutateAsync(data);
  };

  const proveedoresActivos = proveedores.filter((p) => p.activo);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Ingreso de Mercadería"
      description="Cada ingreso debe estar respaldado por una factura comercial"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {serverError && (
          <Alert variant="error" title="No se pudo registrar el ingreso">
            {serverError}
          </Alert>
        )}

        {/* Datos de Cabecera */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="sm:col-span-1">
            <Select
              label="Proveedor"
              error={errors.proveedor_id?.message}
              {...register('proveedor_id')}
            >
              <option value="">Seleccione proveedor...</option>
              {proveedoresActivos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} {p.cuit ? `(${p.cuit})` : ''}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Input
              label="N° de Factura"
              placeholder="Ej: A-0001-00012547"
              error={errors.nro_factura?.message}
              {...register('nro_factura')}
            />
          </div>

          <div>
            <Input
              label="Fecha de Ingreso"
              type="date"
              error={errors.fecha?.message}
              {...register('fecha')}
            />
          </div>

          <div className="sm:col-span-3">
            <Input
              label="Observaciones (opcional)"
              placeholder="Comentarios adicionales, detalle de recepción o estado del bulto"
              error={errors.observaciones?.message}
              {...register('observaciones')}
            />
          </div>
        </div>

        {/* Detalle de Productos (Items) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <ReceiptText className="h-4 w-4 text-emerald-600" />
              Detalle de Productos Ingresados
            </h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ producto_id: '', cantidad: 1, costo_unitario: 0 })}
              className="gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar Producto
            </Button>
          </div>

          {errors.items?.root && (
            <p className="text-xs text-red-600 font-medium mb-2">{errors.items.root.message}</p>
          )}

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-2.5">Producto</th>
                  <th className="px-3 py-2.5 w-28 text-right">Cantidad</th>
                  <th className="px-3 py-2.5 w-32 text-right">Costo Unit. ($)</th>
                  <th className="px-4 py-2.5 w-32 text-right">Subtotal</th>
                  <th className="px-2 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {fields.map((field, index) => {
                  const qty = Number(watchedItems[index]?.cantidad) || 0;
                  const cost = Number(watchedItems[index]?.costo_unitario) || 0;
                  const subtotal = qty * cost;

                  return (
                    <tr key={field.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5">
                        <select
                          className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          {...register(`items.${index}.producto_id`)}
                        >
                          <option value="">Seleccione insumo...</option>
                          {productos.map((prod) => (
                            <option key={prod.id} value={prod.id}>
                              {prod.nombre} {prod.sku ? `[${prod.sku}]` : ''} (
                              {prod.unidades_medida?.codigo || 'u'})
                            </option>
                          ))}
                        </select>
                        {errors.items?.[index]?.producto_id && (
                          <p className="text-[10px] text-red-600 mt-0.5">
                            {errors.items[index]?.producto_id?.message}
                          </p>
                        )}
                      </td>

                      <td className="px-3 py-2.5">
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          placeholder="1"
                          className="w-full h-8 rounded-lg border border-slate-300 px-2 text-xs text-right focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          {...register(`items.${index}.cantidad`)}
                        />
                      </td>

                      <td className="px-3 py-2.5">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0.00"
                          className="w-full h-8 rounded-lg border border-slate-300 px-2 text-xs text-right focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          {...register(`items.${index}.costo_unitario`)}
                        />
                      </td>

                      <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                        {formatCurrency(subtotal)}
                      </td>

                      <td className="px-2 py-2.5 text-center">
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                            title="Quitar ítem"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 font-semibold text-slate-800 border-t border-slate-200">
                <tr>
                  <td colSpan={3} className="px-4 py-2.5 text-right text-xs uppercase text-slate-500">
                    Total Factura:
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm text-emerald-700 font-bold">
                    {formatCurrency(totalFactura)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Confirmar Ingreso de Mercadería
          </Button>
        </div>
      </form>
    </Modal>
  );
};
