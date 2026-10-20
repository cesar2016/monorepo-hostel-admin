import { Router } from 'express';
import { listEgresos, getEgresoById, createEgreso, updateEgreso } from './egresos.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { validateBody } from '../../middlewares/validate.js';
import { createEgresoSchema, updateEgresoSchema } from '@hotel/shared';

const router = Router();

router.use(authenticate);

router.get('/', listEgresos);
router.get('/:id', getEgresoById);
router.post('/', validateBody(createEgresoSchema), createEgreso);
router.put('/:id', validateBody(updateEgresoSchema), updateEgreso);

export default router;
