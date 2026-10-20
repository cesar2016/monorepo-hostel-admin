import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { recoverPasswordSchema, RecoverPasswordInput } from '@hotel/shared';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { supabase } from '../../lib/supabase';
import { Hotel, ArrowLeft, MailCheck } from 'lucide-react';
import { toast } from 'sonner';

export const RecoverPasswordPage: React.FC = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<RecoverPasswordInput>({
    resolver: zodResolver(recoverPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: RecoverPasswordInput) => {
    setServerError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/restablecer-contrasena`,
      });

      if (error) {
        throw new Error(error.message);
      }

      setIsSubmitted(true);
      toast.success('Instrucciones enviadas');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar la solicitud';
      setServerError(msg);
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
            Recuperar Contraseña
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Ingresá tu correo para recibir las instrucciones de restablecimiento
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-2xl border border-slate-100">
          {isSubmitted ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <MailCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Revisá tu casilla de correo</h3>
              <p className="text-sm text-slate-600">
                Hemos enviado un correo a <strong className="text-slate-800">{getValues('email')}</strong> con un enlace para crear tu nueva contraseña.
              </p>
              <div className="pt-4">
                <Link to="/login">
                  <Button variant="outline" className="w-full gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Volver al inicio de sesión
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              {serverError && (
                <Alert variant="error" title="Atención">
                  {serverError}
                </Alert>
              )}

              <Input
                label="Correo electrónico registrado"
                type="email"
                placeholder="tu-correo@hotel.com"
                error={errors.email?.message}
                {...register('email')}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isSubmitting}
              >
                Enviar enlace de recuperación
              </Button>

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Volver al inicio de sesión
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
