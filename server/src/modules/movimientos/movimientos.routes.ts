import { Router } from 'express';
import { listMovimientos, exportMovimientos } from './movimientos.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';

const router = Router();

router.use(authenticate);

router.get('/', listMovimientos);
router.get('/export', exportMovimientos);

export default router;
