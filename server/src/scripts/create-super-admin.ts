import { adminClient } from '../lib/supabase.js';
import { ROLES } from '@hotel/shared';

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@hotel.com';
  const password = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
  const nombre = process.env.ADMIN_NOMBRE || 'Super Administrador';

  console.log(`\n🔍 Verificando existencia de Super Admin (${email})...`);

  // 1. Verificar si ya existe en auth.users
  const { data: listData, error: listError } = await adminClient.auth.admin.listUsers();
  if (listError) {
    console.error('❌ Error al listar usuarios:', listError.message);
    process.exit(1);
  }

  const existingUser = listData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (existingUser) {
    console.log(`ℹ️  El usuario ${email} ya existe en Auth (ID: ${existingUser.id}). Actualizando metadatos...`);

    await adminClient.auth.admin.updateUserById(existingUser.id, {
      password,
      user_metadata: { nombre },
      app_metadata: { rol: ROLES.SUPER_ADMIN },
    });

    await adminClient
      .from('profiles')
      .update({
        nombre,
        rol: ROLES.SUPER_ADMIN,
        area_id: null,
        activo: true,
      })
      .eq('id', existingUser.id);

    console.log(`✅ Super Admin actualizado exitosamente.`);
    console.log(`   Email: ${email}`);
    console.log(`   Contraseña: ${password}\n`);
    return;
  }

  // 2. Crear nuevo Super Admin
  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
    app_metadata: { rol: ROLES.SUPER_ADMIN },
  });

  if (createError || !newUser.user) {
    console.error('❌ Error al crear Super Admin:', createError?.message);
    process.exit(1);
  }

  console.log(`✅ Super Admin inicial creado con éxito:`);
  console.log(`   Email: ${email}`);
  console.log(`   Contraseña: ${password}`);
  console.log(`   Rol: ${ROLES.SUPER_ADMIN}\n`);
}

seedAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error no controlado en seed:', err);
    process.exit(1);
  });
