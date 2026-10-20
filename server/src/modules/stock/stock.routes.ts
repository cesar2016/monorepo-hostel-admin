import { Router } from 'express';
import { listStock } from './stock.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';

const router = Router();

router.use(authenticate);
router.get('/', listStock);

export default router;
