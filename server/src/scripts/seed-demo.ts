import { adminClient } from '../lib/supabase.js';
import { ROLES, RolUsuario } from '@hotel/shared';

async function findOrCreateUser(
  email: string,
  pass: string,
  nombre: string,
  rol: RolUsuario,
  areaId: string | null = null
) {
  const { data: listData } = await adminClient.auth.admin.listUsers();
  const existing = listData?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  let userId: string;

  if (existing) {
    userId = existing.id;
    await adminClient.auth.admin.updateUserById(userId, {
      password: pass,
      user_metadata: { nombre },
      app_metadata: { rol, area_id: areaId },
    });
  } else {
    const { data: newUser, error } = await adminClient.auth.admin.createUser({
      email,
      password: pass,
      email_confirm: true,
      user_metadata: { nombre },
      app_metadata: { rol, area_id: areaId },
    });
    if (error || !newUser.user) {
      throw new Error(`Error creando usuario ${email}: ${error?.message}`);
    }
    userId = newUser.user.id;
  }

  await adminClient.from('profiles').upsert({
    id: userId,
    nombre,
    email,
    rol,
    area_id: areaId,
    activo: true,
  });

  return userId;
}

async function seedDemoData() {
  console.log('\n🏨 Iniciando carga de datos demostrativos del Hotel...\n');

  // 1. Super Admin
  const adminId = await findOrCreateUser(
    'admin@hotel.com',
    'AdminPassword123!',
    'Super Administrador',
    ROLES.SUPER_ADMIN,
    null
  );
  console.log('✅ Super Admin verificado: admin@hotel.com');

  // 2. Admin Lectura
  await findOrCreateUser(
    'auditor@hotel.com',
    'AuditorPassword123!',
    'Auditor General (Lectura)',
    ROLES.ADMIN,
    null
  );
  console.log('✅ Admin Auditor verificado: auditor@hotel.com');

  // 3. Áreas
  const areasData = [
    { nombre: 'Cocina & Restaurante', descripcion: 'Comestibles, bebidas, lácteos y descartables de gastronomía' },
    { nombre: 'Housekeeping', descripcion: 'Ropa blanca, amenities, toallas y productos de limpieza de habitaciones' },
    { nombre: 'Mantenimiento & Edilicio', descripcion: 'Herramientas, pintura, luminarias y ferretería técnica' },
    { nombre: 'Administración & Front Desk', descripcion: 'Papelería, librería, insumos de oficina y tecnología' },
  ];

  const areasMap = new Map<string, string>();

  for (const a of areasData) {
    let { data: existing } = await adminClient.from('areas').select('id, nombre').eq('nombre', a.nombre).maybeSingle();
    if (!existing) {
      const { data: created, error } = await adminClient.from('areas').insert({
        nombre: a.nombre,
        descripcion: a.descripcion,
        activa: true,
      }).select('id, nombre').single();
      if (error) throw error;
      existing = created;
    }
    areasMap.set(a.nombre, existing!.id);
  }
  console.log('✅ 4 Áreas de trabajo configuradas.');

  const cocinaId = areasMap.get('Cocina & Restaurante')!;
  const houseId = areasMap.get('Housekeeping')!;
  const manteId = areasMap.get('Mantenimiento & Edilicio')!;

  // 4. Encargados por Área
  const chefId = await findOrCreateUser(
    'chef@hotel.com',
    'ChefPassword123!',
    'Martín Chef (Cocina)',
    ROLES.ENCARGADO,
    cocinaId
  );
  console.log('✅ Encargado Cocina: chef@hotel.com');

  const houseUserId = await findOrCreateUser(
    'housekeeping@hotel.com',
    'HousePassword123!',
    'Valeria Ama de Llaves',
    ROLES.ENCARGADO,
    houseId
  );
  console.log('✅ Encargada Housekeeping: housekeeping@hotel.com');

  const manteUserId = await findOrCreateUser(
    'mantenimiento@hotel.com',
    'MantePassword123!',
    'Carlos Mantenimiento',
    ROLES.ENCARGADO,
    manteId
  );
  console.log('✅ Encargado Mantenimiento: mantenimiento@hotel.com');

  // 5. Unidades de Medida
  const { data: unidades } = await adminClient.from('unidades_medida').select('id, codigo');
  const uKg = unidades?.find((u) => u.codigo === 'kg')?.id || 2;
  const uL = unidades?.find((u) => u.codigo === 'l')?.id || 3;
  const uU = unidades?.find((u) => u.codigo === 'u')?.id || 1;

  // 6. Proveedores
  async function findOrCreateProveedor(pData: {
    area_id: string;
    nombre: string;
    cuit: string;
    contacto: string;
    telefono: string;
    email: string;
    activo: boolean;
  }) {
    let { data: existing } = await adminClient
      .from('proveedores')
      .select('*')
      .eq('area_id', pData.area_id)
      .eq('nombre', pData.nombre)
      .maybeSingle();

    if (!existing) {
      const { data: created, error } = await adminClient
        .from('proveedores')
        .insert(pData)
        .select()
        .single();
      if (error) {
        throw new Error(`Error creando proveedor ${pData.nombre}: ${error.message}`);
      }
      existing = created;
    }
    return existing;
  }

  const provCocina = await findOrCreateProveedor({
    area_id: cocinaId,
    nombre: 'Distribuidora Mayorista Alvear S.A.',
    cuit: '30714589234',
    contacto: 'Jorge Alvear',
    telefono: '+54 11 4789-5412',
    email: 'ventas@distribuidoraalvear.com',
    activo: true,
  });

  const provHouse = await findOrCreateProveedor({
    area_id: houseId,
    nombre: 'Limpieza Integral Hotelera SRL',
    cuit: '30758963219',
    contacto: 'Claudia Morales',
    telefono: '+54 11 5896-3214',
    email: 'contacto@limpiezahotelera.com.ar',
    activo: true,
  });

  const provMante = await findOrCreateProveedor({
    area_id: manteId,
    nombre: 'Ferretería Industrial Centro',
    cuit: '30589632147',
    contacto: 'Esteban Ferreyra',
    telefono: '+54 11 3214-8965',
    email: 'pedidos@ferreteriacentro.com',
    activo: true,
  });

  console.log('✅ Proveedores registrados para cada área.');

  // 7. Productos
  const productosData = [
    // Cocina
    { area_id: cocinaId, nombre: 'Harina 0000 1kg', sku: 'COC-HAR-01', unidad_id: uKg, stock_minimo: 20 },
    { area_id: cocinaId, nombre: 'Aceite de Girasol 5L', sku: 'COC-ACE-05', unidad_id: uL, stock_minimo: 10 },
    { area_id: cocinaId, nombre: 'Café en Grano Tostado 1kg', sku: 'COC-CAF-01', unidad_id: uKg, stock_minimo: 15 },
    { area_id: cocinaId, nombre: 'Azúcar Común 1kg', sku: 'COC-AZU-01', unidad_id: uKg, stock_minimo: 25 },
    // Housekeeping
    { area_id: houseId, nombre: 'Jabón Líquido Antibacterial 5L', sku: 'HSK-JAB-05', unidad_id: uL, stock_minimo: 8 },
    { area_id: houseId, nombre: 'Toallas Blancas 500gr', sku: 'HSK-TOA-01', unidad_id: uU, stock_minimo: 30 },
    { area_id: houseId, nombre: 'Papel Higiénico Institucional 400m', sku: 'HSK-PAP-01', unidad_id: uU, stock_minimo: 40 },
    // Mantenimiento
    { area_id: manteId, nombre: 'Foco LED 12W Luz Cálida', sku: 'MNT-LED-12', unidad_id: uU, stock_minimo: 15 },
    { area_id: manteId, nombre: 'Pintura Látex Blanco 20L', sku: 'MNT-PIN-20', unidad_id: uL, stock_minimo: 4 },
    { area_id: manteId, nombre: 'Cinta Aisladora 20m', sku: 'MNT-CIN-20', unidad_id: uU, stock_minimo: 10 },
  ];

  const productosMap = new Map<string, string>();

  for (const p of productosData) {
    let { data: prod } = await adminClient
      .from('productos')
      .select('id, nombre')
      .eq('area_id', p.area_id)
      .eq('nombre', p.nombre)
      .maybeSingle();

    if (!prod) {
      const { data: created, error } = await adminClient.from('productos').insert({
        area_id: p.area_id,
        nombre: p.nombre,
        sku: p.sku,
        unidad_id: p.unidad_id,
        stock_minimo: p.stock_minimo,
        activo: true,
      }).select('id, nombre').single();
      if (error) throw error;
      prod = created;
    }
    productosMap.set(p.nombre, prod!.id);
  }
  console.log('✅ 10 Productos con SKUs y stock mínimo catalogados.');

  // 8. Ingresos Respaldados por Factura
  const todayStr = new Date().toISOString().split('T')[0];

  // Ingreso Cocina
  const { data: ingCocinaExist } = await adminClient
    .from('ingresos')
    .select('id')
    .eq('nro_factura', 'A-0001-00012548')
    .maybeSingle();

  if (!ingCocinaExist && provCocina) {
    const { data: ingId } = await adminClient.rpc('registrar_ingreso', {
      p_proveedor_id: provCocina.id,
      p_nro_factura: 'A-0001-00012548',
      p_fecha: todayStr,
      p_observaciones: 'Recepción de mercadería seca y café para restaurante',
      p_items: [
        { producto_id: productosMap.get('Harina 0000 1kg')!, cantidad: 50, costo_unitario: 1250 },
        { producto_id: productosMap.get('Aceite de Girasol 5L')!, cantidad: 20, costo_unitario: 4500 },
        { producto_id: productosMap.get('Café en Grano Tostado 1kg')!, cantidad: 30, costo_unitario: 11800 },
      ],
    });
    console.log(`✅ Ingreso Cocina Fact. A-0001-00012548 registrado.`);
  }

  // Ingreso Mantenimiento
  const { data: ingManteExist } = await adminClient
    .from('ingresos')
    .select('id')
    .eq('nro_factura', 'A-0002-00008541')
    .maybeSingle();

  if (!ingManteExist && provMante) {
    await adminClient.rpc('registrar_ingreso', {
      p_proveedor_id: provMante.id,
      p_nro_factura: 'A-0002-00008541',
      p_fecha: todayStr,
      p_observaciones: 'Compra de reposición eléctrica y pintura',
      p_items: [
        { producto_id: productosMap.get('Foco LED 12W Luz Cálida')!, cantidad: 40, costo_unitario: 2100 },
        { producto_id: productosMap.get('Pintura Látex Blanco 20L')!, cantidad: 6, costo_unitario: 48000 },
      ],
    });
    console.log(`✅ Ingreso Mantenimiento Fact. A-0002-00008541 registrado.`);
  }

  // 9. Egresos y Alerta de Stock Bajo Demostrativa
  // Egreso Cocina
  await adminClient.from('egresos').insert({
    area_id: cocinaId,
    producto_id: productosMap.get('Harina 0000 1kg')!,
    cantidad: 15,
    fecha: todayStr,
    motivo: 'Preparación desayuno buffet y repostería semanal',
    created_by: chefId,
  });

  // Egreso Mantenimiento que deja los focos por debajo del mínimo (Entraron 40, egresan 28 => quedan 12, mínimo es 15!)
  await adminClient.from('egresos').insert({
    area_id: manteId,
    producto_id: productosMap.get('Foco LED 12W Luz Cálida')!,
    cantidad: 28,
    fecha: todayStr,
    motivo: 'Recambio preventivo luminarias pasillo pisos 2 y 3',
    created_by: manteUserId,
  });
  console.log('✅ Egresos registrados (incluye alerta de bajo stock en Focos LED).');

  console.log('\n🎉 ¡Carga demostrativa completada con éxito!');
  console.log('----------------------------------------------------');
  console.log('CREDENCIALES DE ACCESO DISPONIBLES:');
  console.log('1. Super Admin:      admin@hotel.com        / AdminPassword123!');
  console.log('2. Auditor (Admin):  auditor@hotel.com      / AuditorPassword123!');
  console.log('3. Encargado Cocina: chef@hotel.com         / ChefPassword123!');
  console.log('4. Housekeeping:     housekeeping@hotel.com / HousePassword123!');
  console.log('5. Mantenimiento:    mantenimiento@hotel.com/ MantePassword123!');
  console.log('----------------------------------------------------\n');
}

seedDemoData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error en seed-demo:', err);
    process.exit(1);
  });
