import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../lib/api';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { formatDate } from '../../lib/formatters';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  CheckCircle,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

interface Area {
  id: string;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

const areaFormSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    .max(80, { message: 'Máximo 80 caracteres' }),
  descripcion: z.string().trim().max(500).optional().or(z.literal('')),
});

type AreaFormData = z.infer<typeof areaFormSchema>;

export const AreasPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterActiva, setFilterActiva] = useState<'todas' | 'activas' | 'inactivas'>('activas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);

  const {
    data: areas = [],
    isLoading,
    error,
  } = useQuery<Area[]>({
    queryKey: ['areas'],
    queryFn: () => api.get<Area[]>('/areas'),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AreaFormData>({
    resolver: zodResolver(areaFormSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
    },
  });

  const openCreateModal = () => {
    setEditingArea(null);
    reset({ nombre: '', descripcion: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (a: Area) => {
    setEditingArea(a);
    reset({
      nombre: a.nombre,
      descripcion: a.descripcion || '',
    });
    setIsModalOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (data: AreaFormData) => api.post('/areas', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Área de trabajo creada con éxito');
      setIsModalOpen(false);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Error al crear área');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AreaFormData> & { activa?: boolean } }) =>
      api.put(`/areas/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Área actualizada');
      setIsModalOpen(false);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar área');
    },
  });

  const onSubmit = async (values: AreaFormData) => {
    if (editingArea) {
      await updateMutation.mutateAsync({ id: editingArea.id, data: values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const toggleEstado = async (a: Area) => {
    try {
      await updateMutation.mutateAsync({
        id: a.id,
        data: { activa: !a.activa },
      });
      toast.success(`Área ${!a.activa ? 'activada' : 'desactivada'}`);
    } catch {
      // ya notificado en onError
    }
  };

  const filteredAreas = useMemo(() => {
    return areas.filter((a) => {
      const matchSearch =
        a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.descripcion && a.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));

      if (filterActiva === 'activas') return matchSearch && a.activa;
      if (filterActiva === 'inactivas') return matchSearch && !a.activa;
      return matchSearch;
    });
  }, [areas, searchTerm, filterActiva]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-purple-600" />
            Administración de Áreas
          </h1>
          <p className="text-sm text-slate-500">
            Sectores operativos del hotel con inventario independiente (Cocina, Housekeeping, Mantenimiento, etc.)
          </p>
        </div>

        <Button onClick={openCreateModal} className="gap-2 shadow-sm bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4" />
          Nueva Área
        </Button>
      </div>

      {/* Banner de Escalabilidad */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-900 text-xs">
        <Sparkles className="h-5 w-5 text-purple-600 shrink-0" />
        <p>
          <strong>Escalabilidad del Negocio:</strong> Cualquier área nueva creada aquí queda
          automáticamente disponible para asignar encargados, registrar proveedores, productos,
          facturas de ingreso y control de stock sin necesidad de modificar el código del sistema.
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre de área o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Estado:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setFilterActiva('activas')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  filterActiva === 'activas'
                    ? 'bg-white text-purple-700 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Activas
              </button>
              <button
                type="button"
                onClick={() => setFilterActiva('inactivas')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  filterActiva === 'inactivas'
                    ? 'bg-white text-slate-800 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Inactivas
              </button>
              <button
                type="button"
                onClick={() => setFilterActiva('todas')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  filterActiva === 'todas'
                    ? 'bg-white text-slate-800 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Áreas */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="p-6">
              <Alert variant="error" title="Error">
                {error instanceof Error ? error.message : 'Error al cargar áreas'}
              </Alert>
            </div>
          ) : filteredAreas.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No se encontraron áreas</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchTerm ? 'Probá modificando la búsqueda' : 'No hay áreas creadas en el sistema'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Área de Trabajo</th>
                    <th className="px-6 py-3.5">Descripción Operativa</th>
                    <th className="px-6 py-3.5">Fecha de Alta</th>
                    <th className="px-6 py-3.5 text-center">Estado</th>
                    <th className="px-6 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAreas.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {a.nombre.charAt(0).toUpperCase()}
                        </div>
                        <span>{a.nombre}</span>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-600 max-w-sm">
                        {a.descripcion || <span className="text-slate-400 italic">Sin descripción</span>}
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(a.created_at)}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <Badge variant={a.activa ? 'success' : 'default'}>
                          {a.activa ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(a)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                            title="Editar área"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleEstado(a)}
                            className={`rounded-lg p-1.5 transition-colors ${
                              a.activa
                                ? 'text-slate-400 hover:bg-red-50 hover:text-red-600'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={a.activa ? 'Desactivar área' : 'Reactivar área'}
                          >
                            {a.activa ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Alta / Edición de Área */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingArea ? 'Editar Área' : 'Nueva Área de Trabajo'}
        description="Definí un sector del hotel para el control de inventario"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nombre del Área"
            placeholder="Ej: Cocina, Housekeeping, Mantenimiento, Lavandería"
            error={errors.nombre?.message}
            {...register('nombre')}
          />

          <Input
            label="Descripción Operativa (opcional)"
            placeholder="Ej: Control de comestibles, vajilla, insumos de limpieza para habitaciones..."
            error={errors.descripcion?.message}
            {...register('descripcion')}
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
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {editingArea ? 'Guardar Cambios' : 'Crear Área'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
