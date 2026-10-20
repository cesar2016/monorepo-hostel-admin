import { Router } from 'express';
import { listUsuarios, createUsuario, updateUsuario, listAuditLogs } from './usuarios.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { requireRole } from '../../middlewares/authorize.js';
import { validateBody } from '../../middlewares/validate.js';
import { ROLES, createUsuarioSchema, updateUsuarioSchema } from '@hotel/shared';

const router = Router();

router.use(authenticate);

// Auditoría accesible para Admin y Super Admin
router.get('/auditoria', requireRole(ROLES.ADMIN, ROLES.SUPER_ADMIN), listAuditLogs);

// Gestión de usuarios: EXCLUSIVA de Super Admin
router.get('/', requireRole(ROLES.SUPER_ADMIN), listUsuarios);
router.post('/', requireRole(ROLES.SUPER_ADMIN), validateBody(createUsuarioSchema), createUsuario);
router.put('/:id', requireRole(ROLES.SUPER_ADMIN), validateBody(updateUsuarioSchema), updateUsuario);

export default router;
