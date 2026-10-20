import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { resetPasswordSchema, ResetPasswordInput } from '@hotel/shared';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { supabase } from '../../lib/supabase';
import { Hotel, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '' },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        throw new Error(error.message);
      }

      setIsSuccess(true);
      toast.success('¡Contraseña actualizada correctamente!');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar contraseña';
      setErrorMsg(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-950/50">
            <Hotel className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Nueva Contraseña
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Ingresá tu nueva clave de acceso (mínimo 8 caracteres)
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-2xl border border-slate-100">
          {isSuccess ? (
            <div className="text-center space-y-4 py-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">¡Contraseña restablecida!</h3>
              <p className="text-sm text-slate-600">
                Tu clave ha sido actualizada. Te redirigiremos al inicio de sesión en unos segundos...
              </p>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              {errorMsg && (
                <Alert variant="error" title="Error">
                  {errorMsg}
                </Alert>
              )}

              <Input
                label="Nueva contraseña"
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
                {...register('password')}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isSubmitting}
              >
                Guardar nueva contraseña
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
