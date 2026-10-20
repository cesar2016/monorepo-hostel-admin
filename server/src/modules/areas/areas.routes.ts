import { Router } from 'express';
import { listAreas, getAreaById, createArea, updateArea } from './areas.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { requireRole } from '../../middlewares/authorize.js';
import { validateBody } from '../../middlewares/validate.js';
import { ROLES, createAreaSchema, updateAreaSchema } from '@hotel/shared';

const router = Router();

router.use(authenticate);

router.get('/', listAreas);
router.get('/:id', getAreaById);
router.post('/', requireRole(ROLES.SUPER_ADMIN), validateBody(createAreaSchema), createArea);
router.put('/:id', requireRole(ROLES.SUPER_ADMIN), validateBody(updateAreaSchema), updateArea);

export default router;
