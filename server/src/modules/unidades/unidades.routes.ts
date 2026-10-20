import { Router } from 'express';
import { listUnidades } from './unidades.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';

const router = Router();

router.use(authenticate);
router.get('/', listUnidades);

export default router;
