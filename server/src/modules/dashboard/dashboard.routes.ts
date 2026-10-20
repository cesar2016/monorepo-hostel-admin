import { Router } from 'express';
import { getDashboardSummary } from './dashboard.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';

const router = Router();

router.use(authenticate);
router.get('/summary', getDashboardSummary);
router.get('/resumen', getDashboardSummary);

export default router;
