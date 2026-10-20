import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../features/auth/AuthContext';
import { api } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { formatDate, formatNumber } from '../../lib/formatters';
import {
  Package,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  TrendingDown,
  Clock,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardData {
  rol: string;
  areaId: string | null;
  metricas: {
    totalProductos: number;
    totalBajoMinimo: number;
    productosCriticos: Array<{
      producto_id: string;
      nombre?: string;
      producto_nombre?: string;
      area_nombre: string;
      unidad_codigo: string;
      stock_actual: number;
      stock_minimo: number;
    }>;
  };
  ultimosMovimientos: Array<{
    id: string;
    tipo: 'INGRESO' | 'EGRESO';
    fecha: string;
    area_nombre: string;
    producto_nombre: string;
    cantidad: number;
    unidad_codigo: string;
    nro_factura?: string;
    motivo?: string;
    usuario_nombre: string;
  }>;
  areasSummary?: Array<{
    id: string;
    nombre: string;
    activa: boolean;
    totalProductos: number;
    bajoMinimo: number;
  }> | null;
}

export const DashboardPage: React.FC = () => {
  const { profile, isEncargado, effectiveAreaId, setSelectedAreaId } = useAuth();

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard', 'summary', effectiveAreaId],
    queryFn: () =>
      api.get<DashboardData>('/dashboard/summary', {
        areaId: effectiveAreaId || undefined,
      }),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error" title="Error al cargar el dashboard">
        {error instanceof Error ? error.message : 'No se pudo obtener el resumen del sistema'}
      </Alert>
    );
  }

  const metricas = data?.metricas;
  const criticos = metricas?.productosCriticos || [];
  const movimientos = data?.ultimosMovimientos || [];
  const areas = data?.areasSummary;

  return (
    <div className="space-y-6">
      {/* Encabezado de Bienvenida */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Hola, {profile?.nombre || 'Usuario'} 👋
          </h1>
          <p className="text-sm text-slate-500">
            {isEncargado
              ? 'Panel de control de tu área asignada'
              : 'Vista consolidada del inventario y áreas del hotel'}
          </p>
        </div>

        {/* Acceso rápido a registrar ingreso/egreso para encargados */}
        {isEncargado && (
          <div className="flex items-center gap-2 pt-2 sm:pt-0">
            <Link
              to="/ingresos?nuevo=true"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              <ArrowDownToLine className="h-4 w-4" />
              Nuevo Ingreso
            </Link>
            <Link
              to="/egresos?nuevo=true"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-900 transition-colors"
            >
              <ArrowUpFromLine className="h-4 w-4" />
              Registrar Egreso
            </Link>
          </div>
        )}
      </div>

      {/* Banner de Filtro Activo para Admin / Super Admin */}
      {!isEncargado && effectiveAreaId && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs text-emerald-900 shadow-sm">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-700" />
            <span>
              Filtrando información por área:{' '}
              <strong className="font-bold underline">
                {areas?.find((a) => a.id === effectiveAreaId)?.nombre || 'Área Seleccionada'}
              </strong>
            </span>
          </div>
          <button
            onClick={() => setSelectedAreaId(null)}
            className="flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-950 transition-colors bg-white px-2.5 py-1 rounded-md border border-emerald-200 hover:bg-emerald-100"
          >
            <X className="h-3 w-3" />
            Ver todo el Hotel
          </button>
        </div>
      )}

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Productos */}
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Productos Catalogados
              </p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">
                {metricas?.totalProductos ?? 0}
              </h3>
              <p className="text-xs text-slate-500 mt-1">En el inventario activo</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Package className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Alertas Stock Bajo */}
        <Card className={metricas && metricas.totalBajoMinimo > 0 ? 'border-amber-200 bg-amber-50/20' : ''}>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                Alertas de Stock Bajo
              </p>
              <h3 className="text-3xl font-bold text-amber-600 mt-1">
                {metricas?.totalBajoMinimo ?? 0}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Por debajo del mínimo establecido</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Movimientos Recientes */}
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Actividad Reciente
              </p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">
                {movimientos.length}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Movimientos registrados</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Cobertura y Salud del Inventario */}
      {metricas && metricas.totalProductos > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Nivel de Cobertura de Inventario
              </span>
              <span className="text-emerald-700 font-bold">
                {Math.round(
                  ((metricas.totalProductos - metricas.totalBajoMinimo) / metricas.totalProductos) *
                    100
                )}
                % en nivel óptimo
              </span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{
                  width: `${Math.round(
                    ((metricas.totalProductos - metricas.totalBajoMinimo) / metricas.totalProductos) *
                      100
                  )}%`,
                }}
                className="bg-emerald-500 h-full transition-all duration-500"
                title="Stock normal"
              />
              <div
                style={{
                  width: `${Math.round(
                    (metricas.totalBajoMinimo / metricas.totalProductos) * 100
                  )}%`,
                }}
                className="bg-amber-500 h-full transition-all duration-500"
                title="Stock bajo mínimo"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 pt-1 gap-1">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                {metricas.totalProductos - metricas.totalBajoMinimo} insumos con stock suficiente
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
                {metricas.totalBajoMinimo} insumos por debajo del punto de reorden
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid: Productos Críticos + Últimos Movimientos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Productos Críticos */}
        <Card>
          <CardHeader className="py-3 px-5">
            <CardTitle className="text-base flex items-center gap-2 text-slate-800">
              <TrendingDown className="h-4 w-4 text-amber-600" />
              Insumos con Stock Crítico
            </CardTitle>
            <Link to="/stock?filtro=bajo" className="text-xs text-emerald-600 font-semibold hover:underline">
              Ver todos ({metricas?.totalBajoMinimo || 0})
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {criticos.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                🎉 No hay productos por debajo del stock mínimo.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {criticos.map((prod) => (
                  <li key={prod.producto_id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{prod.producto_nombre || prod.nombre}</p>
                      <p className="text-xs text-slate-500">{prod.area_nombre}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="text-sm font-bold text-rose-600">
                          {formatNumber(prod.stock_actual)}
                        </span>
                        <span className="text-xs text-slate-500">{prod.unidad_codigo}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Mínimo: {formatNumber(prod.stock_minimo)} {prod.unidad_codigo}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Últimos Movimientos */}
        <Card>
          <CardHeader className="py-3 px-5">
            <CardTitle className="text-base flex items-center gap-2 text-slate-800">
              <Clock className="h-4 w-4 text-slate-500" />
              Últimos Movimientos
            </CardTitle>
            <Link to="/movimientos" className="text-xs text-emerald-600 font-semibold hover:underline">
              Ver historial completo
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {movimientos.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                Aún no hay movimientos registrados.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {movimientos.map((mov) => {
                  const isIngreso = mov.tipo === 'INGRESO';
                  return (
                    <li key={mov.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            isIngreso ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isIngreso ? (
                            <ArrowDownToLine className="h-4 w-4" />
                          ) : (
                            <ArrowUpFromLine className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {mov.producto_nombre}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDate(mov.fecha)} &bull; {isIngreso ? `Fact. ${mov.nro_factura || '-'}` : mov.motivo || 'Egreso'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={isIngreso ? 'success' : 'default'}>
                          {isIngreso ? '+' : '-'}{formatNumber(mov.cantidad)} {mov.unidad_codigo}
                        </Badge>
                        <p className="text-[11px] text-slate-400 mt-0.5">{mov.area_nombre}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumen por Área (visible para Admin / Super Admin) */}
      {areas && areas.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-5">
            <CardTitle className="text-base flex items-center gap-2 text-slate-800">
              <Building2 className="h-4 w-4 text-emerald-600" />
              Estado de Áreas del Hotel
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {areas.map((a) => (
                <div
                  key={a.id}
                  onClick={() => setSelectedAreaId(a.id)}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-emerald-300 transition-all cursor-pointer shadow-sm group"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-800 text-sm group-hover:text-emerald-700">
                      {a.nombre}
                    </h4>
                    {a.bajoMinimo > 0 ? (
                      <Badge variant="warning">{a.bajoMinimo} alertas</Badge>
                    ) : (
                      <Badge variant="success">Normal</Badge>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>{a.totalProductos} productos</span>
                    <span className="font-medium text-emerald-600 group-hover:underline">Filtrar &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
