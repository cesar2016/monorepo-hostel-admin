import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className,
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  };

  return <Loader2 className={cn('animate-spin text-emerald-600', sizes[size], className)} />;
};

export const FullPageSpinner: React.FC<{ label?: string }> = ({ label = 'Cargando...' }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <Spinner size="lg" />
      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
};
