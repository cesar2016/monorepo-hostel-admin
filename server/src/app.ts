import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middlewares/errorHandler.js';

import authRouter from './modules/auth/auth.routes.js';
import areasRouter from './modules/areas/areas.routes.js';
import unidadesRouter from './modules/unidades/unidades.routes.js';
import proveedoresRouter from './modules/proveedores/proveedores.routes.js';
import productosRouter from './modules/productos/productos.routes.js';
import ingresosRouter from './modules/ingresos/ingresos.routes.js';
import egresosRouter from './modules/egresos/egresos.routes.js';
import stockRouter from './modules/stock/stock.routes.js';
import movimientosRouter from './modules/movimientos/movimientos.routes.js';
import dashboardRouter from './modules/dashboard/dashboard.routes.js';
import usuariosRouter from './modules/usuarios/usuarios.routes.js';

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: [env.CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));

if (env.NODE_ENV !== 'test') {
  app.use(pinoHttp({ logger }));
}

// Rate limiter general
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'test' ? 10000 : 500,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Demasiadas solicitudes desde esta IP, intente nuevamente más tarde.',
    },
  },
});
app.use('/api/', limiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rutas de API v1
const apiV1 = express.Router();

apiV1.use('/auth', authRouter);
apiV1.use('/areas', areasRouter);
apiV1.use('/unidades', unidadesRouter);
apiV1.use('/proveedores', proveedoresRouter);
apiV1.use('/productos', productosRouter);
apiV1.use('/ingresos', ingresosRouter);
apiV1.use('/egresos', egresosRouter);
apiV1.use('/stock', stockRouter);
apiV1.use('/movimientos', movimientosRouter);
apiV1.use('/dashboard', dashboardRouter);
apiV1.use('/usuarios', usuariosRouter);

app.use('/api/v1', apiV1);

// Error handler
app.use(errorHandler);
