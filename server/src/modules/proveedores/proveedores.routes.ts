import { Router } from 'express';
import { listProveedores, getProveedorById, createProveedor, updateProveedor } from './proveedores.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { validateBody } from '../../middlewares/validate.js';
import { createProveedorSchema, updateProveedorSchema } from '@hotel/shared';

const router = Router();

router.use(authenticate);

router.get('/', listProveedores);
router.get('/:id', getProveedorById);
router.post('/', validateBody(createProveedorSchema), createProveedor);
router.put('/:id', validateBody(updateProveedorSchema), updateProveedor);

export default router;
