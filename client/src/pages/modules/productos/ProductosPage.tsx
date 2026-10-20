import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../../lib/api';
import { useAuth } from '../../../features/auth/AuthContext';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Spinner } from '../../../components/ui/Spinner';
import { Alert } from '../../../components/ui/Alert';
import { formatNumber } from '../../../lib/formatters';
import {
  Package,
  Plus,
  Search,
  Edit2,
  CheckCircle,
  XCircle,
  Barcode,
} from 'lucide-react';
import { toast } from 'sonner';

interface UnidadMedida {
  id: number;
  codigo: string;
  nombre: string;
  permite_decimales: boolean;
}

interface Producto {
  id: string;
  area_id: string;
  nombre: string;
  sku: string | null;
  unidad_id: number;
  stock_minimo: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
  unidades_medida?: UnidadMedida;
}

const productoFormSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    .max(150, { message: 'El nombre no puede superar los 150 caracteres' }),
  sku: z
    .string()
    .trim()
    .max(50, { message: 'El código SKU no puede superar los 50 caracteres' })
    .optional()
    .or(z.literal('')),
  unidad_id: z.coerce.number().positive({ message: 'Debe seleccionar una unidad de medida' }),
  stock_minimo: z.coerce
    .number()
    .min(0, { message: 'El stock mínimo no puede ser negativo' })
    .default(0),
});

type ProductoFormData = z.infer<typeof productoFormSchema>;

export const ProductosPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { isEncargado, effectiveAreaId } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterActivo, setFilterActivo] = useState<'todos' | 'activos' | 'inactivos'>('activos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);

  // Cargar Unidades de Medida
  const { data: unidades = [] } = useQuery<UnidadMedida[]>({
    queryKey: ['unidades'],
    queryFn: () => api.get<UnidadMedida[]>('/unidades'),
    staleTime: 1000 * 60 * 30, // 30 min
  });

  // Cargar Productos
  const {
    data: productos = [],
    isLoading,
    error,
  } = useQuery<Producto[]>({
    queryKey: ['productos', effectiveAreaId],
    queryFn: () =>
      api.get<Producto[]>('/productos', {
        areaId: effectiveAreaId || undefined,
      }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductoFormData>({
    resolver: zodResolver(productoFormSchema),
    defaultValues: {
      nombre: '',
      sku: '',
      unidad_id: 1,
      stock_minimo: 0,
    },
  });

  const openCreateModal = () => {
    setEditingProducto(null);
    reset({
      nombre: '',
      sku: '',
      unidad_id: unidades[0]?.id || 1,
      stock_minimo: 0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p: Producto) => {
    setEditingProducto(p);
    reset({
      nombre: p.nombre,
      sku: p.sku || '',
      unidad_id: p.unidad_id,
      stock_minimo: p.stock_minimo,
    });
    setIsModalOpen(true);
  };

  // Mutación crear
  const createMutation = useMutation({
    mutationFn: (data: ProductoFormData) =>
      api.post('/productos', {
        ...data,
        sku: data.sku ? data.sku.trim() : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Producto creado con éxito');
      setIsModalOpen(false);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Error al crear producto');
    },
  });

  // Mutación editar
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProductoFormData> & { activo?: boolean } }) =>
      api.put(`/productos/${id}`, {
        ...data,
        sku: data.sku !== undefined ? (data.sku ? data.sku.trim() : null) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Producto actualizado');
      setIsModalOpen(false);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar producto');
    },
  });

  const onSubmit = async (values: ProductoFormData) => {
    if (editingProducto) {
      await updateMutation.mutateAsync({ id: editingProducto.id, data: values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const toggleEstado = async (p: Producto) => {
    try {
      await updateMutation.mutateAsync({
        id: p.id,
        data: { activo: !p.activo },
      });
      toast.success(`Producto ${!p.activo ? 'activado' : 'desactivado'}`);
    } catch {
      // ya notificado por onError
    }
  };

  // Filtrado
  const filteredProductos = useMemo(() => {
    return productos.filter((p) => {
      const matchSearch =
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));

      if (filterActivo === 'activos') return matchSearch && p.activo;
      if (filterActivo === 'inactivos') return matchSearch && !p.activo;
      return matchSearch;
    });
  }, [productos, searchTerm, filterActivo]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-emerald-600" />
            Catálogo de Productos
          </h1>
          <p className="text-sm text-slate-500">
            {isEncargado
              ? 'Insumos y mercadería gestionados por tu área'
              : 'Vista consolidada de insumos en las distintas áreas del hotel'}
          </p>
        </div>

        {isEncargado && (
          <Button onClick={openCreateModal} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Nuevo Producto
          </Button>
        )}
      </div>

      {/* Barra de Filtros */}
      <Card>
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o código SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Estado:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setFilterActivo('activos')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  filterActivo === 'activos'
                    ? 'bg-white text-emerald-700 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Activos
              </button>
              <button
                type="button"
                onClick={() => setFilterActivo('inactivos')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  filterActivo === 'inactivos'
                    ? 'bg-white text-slate-800 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Inactivos
              </button>
              <button
                type="button"
                onClick={() => setFilterActivo('todos')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  filterActivo === 'todos'
                    ? 'bg-white text-slate-800 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Productos */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="p-6">
              <Alert variant="error" title="Error">
                {error instanceof Error ? error.message : 'Error al cargar los productos'}
              </Alert>
            </div>
          ) : filteredProductos.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No se encontraron productos</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchTerm
                  ? 'Probá modificando los términos de búsqueda'
                  : 'Aún no hay productos registrados en esta área'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Producto</th>
                    <th className="px-6 py-3.5">Código / SKU</th>
                    <th className="px-6 py-3.5">Unidad de Medida</th>
                    <th className="px-6 py-3.5 text-right">Stock Mínimo</th>
                    <th className="px-6 py-3.5 text-center">Estado</th>
                    {isEncargado && <th className="px-6 py-3.5 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProductos.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{p.nombre}</div>
                      </td>
                      <td className="px-6 py-4">
                        {p.sku ? (
                          <span className="inline-flex items-center gap-1 font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                            <Barcode className="h-3 w-3 text-slate-400" />
                            {p.sku}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <span className="font-medium text-slate-800">
                          {p.unidades_medida?.nombre || p.unidades_medida?.codigo || 'Unidades'}
                        </span>
                        <span className="text-slate-400 ml-1">
                          ({p.unidades_medida?.codigo})
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        <span className="text-slate-900">{formatNumber(p.stock_minimo)}</span>{' '}
                        <span className="text-xs text-slate-400">
                          {p.unidades_medida?.codigo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={p.activo ? 'success' : 'default'}>
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      {isEncargado && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(p)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                              title="Editar producto"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleEstado(p)}
                              className={`rounded-lg p-1.5 transition-colors ${
                                p.activo
                                  ? 'text-slate-400 hover:bg-red-50 hover:text-red-600'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={p.activo ? 'Desactivar producto' : 'Reactivar producto'}
                            >
                              {p.activo ? (
                                <XCircle className="h-4 w-4" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Alta / Edición de Producto */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProducto ? 'Editar Producto' : 'Nuevo Producto'}
        description="Completá las características del insumo para el control de inventario"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nombre del Producto / Insumo"
            placeholder="Ej: Harina 0000 1kg, Toallas Grandes, Foco LED 12W"
            error={errors.nombre?.message}
            {...register('nombre')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Código / SKU (opcional)"
              placeholder="Ej: COC-HAR-01"
              error={errors.sku?.message}
              {...register('sku')}
            />

            <Select
              label="Unidad de Medida"
              error={errors.unidad_id?.message}
              {...register('unidad_id')}
            >
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} ({u.codigo})
                </option>
              ))}
            </Select>
          </div>

          <Input
            label="Stock Mínimo (Punto de Reorden)"
            type="number"
            step="any"
            min="0"
            helperText="Se generará una alerta visual cuando el stock disponible caiga por debajo de este valor"
            error={errors.stock_minimo?.message}
            {...register('stock_minimo')}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingProducto ? 'Guardar Cambios' : 'Crear Producto'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
