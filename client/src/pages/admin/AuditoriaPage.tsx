import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { formatDateTime } from '../../lib/formatters';
import {
  ShieldCheck,
  Eye,
  Database,
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  tabla: string;
  operacion: 'INSERT' | 'UPDATE' | 'DELETE';
  registro_id: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  user_id: string | null;
  user_email: string | null;
  user_rol: string | null;
  created_at: string;
}

interface AuditResponse {
  data: AuditLogEntry[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export const AuditoriaPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const {
    data: response,
    isLoading,
    error,
  } = useQuery<AuditResponse>({
    queryKey: ['audit-log', page, pageSize],
    queryFn: () =>
      api.get<AuditResponse>('/usuarios/auditoria', {
        page,
        pageSize,
      }),
  });

  const logs = response?.data || [];
  const pagination = response?.pagination;

  const operacionBadges = {
    INSERT: { label: 'ALTA (INSERT)', variant: 'success' as const },
    UPDATE: { label: 'MODIFICACIÓN (UPDATE)', variant: 'warning' as const },
    DELETE: { label: 'BAJA (DELETE)', variant: 'danger' as const },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-purple-600" />
            Registro de Auditoría (Audit Log)
          </h1>
          <p className="text-sm text-slate-500">
            Trazabilidad inmutable generada automáticamente por triggers de PostgreSQL en todas las tablas
          </p>
        </div>
      </div>

      {/* Tabla de Auditoría */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="p-6">
              <Alert variant="error" title="Error">
                {error instanceof Error ? error.message : 'Error al cargar registros de auditoría'}
              </Alert>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center">
              <ShieldCheck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No hay registros de auditoría</p>
              <p className="text-xs text-slate-400 mt-1">Los cambios futuros aparecerán aquí</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Fecha y Hora</th>
                    <th className="px-6 py-3.5">Tabla / Entidad</th>
                    <th className="px-6 py-3.5">Operación</th>
                    <th className="px-6 py-3.5">Usuario Responsable</th>
                    <th className="px-6 py-3.5 text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => {
                    const op = operacionBadges[log.operacion] || {
                      label: log.operacion,
                      variant: 'default' as const,
                    };

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 text-xs font-mono text-slate-700 whitespace-nowrap">
                          {formatDateTime(log.created_at)}
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md">
                            <Database className="h-3.5 w-3.5 text-slate-500" />
                            {log.tabla}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <Badge variant={op.variant}>{op.label}</Badge>
                        </td>

                        <td className="px-6 py-4 text-xs">
                          <p className="font-medium text-slate-800">
                            {log.user_email || 'Sistema (Automático)'}
                          </p>
                          {log.user_rol && (
                            <p className="text-[10px] text-slate-400 capitalize">
                              Rol: {log.user_rol}
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedEntry(log)}
                            className="gap-1.5 text-xs"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Inspeccionar
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Paginación */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-600">
                  <div>
                    Página <strong className="text-slate-900">{pagination.page}</strong> de{' '}
                    <strong className="text-slate-900">{pagination.totalPages}</strong> (
                    {pagination.totalItems} eventos registrados)
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                      disabled={pagination.page <= 1}
                      className="text-xs px-2.5 py-1"
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
                      disabled={pagination.page >= pagination.totalPages}
                      className="text-xs px-2.5 py-1"
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Inspección de Registro de Auditoría */}
      {selectedEntry && (
        <Modal
          isOpen={!!selectedEntry}
          onClose={() => setSelectedEntry(null)}
          title={`Evento en ${selectedEntry.tabla} [${selectedEntry.operacion}]`}
          description={`ID de registro: ${selectedEntry.registro_id}`}
          maxWidth="3xl"
        >
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center">
              <div>
                <p className="text-slate-500 font-medium">Ejecutado por</p>
                <p className="font-semibold text-slate-800">
                  {selectedEntry.user_email || 'Sistema'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Fecha y Hora</p>
                <p className="font-semibold text-slate-800">
                  {formatDateTime(selectedEntry.created_at)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Datos Anteriores */}
              <div>
                <h5 className="font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <span>Estado Previo (OLD)</span>
                </h5>
                <pre className="bg-slate-900 text-slate-200 p-3 rounded-xl overflow-x-auto text-[11px] font-mono h-64 border border-slate-800">
                  {selectedEntry.old_data
                    ? JSON.stringify(selectedEntry.old_data, null, 2)
                    : '// No aplica (registro nuevo)'}
                </pre>
              </div>

              {/* Datos Nuevos */}
              <div>
                <h5 className="font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <span>Estado Resultante (NEW)</span>
                </h5>
                <pre className="bg-slate-900 text-emerald-400 p-3 rounded-xl overflow-x-auto text-[11px] font-mono h-64 border border-slate-800">
                  {selectedEntry.new_data
                    ? JSON.stringify(selectedEntry.new_data, null, 2)
                    : '// Eliminado físicamente'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <Button variant="outline" size="sm" onClick={() => setSelectedEntry(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
