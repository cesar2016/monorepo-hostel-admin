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
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Spinner } from '../../../components/ui/Spinner';
import { Alert } from '../../../components/ui/Alert';
import {
  Truck,
  Plus,
  Search,
  Edit2,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

interface Proveedor {
  id: string;
  area_id: string;
  nombre: string;
  cuit: string | null;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

const formSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    .max(150, { message: 'El nombre no puede superar los 150 caracteres' }),
  cuit: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || val.replace(/\D/g, '').length === 11, {
      message: 'El CUIT debe tener 11 dígitos numéricos (ej. 20-12345678-9)',
    }),
  contacto: z.string().trim().max(150).optional().or(z.literal('')),
  telefono: z.string().trim().max(40).optional().or(z.literal('')),
  email: z
    .string()
    .trim()
    .email({ message: 'El email no es válido' })
    .optional()
    .or(z.literal('')),
});

type FormInput = z.infer<typeof formSchema>;

export const ProveedoresPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { isEncargado, effectiveAreaId } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterActivo, setFilterActivo] = useState<'todos' | 'activos' | 'inactivos'>('activos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);

  // Fetch de proveedores
  const {
    data: proveedores = [],
    isLoading,
    error,
  } = useQuery<Proveedor[]>({
    queryKey: ['proveedores', effectiveAreaId],
    queryFn: () =>
      api.get<Proveedor[]>('/proveedores', {
        areaId: effectiveAreaId || undefined,
      }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: '',
      cuit: '',
      contacto: '',
      telefono: '',
      email: '',
    },
  });

  const openCreateModal = () => {
    setEditingProveedor(null);
    reset({
      nombre: '',
      cuit: '',
      contacto: '',
      telefono: '',
      email: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p: Proveedor) => {
    setEditingProveedor(p);
    reset({
      nombre: p.nombre,
      cuit: p.cuit || '',
      contacto: p.contacto || '',
      telefono: p.telefono || '',
      email: p.email || '',
    });
    setIsModalOpen(true);
  };

  // Mutación crear proveedor
  const createMutation = useMutation({
    mutationFn: (data: FormInput) =>
      api.post('/proveedores', {
        ...data,
        cuit: data.cuit ? data.cuit.replace(/\D/g, '') : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      toast.success('Proveedor registrado correctamente');
      setIsModalOpen(false);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Error al crear proveedor');
    },
  });

  // Mutación actualizar proveedor
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FormInput> & { activo?: boolean } }) =>
      api.put(`/proveedores/${id}`, {
        ...data,
        cuit: data.cuit !== undefined ? (data.cuit ? data.cuit.replace(/\D/g, '') : null) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      toast.success('Proveedor actualizado');
      setIsModalOpen(false);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar proveedor');
    },
  });

  const onSubmit = async (values: FormInput) => {
    if (editingProveedor) {
      await updateMutation.mutateAsync({ id: editingProveedor.id, data: values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const toggleEstado = async (p: Proveedor) => {
    try {
      await updateMutation.mutateAsync({
        id: p.id,
        data: { activo: !p.activo },
      });
      toast.success(`Proveedor ${!p.activo ? 'activado' : 'desactivado'}`);
    } catch {
      // ya manejado en onError
    }
  };

  // Filtrado de proveedores
  const filteredProveedores = useMemo(() => {
    return proveedores.filter((p) => {
      const matchSearch =
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.cuit && p.cuit.includes(searchTerm)) ||
        (p.contacto && p.contacto.toLowerCase().includes(searchTerm.toLowerCase()));

      if (filterActivo === 'activos') return matchSearch && p.activo;
      if (filterActivo === 'inactivos') return matchSearch && !p.activo;
      return matchSearch;
    });
  }, [proveedores, searchTerm, filterActivo]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Truck className="h-6 w-6 text-emerald-600" />
            Proveedores
          </h1>
          <p className="text-sm text-slate-500">
            {isEncargado
              ? 'Proveedores comerciales habilitados para tu área'
              : 'Directorio de proveedores registrados en las áreas del hotel'}
          </p>
        </div>

        {isEncargado && (
          <Button onClick={openCreateModal} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Nuevo Proveedor
          </Button>
        )}
      </div>

      {/* Filtros y Búsqueda */}
      <Card>
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, CUIT o persona de contacto..."
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

      {/* Tabla o Contenido */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="p-6">
              <Alert variant="error" title="Error">
                {error instanceof Error ? error.message : 'Error al cargar proveedores'}
              </Alert>
            </div>
          ) : filteredProveedores.length === 0 ? (
            <div className="p-12 text-center">
              <Truck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No se encontraron proveedores</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchTerm
                  ? 'Probá modificando los términos de búsqueda'
                  : 'Aún no hay proveedores registrados en esta área'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Proveedor</th>
                    <th className="px-6 py-3.5">CUIT</th>
                    <th className="px-6 py-3.5">Contacto / Teléfono</th>
                    <th className="px-6 py-3.5">Email</th>
                    <th className="px-6 py-3.5 text-center">Estado</th>
                    {isEncargado && <th className="px-6 py-3.5 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProveedores.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{p.nombre}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        {p.cuit ? (
                          `${p.cuit.slice(0, 2)}-${p.cuit.slice(2, 10)}-${p.cuit.slice(10)}`
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          {p.contacto && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-700">
                              <User className="h-3.5 w-3.5 text-slate-400" />
                              <span>{p.contacto}</span>
                            </div>
                          )}
                          {p.telefono && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Phone className="h-3.5 w-3.5 text-slate-400" />
                              <span>{p.telefono}</span>
                            </div>
                          )}
                          {!p.contacto && !p.telefono && <span className="text-slate-400">-</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {p.email ? (
                          <a
                            href={`mailto:${p.email}`}
                            className="inline-flex items-center gap-1.5 text-emerald-600 hover:underline"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            {p.email}
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
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
                              title="Editar proveedor"
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
                              title={p.activo ? 'Desactivar proveedor' : 'Reactivar proveedor'}
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

      {/* Modal Alta / Edición */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        description="Ingresá los datos comerciales del proveedor de insumos"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Razón Social / Nombre Fantasía"
            placeholder="Ej: Distribuidora Los Andes S.A."
            error={errors.nombre?.message}
            {...register('nombre')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="CUIT (11 dígitos)"
              placeholder="Ej: 30-71234567-8"
              error={errors.cuit?.message}
              {...register('cuit')}
            />
            <Input
              label="Persona de Contacto"
              placeholder="Ej: María Pérez"
              error={errors.contacto?.message}
              {...register('contacto')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Teléfono / WhatsApp"
              placeholder="Ej: +54 9 11 4567-8901"
              error={errors.telefono?.message}
              {...register('telefono')}
            />
            <Input
              label="Email de Contacto"
              type="email"
              placeholder="ventas@proveedor.com"
              error={errors.email?.message}
              {...register('email')}
            />
          </div>

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
              {editingProveedor ? 'Guardar Cambios' : 'Registrar Proveedor'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
