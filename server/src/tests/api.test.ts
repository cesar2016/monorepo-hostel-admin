import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { ROLES, getTodayArgentina } from '@hotel/shared';

describe('API Backend - Tests de Integración End-to-End', () => {
  let superAdminToken: string;
  let superAdminProfile: any;
  let cocinaAreaId: string;
  let encargadoToken: string;
  let productoId: string;
  let proveedorId: string;

  it('1. Health check debe responder 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('2. Login con credenciales incorrectas debe responder 401', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@hotel.com',
      password: 'ClaveEquivocada!',
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('3. Login de Super Admin debe ser exitoso y devolver token JWT', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@hotel.com',
      password: 'AdminPassword123!',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.session.access_token).toBeDefined();
    expect(res.body.data.user.rol).toBe(ROLES.SUPER_ADMIN);

    superAdminToken = res.body.data.session.access_token;
    superAdminProfile = res.body.data.user;
  });

  it('4. GET /api/v1/auth/me debe retornar el perfil autenticado', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('admin@hotel.com');
    expect(res.body.data.rol).toBe(ROLES.SUPER_ADMIN);
  });

  it('5. Super Admin puede listar áreas y unidades de medida', async () => {
    const resAreas = await request(app)
      .get('/api/v1/areas')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(resAreas.status).toBe(200);
    expect(Array.isArray(resAreas.body.data)).toBe(true);
    expect(resAreas.body.data.length).toBeGreaterThanOrEqual(4);

    const cocina = resAreas.body.data.find((a: any) => a.nombre === 'Cocina');
    expect(cocina).toBeDefined();
    cocinaAreaId = cocina.id;

    const resUnidades = await request(app)
      .get('/api/v1/unidades')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(resUnidades.status).toBe(200);
    expect(resUnidades.body.data.some((u: any) => u.codigo === 'kg')).toBe(true);

    // Crear un área nueva para los tests de flujo operativo
    const resNuevaArea = await request(app)
      .post('/api/v1/areas')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        nombre: `Área Operativa ${Date.now()}`,
        descripcion: 'Área generada para prueba integral',
      });
    expect(resNuevaArea.status).toBe(201);
    cocinaAreaId = resNuevaArea.body.data.id;
  });

  it('6. Super Admin crea un usuario Encargado para el área de pruebas', async () => {
    const emailEncargado = `encargado.${Date.now()}@hotel.com`;
    const res = await request(app)
      .post('/api/v1/usuarios')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        email: emailEncargado,
        password: 'Password123!',
        nombre: 'Chef Ejecutivo',
        rol: ROLES.ENCARGADO,
        area_id: cocinaAreaId,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe(emailEncargado);
    expect(res.body.data.rol).toBe(ROLES.ENCARGADO);
    expect(res.body.data.area_id).toBe(cocinaAreaId);

    // Login del encargado
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: emailEncargado,
      password: 'Password123!',
    });
    expect(loginRes.status).toBe(200);
    encargadoToken = loginRes.body.data.session.access_token;
  });

  it('7. Encargado crea un proveedor y un producto en su área', async () => {
    // Proveedor
    const resProv = await request(app)
      .post('/api/v1/proveedores')
      .set('Authorization', `Bearer ${encargadoToken}`)
      .send({
        nombre: `Distribuidora Gastronómica ${Date.now()}`,
        cuit: '30712345678',
        contacto: 'Juan Pérez',
      });
    expect(resProv.status).toBe(201);
    proveedorId = resProv.body.data.id;

    // Obtener unidad 'kg'
    const resUnidades = await request(app)
      .get('/api/v1/unidades')
      .set('Authorization', `Bearer ${encargadoToken}`);
    const unidadKg = resUnidades.body.data.find((u: any) => u.codigo === 'kg');

    // Producto
    const resProd = await request(app)
      .post('/api/v1/productos')
      .set('Authorization', `Bearer ${encargadoToken}`)
      .send({
        nombre: `Aceite de Oliva Extra Virgen ${Date.now()}`,
        sku: `OLIV-${Date.now().toString().slice(-4)}`,
        unidad_id: unidadKg.id,
        stock_minimo: 5,
      });
    expect(resProd.status).toBe(201);
    productoId = resProd.body.data.id;
  });

  it('8. Encargado registra un ingreso de mercadería respaldado por factura', async () => {
    const nroFactura = `FAC-${Date.now().toString().slice(-6)}`;
    const res = await request(app)
      .post('/api/v1/ingresos')
      .set('Authorization', `Bearer ${encargadoToken}`)
      .send({
        proveedor_id: proveedorId,
        nro_factura: nroFactura,
        fecha: getTodayArgentina(),
        observaciones: 'Compra mensual de insumos',
        items: [
          {
            producto_id: productoId,
            cantidad: 20,
            costo_unitario: 8500.5,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();

    // Comprobar que el stock ahora sea 20
    const resStock = await request(app)
      .get('/api/v1/stock')
      .set('Authorization', `Bearer ${encargadoToken}`);
    expect(resStock.status).toBe(200);
    const prodStock = resStock.body.data.find((s: any) => s.producto_id === productoId);
    expect(Number(prodStock.stock_actual)).toBe(20);
    expect(prodStock.bajo_minimo).toBe(false);
  });

  it('9. Rechaza egreso mayor al stock disponible', async () => {
    const res = await request(app)
      .post('/api/v1/egresos')
      .set('Authorization', `Bearer ${encargadoToken}`)
      .send({
        producto_id: productoId,
        cantidad: 25, // Disponible solo 20
        fecha: getTodayArgentina(),
        motivo: 'Evento cena de gala',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('STOCK_INSUFICIENTE');
  });

  it('10. Permite egreso válido y actualiza alerta de bajo stock', async () => {
    // Retiramos 16 litros -> quedan 4 (por debajo del mínimo que es 5)
    const res = await request(app)
      .post('/api/v1/egresos')
      .set('Authorization', `Bearer ${encargadoToken}`)
      .send({
        producto_id: productoId,
        cantidad: 16,
        fecha: getTodayArgentina(),
        motivo: 'Consumo de restaurante',
      });
    expect(res.status).toBe(201);

    // Verificar alerta visual bajo_minimo = true
    const resStock = await request(app)
      .get('/api/v1/stock?soloBajoMinimo=true')
      .set('Authorization', `Bearer ${encargadoToken}`);
    expect(resStock.status).toBe(200);
    const prodStock = resStock.body.data.find((s: any) => s.producto_id === productoId);
    expect(prodStock).toBeDefined();
    expect(Number(prodStock.stock_actual)).toBe(4);
    expect(prodStock.bajo_minimo).toBe(true);
  });

  it('11. Historial de movimientos refleja los ingresos y egresos', async () => {
    const res = await request(app)
      .get('/api/v1/movimientos')
      .set('Authorization', `Bearer ${encargadoToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.pagination.totalItems).toBeGreaterThanOrEqual(2);
  });

  it('12. Exportación a Excel genera archivo binario válido', async () => {
    const res = await request(app)
      .get('/api/v1/movimientos/export?formato=xlsx')
      .set('Authorization', `Bearer ${encargadoToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/vnd.openxmlformats');
  });

  it('13. Encargado NO puede acceder a endpoints de administración de usuarios', async () => {
    const res = await request(app)
      .get('/api/v1/usuarios')
      .set('Authorization', `Bearer ${encargadoToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
