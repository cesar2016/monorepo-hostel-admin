import { Router } from 'express';
import { listIngresos, getIngresoById, createIngreso, updateIngreso } from './ingresos.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { validateBody } from '../../middlewares/validate.js';
import { createIngresoSchema, updateIngresoSchema } from '@hotel/shared';

const router = Router();

router.use(authenticate);

router.get('/', listIngresos);
router.get('/:id', getIngresoById);
router.post('/', validateBody(createIngresoSchema), createIngreso);
router.put('/:id', validateBody(updateIngresoSchema), updateIngreso);

export default router;
