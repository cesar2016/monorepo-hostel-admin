import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { loginSchema, LoginInput } from '@hotel/shared';
import { useAuth } from '../../features/auth/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { Hotel, KeyRound, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [authError, setAuthError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setAuthError(null);
    try {
      await login(data.email, data.password);
      toast.success('¡Sesión iniciada con éxito!');
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setAuthError(msg);
      toast.error(msg);
    }
  };

  const setTestCredentials = (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Encabezado y Logo */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-950/50">
            <Hotel className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Hotel Stock & Inventario
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Ingresá con tu cuenta para gestionar el inventario de tu área
          </p>
        </div>

        {/* Tarjeta de Formulario */}
        <div className="rounded-2xl bg-white p-8 shadow-2xl border border-slate-100">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {authError && (
              <Alert variant="error" title="No se pudo iniciar sesión">
                {authError}
              </Alert>
            )}

            <Input
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              placeholder="tu-correo@hotel.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Contraseña</label>
                <Link
                  to="/recuperar-contrasena"
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isSubmitting}
            >
              Iniciar Sesión
            </Button>
          </form>

          {/* Accesos rápidos de prueba para desarrollo */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              <span>Credenciales de prueba rápidas:</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <button
                type="button"
                onClick={() => setTestCredentials('admin@hotel.com', 'AdminPassword123!')}
                className="w-full text-left px-2.5 py-1.5 rounded bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 font-mono transition-colors flex justify-between items-center"
              >
                <span>admin@hotel.com (Super Admin)</span>
                <span className="text-[10px] text-purple-700 font-sans font-semibold">Cargar</span>
              </button>

              <button
                type="button"
                onClick={() => setTestCredentials('chef@hotel.com', 'ChefPassword123!')}
                className="w-full text-left px-2.5 py-1.5 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-mono transition-colors flex justify-between items-center"
              >
                <span>chef@hotel.com (Encargado Cocina)</span>
                <span className="text-[10px] text-emerald-700 font-sans font-semibold">Cargar</span>
              </button>

              <button
                type="button"
                onClick={() => setTestCredentials('auditor@hotel.com', 'AuditorPassword123!')}
                className="w-full text-left px-2.5 py-1.5 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 font-mono transition-colors flex justify-between items-center"
              >
                <span>auditor@hotel.com (Admin Lectura)</span>
                <span className="text-[10px] text-blue-700 font-sans font-semibold">Cargar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Aviso de seguridad */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldAlert className="h-4 w-4" />
          <span>Acceso restringido a personal autorizado del hotel</span>
        </div>
      </div>
    </div>
  );
};
