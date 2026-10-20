import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 mb-6">
        <FileQuestion className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Página no encontrada</h1>
      <p className="mt-2 text-sm text-slate-500 max-w-md">
        La ruta a la que estás intentando acceder no existe o fue movida.
      </p>
      <div className="mt-6">
        <Link to="/dashboard">
          <Button variant="primary" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Button>
        </Link>
      </div>
    </div>
  );
};
