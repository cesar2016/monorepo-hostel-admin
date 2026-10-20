import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-6 shadow-sm">
        <ShieldX className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Acceso no autorizado</h1>
      <p className="mt-2 text-sm text-slate-500 max-w-md">
        No tenés los permisos necesarios para acceder a esta sección o área. Si considerás que esto es un error, por favor contactá al Super Administrador.
      </p>
      <div className="mt-6">
        <Link to="/dashboard">
          <Button variant="primary" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};
