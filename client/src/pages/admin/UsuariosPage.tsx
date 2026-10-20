import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../lib/api';
import { useAuth } from '../../features/auth/AuthContext';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { formatDate } from '../../lib/formatters';
import { ROLES, RolUsuario } from '@hotel/shared';
import {
  Users,
  Plus,
  Search,
  Edit2,
  CheckCircle,
  XCircle,
  Building,
} from 'lucide-react';
import { toast } from 'sonner';

interface UserListItem {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  area_id: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
  areas?: { nombre: string } | null;
}

interface AreaOption {
  id: string;
  nombre: string;
  activa: boolean;
}

const createUsuarioFormSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(2, { message: 'El nombre debe tener al menos 2 caracteres' })
      .max(120, { message: 'Máximo 120 caracteres' }),
    email: z.string().trim().email({ message: 'El correo electrónico no es válido' }),
    password: z.string().min(8, { message: 'La contraseña debe tener al menos 8 caracteres' }),
    rol: z.enum([ROLES.ENCARGADO, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
    area_id: z.string().optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      if (data.rol === ROLES.ENCARGADO) {
        return !!data.area_id && data.area_id.length > 0;
      }
      return true;
    },
    {
      message: 'Debe seleccionar un área para el encargado',
      path: ['area_id'],
    }
  );

type CreateUsuarioFormData = z.infer<typeof createUsuarioFormSchema>;

const editUsuarioFormSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(2, { message: 'El nombre debe tener al menos 2 caracteres' })
      .max(120, { message: 'Máximo 120 caracteres' }),
    rol: z.enum([ROLES.ENCARGADO, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
    area_id: z.string().optional().or(z.literal('')),
    activo: z.boolean(),
    password: z
      .string()
      .min(8, { message: 'Mínimo 8 caracteres si desea cambiar la clave' })
      .optional()
      .or(z.literal('')),
  })
  .refine(
    (data) => {
      if (data.rol === ROLES.ENCARGADO) {
        return !!data.area_id && data.area_id.length > 0;
      }
      return true;
    },
    {
      message: 'Debe seleccionar un área para el encargado',
      path: ['area_id'],
    }
  );

type EditUsuarioFormData = z.infer<typeof editUsuarioFormSchema>;

export const UsuariosPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { profile: currentUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRol, setFilterRol] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);

  // Cargar áreas
  const { data: areas = [] } = useQuery<AreaOption[]>({
    queryKey: ['areas'],
    queryFn: () => api.get<AreaOption[]>('/areas'),
  });

  // Cargar usuarios
  const {
    data: usuarios = [],
    isLoading,
    error,
  } = useQuery<UserListItem[]>({
    queryKey: ['usuarios'],
    queryFn: () => api.get<UserListItem[]>('/usuarios'),
  });

  // Formulario de Creación
  const createForm = useForm<CreateUsuarioFormData>({
    resolver: zodResolver(createUsuarioFormSchema),
    defaultValues: {
      nombre: '',
      email: '',
      password: '',
      rol: ROLES.ENCARGADO,
      area_id: '',
    },
  });

  // Formulario de Edición
  const editForm = useForm<EditUsuarioFormData>({
    resolver: zodResolver(editUsuarioFormSchema),
    defaultValues: {
      nombre: '',
      rol: ROLES.ENCARGADO,
      area_id: '',
      activo: true,
      password: '',
    },
  });

  const selectedCreateRol = createForm.watch('rol');
  const selectedEditRol = editForm.watch('rol');

  const openCreateModal = () => {
    createForm.reset({
      nombre: '',
      email: '',
      password: '',
      rol: ROLES.ENCARGADO,
      area_id: areas[0]?.id || '',
    });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (user: UserListItem) => {
    setEditingUser(user);
    editForm.reset({
      nombre: user.nombre,
      rol: user.rol,
      area_id: user.area_id || '',
      activo: user.activo,
      password: '',
    });
  };

  // Mutación Crear
  const createMutation = useMutation({
    mutationFn: (data: CreateUsuarioFormData) =>
      api.post('/usuarios', {
        ...data,
        area_id: data.rol === ROLES.ENCARGADO ? data.area_id : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuario registrado con éxito');
      setIsCreateModalOpen(false);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Error al registrar usuario');
    },
  });

  // Mutación Editar
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditUsuarioFormData }) =>
      api.put(`/usuarios/${id}`, {
        ...data,
        area_id: data.rol === ROLES.ENCARGADO ? data.area_id : null,
        password: data.password ? data.password : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuario actualizado correctamente');
      setEditingUser(null);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar usuario');
    },
  });

  const onCreateSubmit = async (data: CreateUsuarioFormData) => {
    await createMutation.mutateAsync(data);
  };

  const onEditSubmit = async (data: EditUsuarioFormData) => {
    if (!editingUser) return;
    await updateMutation.mutateAsync({ id: editingUser.id, data });
  };

  const toggleEstado = async (u: UserListItem) => {
    if (u.id === currentUser?.id) {
      toast.error('No podés desactivar tu propia cuenta de Super Admin');
      return;
    }

    try {
      await api.put(`/usuarios/${u.id}`, { activo: !u.activo });
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success(`Cuenta de ${u.nombre} ${!u.activo ? 'activada' : 'desactivada'}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar estado');
    }
  };

  const filteredUsuarios = useMemo(() => {
    return usuarios.filter((u) => {
      const matchSearch =
        u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRol = filterRol ? u.rol === filterRol : true;
      return matchSearch && matchRol;
    });
  }, [usuarios, searchTerm, filterRol]);

  const rolBadges = {
    super_admin: { label: 'Super Admin', variant: 'purple' as const },
    admin: { label: 'Admin (Lectura)', variant: 'info' as const },
    encargado: { label: 'Encargado de Área', variant: 'success' as const },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-purple-600" />
            Gestión de Usuarios
          </h1>
          <p className="text-sm text-slate-500">
            Administración de cuentas, asignación de roles (Encargado, Admin, Super Admin) y áreas operativas
          </p>
        </div>

        <Button onClick={openCreateModal} className="gap-2 shadow-sm bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo electrónico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Filtrar Rol:
            </span>
            <select
              value={filterRol}
              onChange={(e) => setFilterRol(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="">Todos los roles</option>
              <option value={ROLES.ENCARGADO}>Encargados de Área</option>
              <option value={ROLES.ADMIN}>Administradores (Lectura)</option>
              <option value={ROLES.SUPER_ADMIN}>Super Administradores</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Usuarios */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="p-6">
              <Alert variant="error" title="Error">
                {error instanceof Error ? error.message : 'Error al cargar usuarios'}
              </Alert>
            </div>
          ) : filteredUsuarios.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No se encontraron usuarios</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchTerm || filterRol ? 'Probá modificando los filtros' : 'No hay usuarios registrados'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Usuario</th>
                    <th className="px-6 py-3.5">Rol de Acceso</th>
                    <th className="px-6 py-3.5">Área Asignada</th>
                    <th className="px-6 py-3.5">Fecha Alta</th>
                    <th className="px-6 py-3.5 text-center">Estado</th>
                    <th className="px-6 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsuarios.map((u) => {
                    const badge = rolBadges[u.rol] || { label: u.rol, variant: 'default' as const };
                    const isSelf = u.id === currentUser?.id;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900 flex items-center gap-2">
                            <span>{u.nombre}</span>
                            {isSelf && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                                Tú
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </td>

                        <td className="px-6 py-4">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>

                        <td className="px-6 py-4 text-xs font-medium text-slate-800">
                          {u.rol === ROLES.ENCARGADO ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <Building className="h-3 w-3" />
                              {u.areas?.nombre || 'Área no asignada'}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Acceso Global</span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                          {formatDate(u.created_at)}
                        </td>

                        <td className="px-6 py-4 text-center">
                          <Badge variant={u.activo ? 'success' : 'default'}>
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(u)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                              title="Editar usuario y permisos"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => toggleEstado(u)}
                                className={`rounded-lg p-1.5 transition-colors ${
                                  u.activo
                                    ? 'text-slate-400 hover:bg-red-50 hover:text-red-600'
                                    : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={u.activo ? 'Desactivar cuenta' : 'Reactivar cuenta'}
                              >
                                {u.activo ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                              </button>
                            )}
                          </div>
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

      {/* Modal Nuevo Usuario */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Crear Nuevo Usuario"
        description="Creación de credenciales en Supabase Auth y asignación de rol/área"
      >
        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
          <Input
            label="Nombre y Apellido"
            placeholder="Ej: Laura Gómez"
            error={createForm.formState.errors.nombre?.message}
            {...createForm.register('nombre')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Correo Electrónico"
              type="email"
              placeholder="laura@hotel.com"
              error={createForm.formState.errors.email?.message}
              {...createForm.register('email')}
            />

            <Input
              label="Contraseña Inicial"
              type="password"
              placeholder="Mínimo 8 caracteres"
              error={createForm.formState.errors.password?.message}
              {...createForm.register('password')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Rol en el Sistema"
              error={createForm.formState.errors.rol?.message}
              {...createForm.register('rol')}
            >
              <option value={ROLES.ENCARGADO}>Encargado de Área (Gestión propia)</option>
              <option value={ROLES.ADMIN}>Admin (Solo lectura global)</option>
              <option value={ROLES.SUPER_ADMIN}>Super Admin (Control total)</option>
            </Select>

            <Select
              label="Área Asignada"
              disabled={selectedCreateRol !== ROLES.ENCARGADO}
              error={createForm.formState.errors.area_id?.message}
              helperText={
                selectedCreateRol !== ROLES.ENCARGADO
                  ? 'Los roles Admin y Super Admin tienen visión global'
                  : 'Requerido para el encargado'
              }
              {...createForm.register('area_id')}
            >
              <option value="">Seleccione un área...</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={createForm.formState.isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createForm.formState.isSubmitting}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Crear Usuario
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Usuario */}
      {editingUser && (
        <Modal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          title={`Editar Usuario: ${editingUser.nombre}`}
          description="Actualización de datos de perfil, área o cambio de contraseña"
        >
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
            <Input
              label="Nombre y Apellido"
              error={editForm.formState.errors.nombre?.message}
              {...editForm.register('nombre')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Rol en el Sistema"
                error={editForm.formState.errors.rol?.message}
                {...editForm.register('rol')}
              >
                <option value={ROLES.ENCARGADO}>Encargado de Área</option>
                <option value={ROLES.ADMIN}>Admin (Solo lectura global)</option>
                <option value={ROLES.SUPER_ADMIN}>Super Admin (Control total)</option>
              </Select>

              <Select
                label="Área Asignada"
                disabled={selectedEditRol !== ROLES.ENCARGADO}
                error={editForm.formState.errors.area_id?.message}
                helperText={
                  selectedEditRol !== ROLES.ENCARGADO
                    ? 'Roles con acceso a todas las áreas'
                    : 'Requerido para el encargado'
                }
                {...editForm.register('area_id')}
              >
                <option value="">Seleccione un área...</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </Select>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <Input
                label="Nueva Contraseña (opcional)"
                type="password"
                placeholder="Dejar en blanco para conservar la actual"
                helperText="Si ingresás un valor, se actualizará inmediatamente su clave en Supabase Auth"
                error={editForm.formState.errors.password?.message}
                {...editForm.register('password')}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingUser(null)}
                disabled={editForm.formState.isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={editForm.formState.isSubmitting}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Guardar Cambios
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
